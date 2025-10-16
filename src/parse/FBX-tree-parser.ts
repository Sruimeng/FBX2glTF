import type {
  BufferGeometry,
  EulerOrder,
  LoadingManager,
  MeshPhongMaterial,
  MeshStandardMaterialParameters,
  TextureLoader,
} from 'three';
import {
  AmbientLight,
  Bone,
  ClampToEdgeWrapping,
  Color,
  ColorManagement,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  Group,
  Line,
  LineBasicMaterial,
  Loader,
  MathUtils,
  Matrix4,
  Mesh,
  MeshMatcapMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  PropertyBinding,
  RepeatWrapping,
  Skeleton,
  SkinnedMesh,
  SpotLight,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import type {
  FBXConnectionNode,
  FBXConnectionReference,
  FBXMaterialNode,
  FBXMeshNode,
  FBXModelNode,
  FBXMorphTarget,
  FBXPoseNode,
  FBXRawTargets,
  FBXSkeleton,
  FBXTextureNode,
  RawBone,
} from '../constants';
import type { ParseContext, ModelLoaderResult, UserDataTransform } from '../../types';
import type { BaseInfo } from '../../types';
import type { FBXLightNodeAttribute } from '../../types/nodes/light';
import { generateTransform, getEulerOrder } from './utils';
import { AnimationParser } from './FBX-animation-parser';
import { GeometryParser } from './FBX-geometry-parser';

interface FBXMeshStandardMaterialParameters extends MeshStandardMaterialParameters {
  reflectivity?: number,
  specularMap?: Texture,
}

export interface FBXSceneParserOptions {
  deformers: {
    morphTargets: Record<string, FBXMorphTarget>,
    skeletons: Record<string, FBXSkeleton>,
  },
  geoInfoMap?: Map<number, BaseInfo>,
  geometryMap?: Map<number, BufferGeometry>,
  materialMap?: Map<number, MeshPhongMaterial | MeshStandardMaterial | LineBasicMaterial>,
  wireframeGeometryMap?: Map<number, any>,
}

// Parse the FBXTree object returned by the BinaryParser or TextParser and return a Group
export class FBXTreeParser {
  private context: ParseContext;
  textureLoader: TextureLoader;
  manager: LoadingManager;
  defaultMaterialIndex = -1;

  constructor (context: ParseContext, textureLoader: TextureLoader, manager: LoadingManager) {
    this.context = context;
    this.textureLoader = textureLoader;
    this.manager = manager;
  }

  async parse (): Promise<ModelLoaderResult> {
    // Initialize connections first
    this.context.connections = this.parseConnections();

    const images = this.parseImages();

    const textures = await this.parseTextures(images);
    const materialMap = this.parseMaterials(textures);
    const deformers = this.parseDeformers();
    const { geoInfoMap, geometryMap } = new GeometryParser(this.context).parse(deformers);

    return this.parseScene({
      deformers,
      geoInfoMap,
      geometryMap,
      materialMap,
    });

  }

  // Parses context.fbxTree.Connections which holds parent-child connections between objects (e.g. material -> texture, model->geometry )
  // and details the connection type
  parseConnections () {
    const fbxTree = this.context.fbxTree;

    if ('connections' in fbxTree) {
      if (!fbxTree.connections) {
        throw new Error('FBXLoader');
      }

      // fbxTree.connections 已经是正确的格式：Record<number, FBXConnectionNode>
      // 直接返回Record格式
      const connectionsObj = fbxTree.connections as Record<number, any>;

      return connectionsObj;
    } else {
      return {};
    }
  }

  // Parse this.context.fbxTree.Objects.Video for embedded image data
  // These images are connected to textures in this.context.fbxTree.Objects.Textures
  // via this.context.fbxTree.Connections.
  parseImages () {
    const images: Record<number, string> = {};
    const blobs: Record<string, string | undefined> = {};

    if (!this.context.fbxTree.Objects) {
      throw new Error('FBXTree.Objects is undefined');
    }

    if ('Video' in this.context.fbxTree.Objects) {
      const videoNodes = this.context.fbxTree.Objects.Video;

      for (const nodeID in videoNodes) {
        const videoNode = videoNodes[nodeID];

        const id = parseInt(nodeID);

        images[id] = videoNode.RelativeFilename || videoNode.Filename;

        // raw image data is in videoNode.Content
        if ('Content' in videoNode) {
          const arrayBufferContent
            = videoNode.Content instanceof ArrayBuffer && videoNode.Content.byteLength > 0;
          const base64Content = typeof videoNode.Content === 'string' && videoNode.Content !== '';

          if (arrayBufferContent || base64Content) {
            const image = this.parseImage(videoNodes[nodeID] as any);

            blobs[videoNode.RelativeFilename || videoNode.Filename] = image;
          }
        }
      }
    }

    for (const id in images) {
      const filename = images[id];

      if (blobs[filename] !== undefined) {
        images[id] = blobs[filename];
      } else {
        const currentImage = images[id];
        images[id] = currentImage?.split('\\').pop() || currentImage || '';
      }
    }

    return images;
  }

  // Parse embedded image data in this.context.fbxTree.Video.Content
  parseImage (videoNode: any) {
    const content = videoNode.Content;
    const fileName = videoNode.RelativeFilename || videoNode.Filename;
    const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();

    let type;

    switch (extension) {
      case 'bmp':
        type = 'image/bmp';

        break;
      case 'jpg':
      case 'jpeg':
        type = 'image/jpeg';

        break;
      case 'png':
        type = 'image/png';

        break;
      case 'webp':
        type = 'image/webp';

        break;
      case 'tif':
        type = 'image/tiff';

        break;
      case 'tga':
        if (this.manager.getHandler('.tga') === null) {
          // TGA loader not found
        }

        type = 'image/tga';

        break;
      default:
        // Unsupported image type

        return;
    }

    if (typeof content === 'string') {
      // ASCII format

      return 'data:' + type + ';base64,' + content;
    } else {
      // Binary Format

      const array = new Uint8Array(content);

      return window.URL.createObjectURL(new Blob([array], { type: type }));
    }
  }

  // Parse nodes in this.context.fbxTree.Objects.Texture
  // These contain details such as UV scaling, cropping, rotation etc and are connected
  // to images in this.context.fbxTree.Objects.Video
  async parseTextures (images: Record<string, string>) {
    const textureMap = new Map();

    if (!this.context.fbxTree.Objects) {
      throw new Error('FBXTree Objects is undefined');
    }

    if ('Texture' in this.context.fbxTree.Objects) {
      const textureNodes = this.context.fbxTree.Objects.Texture;

      for (const nodeID in textureNodes) {
        const texture = await this.parseTexture(textureNodes[nodeID], images);

        if (!texture) {continue;}
        textureMap.set(parseInt(nodeID), texture);
      }
    }

    return textureMap;
  }

  // Parse individual node in this.context.fbxTree.Objects.Texture
  async parseTexture (textureNode: FBXTextureNode, images: Record<string, string>) {
    const texture = await this.loadTexture(textureNode, images);

    if (!texture) {
      return;
    }

    (texture as unknown as { ID: number }).ID = textureNode.id;

    texture.name = textureNode.attrName;

    const wrapModeU = textureNode.WrapModeU;
    const wrapModeV = textureNode.WrapModeV;

    const valueU = wrapModeU !== undefined ? wrapModeU.value : 0;
    const valueV = wrapModeV !== undefined ? wrapModeV.value : 0;

    // http://download.autodesk.com/us/fbx/SDKdocs/FBX_SDK_Help/files/fbxsdkref/class_k_fbx_texture.html#889640e63e2e681259ea81061b85143a
    // 0: repeat(default), 1: clamp

    texture.wrapS = valueU === 0 ? RepeatWrapping : ClampToEdgeWrapping;
    texture.wrapT = valueV === 0 ? RepeatWrapping : ClampToEdgeWrapping;

    if ('Scaling' in textureNode && textureNode.Scaling?.value) {
      const values = textureNode.Scaling.value as number[];

      texture.repeat.x = values[0];
      texture.repeat.y = values[1];
    }

    if ('Translation' in textureNode && textureNode.Translation?.value) {
      const values = textureNode.Translation.value as number[];

      texture.offset.x = values[0];
      texture.offset.y = values[1];
    }

    return texture;
  }

  // load a texture specified as a blob or data URI, or via an external URL using TextureLoader
  async loadTexture (
    textureNode: FBXTextureNode,
    images: Record<string, string>,
  ): Promise<Texture | undefined> {
    const extension = (textureNode.FileName.split('.').pop() || '').toLowerCase();

    let loader = this.manager.getHandler(`.${extension}`);

    if (loader === null) {
      loader = this.textureLoader;
    }

    const loaderPath = loader.path;

    if (!loaderPath) {
      loader.setPath(this.textureLoader.path);
    }
    const connections = this.context.connections;

    if (!connections) {
      throw new Error('Global connections are undefined');
    }
    const children = connections[textureNode.id]?.children;

    if (!children || children.length === 0) {
      // No children connections found, creating placeholder texture

      return new Texture();
    }

    const child = children[0];
    let fileName;

    if (child !== undefined && images[child.ID] !== undefined) {
      fileName = images[child.ID];

      if (fileName.indexOf('blob:') === 0 || fileName.indexOf('data:') === 0) {
        loader.setPath('');
      }
    }

    if (fileName === undefined) {
      // Undefined filename, creating placeholder texture

      return new Texture();
    }

    let texture;

    try {
      texture = await (loader as TextureLoader).loadAsync(fileName);
    } catch (_error) {
      // Error loading texture
    }

    // revert to initial path
    loader.setPath(loaderPath);

    return texture;
  }

  // Parse nodes in this.context.fbxTree.Objects.Material
  parseMaterials (textureMap: Map<number, Texture>) {
    const materialMap = new Map();
    const fbxTree = this.context.fbxTree;

    if (!fbxTree || !fbxTree.Objects) {
      throw new Error('Global FBXTree or fbxTree.Objects is undefined');
    }

    if ('Material' in fbxTree.Objects) {
      const materialNodes = fbxTree.Objects.Material as Record<string, FBXMaterialNode>;

      for (const nodeID in materialNodes) {
        const material = this.parseMaterial(materialNodes[nodeID], textureMap);

        if (material instanceof MeshStandardMaterial) {
          material.flatShading = true;
          material.roughness = 1;
        }
        if (material !== null) {
          materialMap.set(parseInt(nodeID), material);
        }
      }
    } else {
      const material = new MeshMatcapMaterial();

      materialMap.set(this.defaultMaterialIndex, material);
    }

    return materialMap;
  }

  // Parse single node in this.context.fbxTree.Objects.Material
  // Materials are connected to texture maps in this.context.fbxTree.Objects.Textures
  // FBX format currently only supports Lambert and Phong shading models
  parseMaterial (materialNode: FBXMaterialNode, textureMap: Map<number, Texture>) {
    const ID = materialNode.id;
    const name = materialNode.attrName;
    let type: string | number = materialNode.ShadingModel;

    // Case where FBX wraps shading model in property object.
    if (typeof type === 'object' && type !== null && 'value' in type) {
      type = (type as any).value;
    }

    // Ignore unused materials which don't have any connections.
    if (!this.context.connections[ID]) {
      return null;
    }

    const parameters = this.parseParameters(materialNode, textureMap, ID);

    let material;

    switch (String(type).toLowerCase()) {
      case 'phong':
        material = new MeshStandardMaterial({ metalness: 0, roughness: 0.5, side: DoubleSide });

        break;
      case 'lambert':
        material = new MeshPhysicalMaterial();

        break;
      default:
        // Unknown material type, defaulting to MeshStandardMaterial
        material = new MeshStandardMaterial({ metalness: 0, roughness: 0.5, side: DoubleSide });

        break;
    }
    if (parameters.map) {
      material.setValues(parameters);
    } else {
      material = new MeshMatcapMaterial();
    }
    material.name = name;

    return material;
  }

  // Parse FBX material and return parameters suitable for a three.js material
  // Also parse the texture map and return any textures associated with the material
  parseParameters (materialNode: FBXMaterialNode, textureMap: Map<number, Texture>, ID: number) {
    const parameters: FBXMeshStandardMaterialParameters = {};
    const connections = this.context.connections;

    if (!connections) {
      throw new Error('Global connections is undefined');
    }

    if (materialNode.BumpFactor) {
      parameters.bumpScale = materialNode.BumpFactor.value;
    }

    // if (materialNode.Diffuse) {
    //   parameters.color = ColorManagement.toWorkingColorSpace(
    //     new Color().fromArray(materialNode.Diffuse.value),
    //     SRGBColorSpace,
    //   );
    // } else if (
    //   materialNode.DiffuseColor &&
    //   (materialNode.DiffuseColor.type === 'Color' || materialNode.DiffuseColor.type === 'ColorRGB')
    // ) {
    //   // The blender exporter exports diffuse here instead of in materialNode.Diffuse
    //   parameters.color = ColorManagement.toWorkingColorSpace(
    //     new Color().fromArray(materialNode.DiffuseColor.value),
    //     SRGBColorSpace,
    //   );
    // }
    // tripo 默认修改成白色
    parameters.color = new Color();

    if (materialNode.DisplacementFactor) {
      parameters.displacementScale = materialNode.DisplacementFactor.value as number;
    }

    if (materialNode.Emissive && materialNode.Emissive.value) {
      parameters.emissive = ColorManagement.toWorkingColorSpace(
        new Color().fromArray(materialNode.Emissive.value),
        SRGBColorSpace,
      );
    } else if (
      materialNode.EmissiveColor
      && (materialNode.EmissiveColor.type === 'Color'
        || materialNode.EmissiveColor.type === 'ColorRGB')
      && materialNode.EmissiveColor.value
    ) {
      // The blender exporter exports emissive color here instead of in materialNode.Emissive
      parameters.emissive = ColorManagement.toWorkingColorSpace(
        new Color().fromArray(materialNode.EmissiveColor.value),
        SRGBColorSpace,
      );
    }

    if (materialNode.EmissiveFactor) {
      parameters.emissiveIntensity = parseFloat(materialNode.EmissiveFactor.value);
    }

    // the transparency handling is implemented based on Blender/Unity's approach: https://github.com/sobotka/blender-addons/blob/7d80f2f97161fc8e353a657b179b9aa1f8e5280b/io_scene_fbx/import_fbx.py#L1444-L1459

    parameters.opacity
      = 1 - (materialNode.TransparencyFactor ? parseFloat(materialNode.TransparencyFactor.value) : 0);

    if (parameters.opacity === 1 || parameters.opacity === 0) {
      parameters.opacity = materialNode.Opacity ? parseFloat(materialNode.Opacity.value) : 1;

      if (parameters.opacity === null) {
        parameters.opacity
          = 1
            - (materialNode.TransparentColor?.value
              ? parseFloat(String(materialNode.TransparentColor.value[0]))
              : 0);
      }
    }

    if (parameters.opacity < 1.0) {
      parameters.transparent = true;
    }

    if (materialNode.ReflectionFactor) {
      parameters.reflectivity = materialNode.ReflectionFactor.value;
    }

    if (materialNode.Shininess) {
      parameters.roughness = 1 / materialNode.Shininess.value;
    }

    if (materialNode.Specular && materialNode.Specular.value) {
      // 将specular颜色转换为metalness值
      // 可以使用颜色的平均值或亮度作为金属度
      const specularColor = new Color().fromArray(materialNode.Specular.value);

      // 使用RGB平均值作为金属度
      parameters.metalness = (specularColor.r + specularColor.g + specularColor.b) / 3;
      // 限制metalness在0-1范围内
      parameters.metalness = Math.max(0, Math.min(1, parameters.metalness));
    } else if (materialNode.SpecularColor && materialNode.SpecularColor.type === 'Color' && materialNode.SpecularColor.value) {
      // The blender exporter exports specular color here instead of in materialNode.Specular
      const specularColor = new Color().fromArray(materialNode.SpecularColor.value);

      // 使用RGB平均值作为金属度
      parameters.metalness = (specularColor.r + specularColor.g + specularColor.b) / 3;
      // 限制metalness在0-1范围内
      parameters.metalness = Math.max(0, Math.min(1, parameters.metalness));
    }

    const materialConnections = connections[ID];

    if (!materialConnections || !materialConnections.children || materialConnections.children.length === 0) {
      // No connections found for material, using default parameters

      return parameters;
    }

    materialConnections.children.forEach(child => {
      if (!(typeof child.ID === 'number')) {
        throw new Error('THREE.FBXLoader: Invalid child ID type');
      }
      const type = child.relationship;

      switch (type) {
        case 'Bump':
          parameters.bumpMap = this.getTexture(textureMap, child.ID);

          break;
        case 'ShininessExponent':
          parameters.roughnessMap = this.getTexture(textureMap, child.ID);

          break;
        case 'ReflectionFactor':
          parameters.metalnessMap = this.getTexture(textureMap, child.ID);

          break;
        case 'Maya|TEX_ao_map':
          parameters.aoMap = this.getTexture(textureMap, child.ID);

          break;
        case 'DiffuseColor':
        case 'Maya|TEX_color_map':
          parameters.map = this.getTexture(textureMap, child.ID);
          if (parameters.map !== undefined) {
            parameters.map.colorSpace = SRGBColorSpace;
          }

          break;
        case 'DisplacementColor':
          parameters.displacementMap = this.getTexture(textureMap, child.ID);

          break;
        case 'EmissiveColor':
          parameters.emissiveMap = this.getTexture(textureMap, child.ID);
          if (parameters.emissiveMap !== undefined) {
            parameters.emissiveMap.colorSpace = SRGBColorSpace;
          }

          break;
        case 'NormalMap':
        case 'Maya|TEX_normal_map':
          parameters.normalMap = this.getTexture(textureMap, child.ID);

          break;
        case 'ReflectionColor':
          parameters.envMap = this.getTexture(textureMap, child.ID);
          if (parameters.envMap !== undefined) {
            parameters.envMap.mapping = EquirectangularReflectionMapping;
            parameters.envMap.colorSpace = SRGBColorSpace;
          }

          break;
        case 'SpecularColor':
          parameters.specularMap = this.getTexture(textureMap, child.ID);
          if (parameters.specularMap !== undefined) {
            parameters.specularMap.colorSpace = SRGBColorSpace;
          }
          if (parameters.specularMap !== undefined) {
            parameters.specularMap.colorSpace = SRGBColorSpace;
          }

          break;
        case 'TransparentColor':
        case 'TransparencyFactor':
          parameters.alphaMap = this.getTexture(textureMap, child.ID);
          parameters.transparent = true;

          break;
        case 'AmbientColor':
        case 'SpecularFactor': // AKA specularLevel
        case 'VectorDisplacementColor': // NOTE: Seems to be a copy of DisplacementColor
        default:
          // Silently skip unsupported texture types
          break;
      }
    });

    if (!parameters.map) {
      parameters.color.setHex(0x8f95ad);
    }

    return parameters;
  }

  // get a texture from the textureMap for use by a material.
  getTexture (textureMap: Map<number, Texture>, id: number) {
    const objects = this.context.fbxTree.Objects;
    const connections = this.context.connections;
    let textureID: number | undefined = id;

    if (!objects || !connections) {
      throw new Error('No objects found in fbxTree.');
    }
    // if the texture is a layered texture, just use the first layer
    if ('LayeredTexture' in objects && objects.LayeredTexture && id in objects.LayeredTexture) {
      const layeredConnections = connections[id];

      if (layeredConnections && layeredConnections.children && layeredConnections.children.length > 0) {
        textureID = layeredConnections.children[0].ID;
      }
    }

    if (!textureID) {
      throw new Error('THREE.FBXLoader: No valid texture ID found.');
    }

    return textureMap.get(textureID);
  }

  // Parse nodes in this.context.fbxTree.Objects.Deformer
  // Deformer node can contain skinning or Vertex Cache animation data, however only skinning is supported here
  // Generates map of Skeleton-like objects for use later when generating and binding skeletons.
  parseDeformers () {
    const skeletons: Record<string, FBXSkeleton> = {};
    const morphTargets: Record<string, FBXMorphTarget> = {};
    const objects = this.context.fbxTree.Objects;

    if (!objects) {
      throw new Error('No objects found in fbxTree.');
    }
    if ('Deformer' in objects) {
      const DeformerNodes = objects.Deformer;

      for (const nodeID in DeformerNodes) {
        const deformerNode = DeformerNodes[nodeID];

        const nodeIdNum = parseInt(nodeID);
        const relationships = this.context.connections[nodeIdNum];

        if (!relationships) {
          throw new Error('No relationships found for nodeID: ' + nodeID);
        }

        if (deformerNode?.attrType === 'Skin') {
          const skeleton = this.parseSkeleton(
            relationships,
            DeformerNodes as Record<number, FBXMeshNode>,
          );

          skeleton.ID = nodeID;

          // Silently handle skeleton attached to multiple geometries
          skeleton.geometryID = (relationships.parents[0]).ID;

          skeletons[nodeID] = skeleton;
        } else if (deformerNode?.attrType === 'BlendShape') {
          const morphTarget: FBXMorphTarget = {
            id: nodeID,
            rawTargets: undefined,
            skeleton: undefined,
          };

          morphTarget.rawTargets = this.parseMorphTargets(
            relationships,
            DeformerNodes as Record<number, FBXMeshNode>,
          );
          morphTarget.id = nodeID;

          // Silently handle morph target attached to multiple geometries

          morphTargets[nodeID] = morphTarget;
        }
      }
    }

    return {
      morphTargets: morphTargets,
      skeletons: skeletons,
    };
  }

  // Parse single nodes in this.context.fbxTree.Objects.Deformer
  // The top level skeleton node has type 'Skin' and sub nodes have type 'Cluster'
  // Each skin node represents a skeleton and each cluster node represents a bone
  parseSkeleton (
    relationships: FBXConnectionNode,
    deformerNodes: Record<number, FBXMeshNode>,
  ): FBXSkeleton {
    const rawBones: RawBone[] = [];

    relationships.children.forEach(function (child) {
      const boneNode = deformerNodes[child.ID];

      if (!boneNode || !boneNode.TransformLink) {
        throw new Error('THREE.FBXLoader: No bone node found for child ID: ' + child.ID);
      }

      if (boneNode.attrType !== 'Cluster') {
        return;
      }

      const rawBone: RawBone = {
        ID: child.ID,
        indices: [],
        transformLink: new Matrix4().fromArray(boneNode.TransformLink.a),
        weights: [],
        // transform: new Matrix4().fromArray( boneNode.Transform.a ),
        // linkMode: boneNode.Mode,
      };

      if (boneNode.Indexes && boneNode.Weights) {
        rawBone.indices = boneNode.Indexes.a;
        rawBone.weights = boneNode.Weights.a;
      }

      rawBones.push(rawBone);
    });

    return {
      bones: [],
      geometryID: 0,
      ID: '',
      rawBones: rawBones,
    };
  }

  // The top level morph deformer node has type "BlendShape" and sub nodes have type "BlendShapeChannel"
  parseMorphTargets (
    relationships: FBXConnectionNode,
    deformerNodes: Record<number, FBXMeshNode>,
  ): FBXRawTargets[] | undefined {
    const rawMorphTargets: FBXRawTargets[] = [];
    const connections = this.context.connections;

    if (!connections) {
      throw new Error('Global connections is undefined');
    }

    for (let i = 0; i < relationships.children.length; i++) {
      const child = relationships.children[i];

      const morphTargetNode = deformerNodes[child.ID];
      const nodeName = morphTargetNode.attrName || 'target' + i;
      const nodeID = morphTargetNode.id || i;
      const rawMorphTarget: FBXRawTargets = {
        fullWeights: morphTargetNode.FullWeights.a,
        geoID: 0,
        id: nodeID,
        initialWeight: morphTargetNode.DeformPercent,
        name: nodeName,
      };

      if (morphTargetNode.attrType !== 'BlendShapeChannel') {
        return;
      }
      let id = child.ID;

      if (typeof child.ID !== 'number') {
        id = parseInt(child.ID);
      }
      rawMorphTarget.geoID
        = connections[id].children.filter((child: FBXConnectionReference) => {
          return child.relationship === undefined;
        })[0]?.ID || 0;

      rawMorphTargets.push(rawMorphTarget);
    }

    return rawMorphTargets;
  }

  // create the main Group() to be returned by the loader
  parseScene (option: FBXSceneParserOptions): ModelLoaderResult {
    const {
      deformers,
      geoInfoMap = new Map(),
      geometryMap = new Map(),
      materialMap = new Map(),
    } = option;

    this.context.sceneGraph = new Group();
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;

    if (!fbxTree || !fbxTree.Objects || !connections) {
      throw new Error('Global FBXTree or fbxTree.Objects or global connections is undefined');
    }

    const { modelInfoMap, modelMap } = this.parseWireFrameModels(
      deformers.skeletons,
      geometryMap,
      materialMap,
      geoInfoMap,
    );

    const modelNodes = fbxTree.Objects.Model;

    if (!modelNodes) {
      throw new Error('Model nodes are undefined');
    }
    modelMap.forEach(model => {
      const modelID = (model as unknown as { ID: number }).ID;
      const modelNode = modelNodes[modelID];

      this.setLookAtProperties(model, modelNode);

      const parentConnections = connections[modelID]?.parents || [];

      parentConnections.forEach(function (connection) {
        const parent = modelMap.get(connection.ID);

        if (parent !== undefined) {
          parent.add(model);
        }
      });

      if (model.parent === null) {
        this.context.sceneGraph.add(model);
      }
    });

    this.bindSkeleton(deformers.skeletons, geometryMap, modelMap);

    this.addGlobalSceneSettings();

    this.context.sceneGraph.traverse(function (node) {
      if (node.userData.transformData) {
        if (node.parent) {
          node.userData.transformData.parentMatrix = node.parent.matrix;
          node.userData.transformData.parentMatrixWorld = node.parent.matrixWorld;
        }

        const transform = generateTransform(node.userData.transformData);

        node.applyMatrix4(transform);
        node.updateWorldMatrix(true, true);
      }
    });

    const animations = new AnimationParser(this.context).parse();

    // if all the models where already combined in a single group, just return that
    if (
      this.context.sceneGraph.children.length === 1
      && (this.context.sceneGraph.children[0] as Group).isGroup
    ) {
      (this.context.sceneGraph.children[0] as Group).animations = animations;
      this.context.sceneGraph = this.context.sceneGraph.children[0] as Group;
    }

    this.context.sceneGraph.animations = animations;

    return {
      animations: animations,
      modelInfo: modelInfoMap,
      scene: this.context.sceneGraph,
    };
  }

  // parse nodes in this.context.fbxTree.Objects.Model
  parseWireFrameModels (
    skeletons: Record<string, FBXSkeleton>,
    geometryMap: Map<number, BufferGeometry>,
    materialMap: Map<number, MeshPhongMaterial | MeshStandardMaterial | LineBasicMaterial>,
    geoInfoMap: Map<number, BaseInfo>,
  ) {
    const modelMap: Map<number, Object3D> = new Map();
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;
    const modelInfoMap: Record<string, BaseInfo> = {};

    if (!fbxTree || !fbxTree.Objects || !connections) {
      throw new Error('Global FBXTree or fbxTree.Objects or global connections is undefined');
    }
    const modelNodes = fbxTree.Objects.Model;

    for (const nodeID in modelNodes) {
      const id = parseInt(nodeID);
      const node = modelNodes[nodeID];
      const relationships = connections[id] || { children: [], parents: [] };
      const nodeAttributeName = node.attrName || '';
      let model: Object3D | null = this.buildSkeleton(
        relationships,
        skeletons,
        id,
        nodeAttributeName,
      );

      if (!model) {
        switch (node.attrType) {
          case 'Camera':
            model = this.createCamera(relationships);

            break;
          case 'Light':
            model = this.createLight(relationships);

            break;
          case 'Mesh':
            {
              const result = this.createMesh(relationships, geometryMap, materialMap, geoInfoMap, id);

              model = result.model;
              modelInfoMap[model.name] = result.modelInfo;
            }

            break;
          case 'NurbsCurve':
            model = this.createCurve(relationships, geometryMap);

            break;
          case 'LimbNode':
          case 'Root':
            model = new Bone();

            break;
          case 'Null':
          default:
            model = new Group();

            break;
        }

        model.name = node.attrName ? PropertyBinding.sanitizeNodeName(node.attrName) : '';
        model.userData.originalName = node.attrName;

        (model as unknown as { ID: number }).ID = id;
      }

      if (model === null) {
        throw new Error('THREE.FBXLoader: Model is null');
      }
      this.getTransformData(model, node);
      modelMap.set(id, model);
    }

    return { modelInfoMap, modelMap };
  }

  buildSkeleton (
    relationships: FBXConnectionNode,
    skeletons: Record<string, FBXSkeleton>,
    id: number,
    name: string,
  ) {
    let bone: Bone | null = null;
    const buildSkeletons = skeletons;

    relationships.parents.forEach(parent => {
      Object.entries(buildSkeletons).forEach(([, skeleton]) => {
        skeleton.rawBones.forEach((rawBone, i) => {
          if (rawBone.ID === parent.ID) {
            const subBone = bone;

            bone = new Bone();

            bone.matrixWorld.copy(rawBone.transformLink);

            // set name and id here - otherwise in cases where "subBone" is created it will not have a name / id

            bone.name = name ? PropertyBinding.sanitizeNodeName(name) : '';
            bone.userData.originalName = name;
            (bone as unknown as { ID: number }).ID = id;

            skeleton.bones[i] = bone;

            // In cases where a bone is shared between multiple meshes
            // duplicate the bone here and add it as a child of the first bone
            if (subBone !== null) {
              bone.add(subBone);
            }
          }
        });
      });
    });

    return bone;
  }

  // create a PerspectiveCamera or OrthographicCamera
  createCamera (relationships: FBXConnectionNode) {
    const fbxTree = this.context.fbxTree;
    let model: Object3D | PerspectiveCamera;
    let cameraAttribute: FBXLightNodeAttribute | undefined;

    if (!fbxTree || !fbxTree.Objects) {
      throw new Error('Global FBXTree or fbxTree.Objects is undefined');
    }

    relationships.children.forEach(function (child) {
      const nodeAttribute = fbxTree.Objects?.NodeAttribute;

      if (!nodeAttribute) {
        throw new Error('NodeAttribute is undefined');
      }

      const attr = nodeAttribute[child.ID];

      if (attr !== undefined) {
        cameraAttribute = attr;
      }
    });

    if (!cameraAttribute) {
      model = new Object3D();
    } else {
      let type = 0;

      if (
        cameraAttribute.CameraProjectionType !== undefined
        && cameraAttribute.CameraProjectionType.value === 1
      ) {
        type = 1;
      }

      let nearClippingPlane = 1;

      if (cameraAttribute.NearPlane !== undefined) {
        const nearPlane = cameraAttribute.NearPlane.value;

        if (typeof nearPlane !== 'number') {
          throw new Error('THREE.FBXLoader: Invalid near plane value');
        }

        nearClippingPlane = nearPlane / 1000;
      }

      let farClippingPlane = 1000;

      if (cameraAttribute.FarPlane !== undefined) {
        const farPlane = cameraAttribute.FarPlane.value;

        if (typeof farPlane !== 'number') {
          throw new Error('THREE.FBXLoader: Invalid far plane value');
        }
        // FBX stores the far plane in millimeters

        farClippingPlane = farPlane / 1000;
      }

      let width = window.innerWidth;
      let height = window.innerHeight;

      if (cameraAttribute.AspectWidth !== undefined && cameraAttribute.AspectHeight !== undefined) {
        const aspectWidth = cameraAttribute.AspectWidth.value;
        const aspectHeight = cameraAttribute.AspectHeight.value;

        if (typeof aspectWidth !== 'number' || typeof aspectHeight !== 'number') {
          throw new Error('THREE.FBXLoader: Invalid aspect width or height value');
        }
        width = aspectWidth;
        height = aspectHeight;
      }

      const aspect = width / height;

      let fov = 45;

      if (cameraAttribute.FieldOfView !== undefined) {
        const fieldOfView = cameraAttribute.FieldOfView.value;

        if (typeof fieldOfView !== 'number') {
          throw new Error('THREE.FBXLoader: Invalid field of view value');
        }
        // FBX stores the field of view in radians
        fov = fieldOfView;
      }

      const focalLength = cameraAttribute.FocalLength ? cameraAttribute.FocalLength.value : null;

      if (typeof focalLength !== 'number' && focalLength !== null) {
        throw new Error('THREE.FBXLoader: Invalid focal length value');
      }
      switch (type) {
        case 0: // Perspective
          model = new PerspectiveCamera(fov, aspect, nearClippingPlane, farClippingPlane);
          if (focalLength !== null) {
            model.setFocalLength(focalLength);
          }

          break;
        case 1: // Orthographic
          // Silently handle unsupported orthographic cameras
          model = new Object3D();

          break;
        default:
          // Silently handle unknown camera types
          model = new Object3D();

          break;
      }
    }

    return model;
  }

  // Create a DirectionalLight, PointLight or SpotLight
  createLight (relationships: FBXConnectionNode) {
    const fbxTree = this.context.fbxTree;

    if (!fbxTree || !fbxTree.Objects) {
      throw new Error('Global FBXTree or fbxTree.Objects is undefined');
    }
    let model: Object3D | PointLight | DirectionalLight | SpotLight;
    let lightAttribute: FBXLightNodeAttribute | undefined;

    const nodeAttribute = fbxTree.Objects.NodeAttribute;

    if (!nodeAttribute) {
      throw new Error('NodeAttribute is undefined');
    }
    relationships.children.forEach(function (child) {
      const attr = nodeAttribute[child.ID];

      if (attr !== undefined) {
        lightAttribute = attr;
      }
    });

    if (lightAttribute === undefined) {
      model = new Object3D();
    } else {
      let type;

      // LightType can be undefined for Point lights
      if (lightAttribute.LightType === undefined) {
        type = 0;
      } else {
        type = lightAttribute.LightType.value;
      }

      let color: Color = new Color(0xffffff);

      if (lightAttribute.Color !== undefined) {
        if (typeof lightAttribute.Color.value !== 'object') {
          throw new Error('THREE.FBXLoader: Invalid light color value');
        }

        color = ColorManagement.toWorkingColorSpace(
          new Color().fromArray(lightAttribute.Color.value),
          SRGBColorSpace,
        );
      }

      if (typeof lightAttribute.Intensity?.value !== 'number') {
        throw new Error('THREE.FBXLoader: Invalid light intensity value');
      }
      let intensity
        = lightAttribute.Intensity === undefined ? 1 : lightAttribute.Intensity.value / 100;

      // light disabled
      if (
        lightAttribute.CastLightOnObject !== undefined
        && lightAttribute.CastLightOnObject.value === 0
      ) {
        intensity = 0;
      }

      let distance = 0;

      if (lightAttribute.FarAttenuationEnd !== undefined) {
        if (
          lightAttribute.EnableFarAttenuation !== undefined
          && lightAttribute.EnableFarAttenuation.value === 0
        ) {
          distance = 0;
        } else {
          if (typeof lightAttribute.FarAttenuationEnd.value !== 'number') {
            throw new Error('THREE.FBXLoader: Invalid light far attenuation end value');
          }

          distance = lightAttribute.FarAttenuationEnd.value;
        }
      }

      // TODO: could this be calculated linearly from FarAttenuationStart to FarAttenuationEnd?
      const decay = 1;

      switch (type) {
        case 0: // Point
          model = new PointLight(color, intensity, distance, decay);

          break;
        case 1: // Directional
          model = new DirectionalLight(color, intensity);

          break;
        case 2: // Spot
          {
            let angle = Math.PI / 3;

            if (lightAttribute.InnerAngle !== undefined) {
              const innerAngle = lightAttribute.InnerAngle.value;

              if (typeof innerAngle !== 'number') {
                throw new Error('THREE.FBXLoader: Invalid light inner angle value');
              }
              angle = MathUtils.degToRad(innerAngle);
            }

            let penumbra = 0;

            if (lightAttribute.OuterAngle !== undefined) {
              const outerAngle = lightAttribute.OuterAngle.value;

              if (typeof outerAngle !== 'number') {
                throw new Error('THREE.FBXLoader: Invalid light outer angle value');
              }

              // TODO: this is not correct - FBX calculates outer and inner angle in degrees
              // with OuterAngle > InnerAngle && OuterAngle <= Math.PI
              // while three.js uses a penumbra between (0, 1) to attenuate the inner angle
              penumbra = MathUtils.degToRad(outerAngle);
              penumbra = Math.max(penumbra, 1);
            }

            model = new SpotLight(color, intensity, distance, angle, penumbra, decay);
          }

          break;
        default:
          // Silently handle unknown light types, defaulting to PointLight
          model = new PointLight(color, intensity);

          break;
      }

      if (lightAttribute.CastShadows !== undefined && lightAttribute.CastShadows.value === 1) {
        model.castShadow = true;
      }
    }

    return model;
  }

  createMesh (
    relationships: FBXConnectionNode,
    geometryMap: Map<number, BufferGeometry>,
    materialMap: Map<number, MeshPhongMaterial | MeshStandardMaterial | LineBasicMaterial>,
    geoInfoMap: Map<number, BaseInfo>,
    nodeID?: number,
  ) {
    let model;
    let geometry: BufferGeometry | undefined;
    let material = null;
    let modelInfo: BaseInfo = {
      polygons: 0,
      quads: 0,
      triangles: 0,
      vertices: 0,
    };
    const materials: (MeshPhongMaterial | MeshStandardMaterial)[] = [];

    // get geometry and materials(s) from connections - check parents first, then children
    relationships.parents.forEach(parent => {
      if (geometryMap.has(parent.ID) && !geometry) {
        geometry = geometryMap.get(parent.ID);
        modelInfo = geoInfoMap.get(parent.ID) || modelInfo;
      }

      if (materialMap.has(parent.ID)) {
        materials.push(materialMap.get(parent.ID) as MeshStandardMaterial);
      }
    });

    // Then check children only if no geometry found yet
    if (!geometry) {
      relationships.children.forEach(child => {
        // Direct check
        if (geometryMap.has(child.ID) && !geometry) {
          geometry = geometryMap.get(child.ID);
          modelInfo = geoInfoMap.get(child.ID) || modelInfo;
        }

        if (materialMap.has(child.ID)) {
          materials.push(materialMap.get(child.ID) as MeshStandardMaterial);
        }

        // Check if this child has its own children that might be geometry
        const childConnections = this.context.connections[child.ID];

        if (childConnections && !geometry) {
          childConnections.children.forEach(grandChild => {
            if (geometryMap.has(grandChild.ID) && !geometry) {
              geometry = geometryMap.get(grandChild.ID);
              modelInfo = geoInfoMap.get(grandChild.ID) || modelInfo;
            }

            if (materialMap.has(grandChild.ID)) {
              materials.push(materialMap.get(grandChild.ID) as MeshStandardMaterial);
            }
          });
        }
      });
    }

    if (materials.length > 1) {
      material = materials;
    } else if (materials.length > 0) {
      material = materials[0];
    } else {
      material = materialMap.get(this.defaultMaterialIndex);
      materials.push(material as MeshStandardMaterial);
    }

    if (!geometry) {
      throw new Error('THREE.FBXLoader: No geometry found for mesh.');
    }

    if ('color' in geometry.attributes) {
      materials.forEach(function (material) {
        material.vertexColors = true;
      });
    }

    // Sanitization: If geometry has groups, then it must match the provided material array.
    // If not, we need to clean up the `group.materialIndex` properties inside the groups and point at a (new) default material.
    // This isn't well defined; Unity creates default material, while Blender implicitly uses the previous material in the list.
    if (geometry.groups.length > 0) {
      let needsDefaultMaterial = false;

      for (let i = 0, il = geometry.groups.length; i < il; i++) {
        const group = geometry.groups[i] as { count: number, materialIndex: number, start: number };
        const materialIndex = group.materialIndex;

        if (materialIndex == null || materialIndex < 0 || materialIndex >= materials.length) {
          group.materialIndex = materials.length;
          needsDefaultMaterial = true;
        }
      }

      if (needsDefaultMaterial) {
        materials.push(materialMap.get(this.defaultMaterialIndex) as MeshStandardMaterial);
      }
    }

    if ((geometry as unknown as { FBX_Deformer: string }).FBX_Deformer) {
      model = new SkinnedMesh(geometry, material);
      model.normalizeSkinWeights();
    } else {
      model = new Mesh(geometry, material);
    }

    return { model, modelInfo };
  }

  createCurve (relationships: FBXConnectionNode, geometryMap: Map<number, BufferGeometry>) {
    const geometry = relationships.children.reduce<BufferGeometry | null>((geo, child) => {
      if (geometryMap.has(child.ID)) {
        geo = geometryMap.get(child.ID) ?? null;
      }
      if (!geo) {
        throw new Error('THREE.FBXLoader: No geometry found for curve.');
      }

      return geo;
    }, null);

    // FBX does not list materials for Nurbs lines, so we'll just put our own in here.
    const material = new LineBasicMaterial({
      color: 0x3300ff,
      linewidth: 1,
      name: Loader.DEFAULT_MATERIAL_NAME,
    });

    if (geometry === null) {
      throw new Error('THREE.FBXLoader: No geometry found for curve.');
    }

    return new Line(geometry, material);
  }

  // parse the model node for transform data
  getTransformData (model: Object3D, modelNode: FBXModelNode) {
    const transformData: UserDataTransform = {};

    if ('InheritType' in modelNode) {
      transformData.inheritType = parseInt(modelNode.InheritType.value as string);
    }

    if ('RotationOrder' in modelNode) {
      const value = modelNode.RotationOrder.value;

      if (typeof value !== 'number') {
        throw new Error('THREE.FBXLoader: Invalid rotation order value');
      }
      transformData.eulerOrder = getEulerOrder(value) as EulerOrder;
    } else {
      transformData.eulerOrder = getEulerOrder(0) as EulerOrder;
    }

    if ('Lcl_Translation' in modelNode) {
      // 如果scale需要从100调整为1，position也需要相应调整
      const translation = modelNode.Lcl_Translation.value as [number, number, number];

      let scaleAdjustmentFactor = 1;

      if ('Lcl_Scaling' in modelNode) {
        const scale = modelNode.Lcl_Scaling.value as [number, number, number];
        const scaleX = scale[0];
        const scaleY = scale[1];
        const scaleZ = scale[2];

        if (scaleX === 100 || scaleY === 100 || scaleZ === 100) {
          scaleAdjustmentFactor = 100;
        }
      }

      transformData.translation = [
        translation[0] / scaleAdjustmentFactor,
        translation[1] / scaleAdjustmentFactor,
        translation[2] / scaleAdjustmentFactor,
      ];
    }

    if ('PreRotation' in modelNode) {
      // transformData.preRotation = modelNode.PreRotation.value;
      const value = modelNode.PreRotation.value as [number, number, number];

      transformData.preRotation = [
        Number(value[0].toFixed(4)),
        Number(value[1].toFixed(4)),
        Number(value[2].toFixed(4)),
      ];
    }
    if ('Lcl_Rotation' in modelNode) {
      // transformData.rotation = modelNode.Lcl_Rotation.value;
      const value = modelNode.Lcl_Rotation.value as [number, number, number];

      transformData.rotation = [
        Number(value[0].toFixed(4)),
        Number(value[1].toFixed(4)),
        Number(value[2].toFixed(4)),
      ];
    }
    if ('PostRotation' in modelNode) {
      // transformData.postRotation = modelNode.PostRotation.value;
      const value = modelNode.PostRotation.value as [number, number, number];

      transformData.postRotation = [
        Number(value[0].toFixed(4)),
        Number(value[1].toFixed(4)),
        Number(value[2].toFixed(4)),
      ];
    }

    if ('Lcl_Scaling' in modelNode) {
      // transformData.scale = modelNode.Lcl_Scaling.value;
      const scale = modelNode.Lcl_Scaling.value as [number, number, number];

      transformData.scale = [
        scale[0] === 100 ? 1 : scale[0],
        scale[1] === 100 ? 1 : scale[1],
        scale[2] === 100 ? 1 : scale[2],
      ];
    }

    if ('ScalingOffset' in modelNode) {
      transformData.scalingOffset = modelNode.ScalingOffset.value as [number, number, number];
    }
    if ('ScalingPivot' in modelNode) {
      transformData.scalingPivot = modelNode.ScalingPivot.value as [number, number, number];
    }

    if ('RotationOffset' in modelNode) {
      transformData.rotationOffset = modelNode.RotationOffset.value as [number, number, number];
    }
    if ('RotationPivot' in modelNode) {
      transformData.rotationPivot = modelNode.RotationPivot.value as [number, number, number];
    }

    model.userData.transformData = transformData;
  }

  setLookAtProperties (model: Object3D, modelNode: FBXModelNode) {
    const connections = this.context.connections;
    const fbxTree = this.context.fbxTree;

    if (!connections || !fbxTree) {
      throw new Error('Global connections or FBX tree is undefined');
    }
    if ('LookAtProperty' in modelNode) {
      const children = connections[(model as unknown as { ID: number }).ID]?.children ?? [];

      children.forEach(function (child) {
        if (child.relationship === 'LookAtProperty') {
          const modelNode = fbxTree.Objects?.Model;

          if (!modelNode) {
            throw new Error('Model node is undefined');
          }
          const lookAtTarget = modelNode[child.ID];

          if ('Lcl_Translation' in lookAtTarget) {
            let pos = lookAtTarget.Lcl_Translation.value as [number, number, number];

            let scaleAdjustmentFactor = 1;

            if ('Lcl_Scaling' in lookAtTarget) {
              const scale = lookAtTarget.Lcl_Scaling.value as [number, number, number];
              const scaleX = scale[0];
              const scaleY = scale[1];
              const scaleZ = scale[2];

              if (scaleX === 100 || scaleY === 100 || scaleZ === 100) {
                scaleAdjustmentFactor = 100;
              }
            }

            // 调整position以保持一致性
            pos = [
              pos[0] / scaleAdjustmentFactor,
              pos[1] / scaleAdjustmentFactor,
              pos[2] / scaleAdjustmentFactor,
            ];

            // DirectionalLight, SpotLight
            if ((model as unknown as { target: number }).target !== undefined) {
              (model as unknown as { target: { position: Vector3 } }).target.position.fromArray(
                pos,
              );
              this.context.sceneGraph.add((model as unknown as { target: Object3D }).target);
            } else {
              // Cameras and other Object3Ds

              model.lookAt(new Vector3().fromArray(pos));
            }
          }
        }
      });
    }
  }

  bindSkeleton (
    skeletons: Record<number, FBXSkeleton>,
    geometryMap: Map<number, BufferGeometry>,
    modelMap: Map<number, Object3D>,
  ) {
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;

    if (!fbxTree || !connections) {
      throw new Error('Global fbxTree or connections is undefined');
    }

    const bindMatrices = this.parsePoseNodes();

    for (const ID in skeletons) {
      const skeleton = skeletons[ID];

      const parents = connections[parseInt(skeleton.ID)]?.parents || [];

      parents.forEach(function (parent) {
        if (geometryMap.has(parent.ID)) {
          const geoID = parent.ID;
          const geoRelationships = connections[geoID] || { parents: [] };

          geoRelationships.parents.forEach(function (geoConnParent) {
            if (modelMap.has(geoConnParent.ID)) {
              const model = modelMap.get(geoConnParent.ID) as SkinnedMesh;

              model.bind(new Skeleton(skeleton.bones), bindMatrices[geoConnParent.ID]);
            }
          });
        }
      });
    }
  }

  parsePoseNodes () {
    const bindMatrices: Record<string, Matrix4> = {};
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;

    if (!fbxTree || !connections || !fbxTree.Objects) {
      throw new Error('Global fbxTree or connections is undefined');
    }

    if ('Pose' in fbxTree.Objects) {
      const BindPoseNode = fbxTree.Objects.Pose as Record<string, any>;

      for (const nodeID in BindPoseNode) {
        const bindPoseNode = BindPoseNode[nodeID] as FBXPoseNode;

        if (bindPoseNode.attrType === 'BindPose' && bindPoseNode.NbPoseNodes > 0) {
          const poseNodes = bindPoseNode.PoseNode;

          if (Array.isArray(poseNodes)) {
            poseNodes.forEach(poseNode => {
              bindMatrices[(poseNode as FBXMeshNode).Node || 0] = new Matrix4().fromArray(
                (poseNode as FBXMeshNode).Matrix?.a
                ?? ((poseNode as unknown as FBXMeshNode[])[0]).Matrix?.a
                ?? [],
              );
            });
          } else {
            const node = poseNodes.Node;

            if (!node) {
              throw new Error('THREE.FBXLoader: No node found for poseNode.');
            }

            bindMatrices[node] = new Matrix4().fromArray(poseNodes?.Matrix?.a ?? []);
          }
        }
      }
    }

    return bindMatrices;
  }

  addGlobalSceneSettings () {
    const fbxTree = this.context.fbxTree;

    if (!fbxTree || !fbxTree.GlobalSettings) {
      throw new Error('Global FBXTree is undefined');
    }
    if ('GlobalSettings' in fbxTree) {
      if ('AmbientColor' in fbxTree.GlobalSettings) {
        // Parse ambient color - if it's not set to black (default), create an ambient light

        const ambientColor = fbxTree.GlobalSettings.AmbientColor?.value as [number, number, number] || [0, 0, 0];
        const r = ambientColor[0];
        const g = ambientColor[1];
        const b = ambientColor[2];

        if (r !== 0 || g !== 0 || b !== 0) {
          const color = new Color().setRGB(r, g, b, SRGBColorSpace);

          this.context.sceneGraph.add(new AmbientLight(color, 1));
        }
      }

      if ('UnitScaleFactor' in fbxTree.GlobalSettings) {
        this.context.sceneGraph.userData.unitScaleFactor = fbxTree.GlobalSettings.UnitScaleFactor?.value || 1;
      }
    }
  }
}
