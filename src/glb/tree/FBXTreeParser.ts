import type {
  BufferGeometry,
  LoadingManager,
  TextureLoader,
  MeshStandardMaterial,
  Object3D } from 'three';
import {
  Bone,
  Group,
  Matrix4,
  PropertyBinding,
} from 'three';
import { BaseParser, type IParsingContext, type FBXConnectionNode, type FBXConnectionReference, type FBXMeshNode, type FBXModelNode, type FBXRawTargets, type FBXSkeleton, type RawBone, type FBXSceneParserOptions } from '../../types';
import type {
  IFBXTreeParser,
  FBXTreeParserInput,
  FBXTreeParserResult,
  SceneInfo,
  SceneParseResult,
  ModelInfo,
  BoneWithID,
  Object3DWithID,
} from '../../types';
// removed unused GeometryInfo type after delegating mesh creation
// removed unused type-guard helpers after delegating implementations
// removed unused getEulerOrder after delegating transform parsing
import { GeometryParser } from '../geometry';
import { parseConnections } from './connections';
import { parseImages } from './image-parser';
import { parseTextures } from './texture-parser';
import { parseMaterials } from './material-parser';
import { parseDeformers } from './deformer-parser';
import { parseScene as buildScene, createCamera as buildCamera, createLight as buildLight } from './scene-builder';
import { createMesh as buildMesh, createCurve as buildCurve } from './model-parser';
import { getTransformData as extractTransformData, setLookAtProperties as applyLookAtProperties, bindSkeleton as bindSkeletonToModels, parsePoseNodes as parsePoseMatrices, addGlobalSceneSettings as addSceneSettings } from './transform-utils';

// Parse the FBXTree object returned by the BinaryParser or TextParser and return a Group
export class FBXTreeParser extends BaseParser<FBXTreeParserInput, Promise<FBXTreeParserResult>> implements IFBXTreeParser {
  textureLoader: TextureLoader;
  manager: LoadingManager;
  defaultMaterialIndex = -1;
  private sceneInfo: SceneInfo = {
    isPBR: true,
    isTextured: true,
    isUVMapped: true,
    polygons: 0,
    quads: 0,
    topology: 'Quad',
    triangles: 0,
    vertices: 0,
  };

  constructor (textureLoader: TextureLoader, manager: LoadingManager, context: IParsingContext) {
    super(context);
    this.textureLoader = textureLoader;
    this.manager = manager;
  }

  async parse (_input: FBXTreeParserInput, _context: IParsingContext): Promise<FBXTreeParserResult> {
    this.context.connections = parseConnections(this.context.fbxTree);

    const images = parseImages(this.context.fbxTree);

    const textures = await parseTextures(
      this.context.fbxTree,
      this.context.connections,
      images,
      this.manager,
      this.textureLoader
    );
    const materialMap = parseMaterials(
      this.context.fbxTree,
      this.context.connections,
      textures,
      this.defaultMaterialIndex
    );
    const deformers = parseDeformers(
      this.context.fbxTree,
      this.context.connections,
    );
    const { geoInfoMap, geometryMap } = new GeometryParser(this.context).parse(deformers, this.context);

    return this.parseScene({
      deformers,
      geoInfoMap,
      geometryMap,
      materialMap,
    });
  }

  // Parse nodes in context.fbxTree.Objects.Deformer
  // Deformer node can contain skinning or Vertex Cache animation data, however only skinning is supported here
  // Generates map of Skeleton-like objects for use later when generating and binding skeletons.

  // Parse single nodes in context.fbxTree.Objects.Deformer
  // The top level skeleton node has type 'Skin' and sub nodes have type 'Cluster'
  // Each skin node represents a skeleton and each cluster node represents a bone
  parseSkeleton (
    relationships: FBXConnectionNode,
    deformerNodes: Record<number, FBXMeshNode>,
  ): FBXSkeleton {
    const rawBones: RawBone[] = [];

    relationships.children.forEach(child => {
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
        = connections.get(id)?.children.filter((child: FBXConnectionReference) => {
          return child.relationship === undefined;
        })[0]?.ID || 0;

      rawMorphTargets.push(rawMorphTarget);
    }

    return rawMorphTargets;
  }

  // create the main Group() to be returned by the loader
  parseScene (option: FBXSceneParserOptions): SceneParseResult {
    return buildScene(this.context, this.sceneInfo, option, {
      parseWireFrameModels: this.parseWireFrameModels.bind(this),
      setLookAtProperties: this.setLookAtProperties.bind(this),
      bindSkeleton: this.bindSkeleton.bind(this),
      addGlobalSceneSettings: this.addGlobalSceneSettings.bind(this),
    });
  }

  // parse nodes in context.fbxTree.Objects.Model
  parseWireFrameModels (
    skeletons: Record<string, FBXSkeleton>,
    geometryMap: Map<number, BufferGeometry>,
    materialMap: Map<number, MeshStandardMaterial>,
    geoInfoMap: Map<number, ModelInfo>,
  ) {
    const modelMap: Map<number, Object3D> = new Map();
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;
    const modelInfoMap: Record<string, ModelInfo> = {};

    if (!fbxTree || !fbxTree.Objects || !connections) {
      throw new Error('Global FBXTree or fbxTree.Objects or global connections is undefined');
    }
    const modelNodes = fbxTree.Objects.Model;

    for (const nodeID in modelNodes) {
      const id = parseInt(nodeID);
      const node = modelNodes[nodeID];
      const relationships = connections.get(id) || { children: [], parents: [] };
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
              const result = this.createMesh(relationships, geometryMap, materialMap, geoInfoMap);

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

        (model as Object3DWithID).ID = id;
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
            (bone as BoneWithID).ID = id;

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
    return buildCamera(this.context, relationships);
  }

  // Create a DirectionalLight, PointLight or SpotLight
  createLight (relationships: FBXConnectionNode) {
    return buildLight(this.context, relationships);
  }

  createMesh (
    relationships: FBXConnectionNode,
    geometryMap: Map<number, BufferGeometry>,
    materialMap: Map<number, MeshStandardMaterial>,
    geoInfoMap: Map<number, ModelInfo>,
  ) {
    const { model, modelInfo } = buildMesh(
      this.defaultMaterialIndex,
      relationships,
      geometryMap,
      materialMap,
      geoInfoMap,
    );

    // 更新场景统计信息
    this.sceneInfo.polygons += modelInfo.polygons;
    this.sceneInfo.quads += modelInfo.quads;
    this.sceneInfo.triangles += modelInfo.triangles;
    this.sceneInfo.vertices += modelInfo.vertices;

    if (!modelInfo.isPBR) {
      this.sceneInfo.isPBR = false;
    }
    if (!modelInfo.isTextured) {
      this.sceneInfo.isTextured = false;
    }
    if (!modelInfo.isUVMapped) {
      this.sceneInfo.isUVMapped = false;
    }

    return { model, modelInfo };
  }

  createCurve (relationships: FBXConnectionNode, geometryMap: Map<number, BufferGeometry>) {
    return buildCurve(relationships, geometryMap);
  }

  // parse the model node for transform data
  getTransformData (model: Object3D, modelNode: FBXModelNode) {
    extractTransformData(model, modelNode);
  }

  setLookAtProperties (model: Object3D, modelNode: FBXModelNode) {
    applyLookAtProperties(model, modelNode, this.context);
  }

  bindSkeleton (
    skeletons: Record<string, FBXSkeleton>,
    geometryMap: Map<number, BufferGeometry>,
    modelMap: Map<number, Object3D>,
  ) {
    bindSkeletonToModels(skeletons, geometryMap, modelMap, this.context);
  }

  parsePoseNodes () {
    return parsePoseMatrices(this.context);
  }

  addGlobalSceneSettings () {
    addSceneSettings(this.context);
  }

}
