/**
 * @file parse/FBX-tree-parser.ts
 * @description FBX树结构解析器 - 基于Three.js FBXLoader源码
 */

import * as THREE from 'three';
import type {
  IFBXTree,
  FBXConnectionNode,
  FBXModelNode,
  ParseContext,
  ModelLoaderResult,
} from '../types/core/fbx-types';
import { AnimationParser } from './FBX-animation-parser';
import { GeometryParser } from './FBX-geometry-parser';

/**
 * FBX树解析器
 */
export class FBXTreeParser {
  private textureLoader: THREE.TextureLoader;
  private manager: THREE.LoadingManager;
  private context: ParseContext;

  constructor (textureLoader?: THREE.TextureLoader, manager?: THREE.LoadingManager) {
    this.textureLoader = textureLoader || new THREE.TextureLoader();
    this.manager = manager || new THREE.LoadingManager();
    this.context = {
      connections: new Map(),
      fbxTree: {},
      sceneGraph: new THREE.Group(),
      materials: new Map(),
      textures: new Map(),
      images: new Map(),
      geometryMap: new Map(),
    } as any;
  }

  /**
   * 解析FBX树
   */
  parse (fbxTree: IFBXTree): ModelLoaderResult {
    this.context.fbxTree = fbxTree;

    // 解析连接关系
    const connections = this.parseConnections();

    this.context.connections = connections;

    // 解析图像
    const images = this.parseImages();

    // 解析纹理
    const textures = this.parseTextures(images);

    // 解析材质
    const materials = this.parseMaterials(textures);

    // 解析变形器
    const deformers = this.parseDeformers();

    // 解析几何体
    const geometryParser = new GeometryParser(this.context);
    const geometryMap = geometryParser.parse(deformers);

    // 解析场景
    this.parseScene(deformers, geometryMap, materials);

    return {
      scene: this.context.sceneGraph as THREE.Group,
      animations: [],
      modelInfo: {
        nodeCount: this.countNodes(fbxTree),
        connectionCount: connections.size,
        geometryCount: geometryMap.size,
        materialCount: materials.size,
      },
    };
  }

  /**
   * 解析FBX连接关系
   */
  private parseConnections (): Map<number, FBXConnectionNode> {
    const connectionMap = new Map<number, FBXConnectionNode>();

    if ('Connections' in this.context.fbxTree) {
      const rawConnections = (this.context.fbxTree as any).Connections.connections || [];

      rawConnections.forEach((rawConnection: any) => {
        const fromID = rawConnection[0];
        const toID = rawConnection[1];
        const relationship = rawConnection[2];

        if (!connectionMap.has(fromID)) {
          connectionMap.set(fromID, {
            parents: [],
            children: [],
          });
        }

        const parentRelationship = { ID: toID, relationship: relationship };

        connectionMap.get(fromID)!.parents.push(parentRelationship);

        if (!connectionMap.has(toID)) {
          connectionMap.set(toID, {
            parents: [],
            children: [],
          });
        }

        const childRelationship = { ID: fromID, relationship: relationship };

        connectionMap.get(toID)!.children.push(childRelationship);
      });
    }

    return connectionMap;
  }

  /**
   * 解析图像
   */
  private parseImages (): Map<number, string> {
    const images = new Map<number, string>();
    const blobs = new Map<string, string>();

    if (this.context.fbxTree.Objects && 'Video' in this.context.fbxTree.Objects) {
      const videoNodes = (this.context.fbxTree.Objects as any).Video;

      for (const nodeID in videoNodes) {
        const videoNode = videoNodes[nodeID];
        const id = parseInt(nodeID);

        const filename = videoNode.RelativeFilename || videoNode.Filename;

        images.set(id, filename);

        // 原始图像数据在videoNode.Content中
        if ('Content' in videoNode) {
          const arrayBufferContent = (videoNode.Content instanceof ArrayBuffer) && (videoNode.Content.byteLength > 0);
          const base64Content = (typeof videoNode.Content === 'string') && (videoNode.Content !== '');

          if (arrayBufferContent || base64Content) {
            const image = this.parseImage(videoNode);

            if (image) {
              blobs.set(filename, image);
            }
          }
        }
      }
    }

    // 将blob URL替换原始文件名
    for (const [id, filename] of images) {
      const blobUrl = blobs.get(filename);

      if (blobUrl !== undefined) {
        images.set(id, blobUrl);
      } else {
        // 只保留文件名，去掉路径
        const cleanFilename = filename.split('\\').pop();

        images.set(id, cleanFilename || '');
      }
    }

    (this.context as any).images = images;

    return images;
  }

  /**
   * 解析单个图像
   */
  private parseImage (videoNode: any): string | null {
    const content = videoNode.Content;
    const fileName = videoNode.RelativeFilename || videoNode.Filename;
    const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();

    let type: string;

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
      case 'tif':
        type = 'image/tiff';

        break;
      case 'tga':
        if (this.manager.getHandler('.tga') === null) {
          console.warn('FBXLoader: TGA loader not found, skipping', fileName);
        }
        type = 'image/tga';

        break;
      case 'webp':
        type = 'image/webp';

        break;
      default:
        console.warn('FBXLoader: Image type "' + extension + '" is not supported.');

        return null;
    }

    if (typeof content === 'string') {
      // ASCII格式
      return 'data:' + type + ';base64,' + content;
    } else {
      // 二进制格式
      const array = new Uint8Array(content);

      return URL.createObjectURL(new Blob([array], { type: type }));
    }
  }

  /**
   * 解析纹理
   */
  private parseTextures (images: Map<number, string>): Map<number, THREE.Texture> {
    const textures = new Map<number, THREE.Texture>();

    if (this.context.fbxTree.Objects && 'Texture' in this.context.fbxTree.Objects) {
      const textureNodes = (this.context.fbxTree.Objects as any).Texture;

      for (const nodeID in textureNodes) {
        const textureNode = textureNodes[nodeID];
        const id = parseInt(nodeID);

        // 连接到图像ID
        const connections = this.context.connections.get(id);

        if (connections && connections.children.length > 0) {
          const imageId = connections.children[0].ID;
          const imageUrl = images.get(imageId);

          if (imageUrl) {
            const texture = this.textureLoader.load(imageUrl);

            // 应用纹理属性
            this.setTextureParameters(texture, textureNode);

            textures.set(id, texture);
          }
        }
      }
    }

    (this.context as any).textures = textures;

    return textures;
  }

  /**
   * 设置纹理参数
   */
  private setTextureParameters (texture: THREE.Texture, textureNode: any): void {
    // 纹理包装
    if (textureNode.WrapModeU !== undefined) {
      switch (textureNode.WrapModeU) {
        case 0:
          texture.wrapS = THREE.RepeatWrapping;

          break;
        case 1:
          texture.wrapS = THREE.ClampToEdgeWrapping;

          break;
        case 2:
          texture.wrapS = THREE.MirroredRepeatWrapping;

          break;
      }
    }

    if (textureNode.WrapModeV !== undefined) {
      switch (textureNode.WrapModeV) {
        case 0:
          texture.wrapT = THREE.RepeatWrapping;

          break;
        case 1:
          texture.wrapT = THREE.ClampToEdgeWrapping;

          break;
        case 2:
          texture.wrapT = THREE.MirroredRepeatWrapping;

          break;
      }
    }

    // 纹理缩放
    if (textureNode.Scaling !== undefined) {
      const scaling = textureNode.Scaling.value;

      if (scaling && scaling.length >= 2) {
        texture.repeat.set(scaling[0], scaling[1]);
      }
    }

    // 纹理偏移
    if (textureNode.Translation !== undefined) {
      const translation = textureNode.Translation.value;

      if (translation && translation.length >= 2) {
        texture.offset.set(translation[0], translation[1]);
      }
    }

    // 纹理旋转
    if (textureNode.Rotation !== undefined) {
      const rotation = textureNode.Rotation.value;

      if (rotation && rotation.length > 0) {
        texture.rotation = rotation[0];
      }
    }

    // 颜乘色
    if (textureNode.Color !== undefined) {
      const color = textureNode.Color.value;

      if (color && color.length >= 3) {
        // Texture没有color属性，这里可能需要其他处理方式
        // 暂时跳过颜色设置
        console.warn('Texture color setting not implemented:', color);
      }
    }
  }

  /**
   * 解析材质
   */
  private parseMaterials (textures: Map<number, THREE.Texture>): Map<number, THREE.Material> {
    const materials = new Map<number, THREE.Material>();

    if (this.context.fbxTree.Objects && 'Material' in this.context.fbxTree.Objects) {
      const materialNodes = (this.context.fbxTree.Objects as any).Material;

      for (const nodeID in materialNodes) {
        const materialNode = materialNodes[nodeID];
        const id = parseInt(nodeID);

        const material = this.parseMaterialNode(materialNode, textures, id);

        materials.set(id, material);
      }
    }

    (this.context as any).materials = materials;

    return materials;
  }

  /**
   * 解析材质节点
   */
  private parseMaterialNode (materialNode: any, textures: Map<number, THREE.Texture>, id: number): THREE.Material {
    // 检查是否有PBR属性
    const hasPBR = materialNode.ShadingModel === 'unknown' ||
                   materialNode.Specular !== undefined ||
                   materialNode.Roughness !== undefined ||
                   materialNode.Metallic !== undefined;

    let material: THREE.Material;

    if (hasPBR) {
      // 使用PBR材质
      const pbrMaterial = new THREE.MeshStandardMaterial({
        name: materialNode.attrName || `Material_${id}`,
      });

      // 漫反射颜色
      if (materialNode.DiffuseColor !== undefined) {
        const color = materialNode.DiffuseColor.value;

        if (color && color.length >= 3) {
          pbrMaterial.color.setRGB(color[0], color[1], color[2]);
        }
      }

      // 粗糙度
      if (materialNode.Roughness !== undefined) {
        pbrMaterial.roughness = materialNode.Roughness.value || 0.5;
      }

      // 金属度
      if (materialNode.Metallic !== undefined) {
        pbrMaterial.metalness = materialNode.Metallic.value || 0.0;
      }

      material = pbrMaterial;
    } else {
      // 使用Lambert材质
      material = new THREE.MeshLambertMaterial({
        name: materialNode.attrName || `Material_${id}`,
      });

      // 漫反射颜色
      if (materialNode.DiffuseColor !== undefined) {
        const color = materialNode.DiffuseColor.value;

        if (color && color.length >= 3) {
          (material as THREE.MeshLambertMaterial).color.setRGB(color[0], color[1], color[2]);
        }
      }
    }

    // 透明度
    if (materialNode.TransparencyFactor !== undefined) {
      material.transparent = true;
      material.opacity = 1.0 - (materialNode.TransparencyFactor.value || 0.0);
    }

    // 自发光
    if (materialNode.EmissiveColor !== undefined) {
      const emissiveColor = materialNode.EmissiveColor.value;

      if (emissiveColor && emissiveColor.length >= 3) {
        (material as any).emissive = new THREE.Color().setRGB(
          emissiveColor[0], emissiveColor[1], emissiveColor[2]
        );
      }
    }

    // 应用纹理
    this.applyMaterialTextures(material, materialNode, textures, id);

    return material;
  }

  /**
   * 为材质应用纹理
   */
  private applyMaterialTextures (
    material: THREE.Material,
    materialNode: any,
    textures: Map<number, THREE.Texture>,
    materialId: number
  ): void {
    const connections = this.context.connections.get(materialId);

    if (!connections) {return;}

    connections.children.forEach((connection: any) => {
      const textureId = connection.ID;
      const texture = textures.get(textureId);

      if (!texture) {return;}

      const textureNode = this.findTextureNode(textureId);

      if (!textureNode) {return;}

      // 根据连接关系确定纹理用途
      switch (connection.relationship) {
        case 'DiffuseColor':
          if (material instanceof THREE.MeshStandardMaterial) {
            material.map = texture;
          } else if (material instanceof THREE.MeshLambertMaterial) {
            material.map = texture;
          }

          break;
        case 'NormalMap':
          (material as any).normalMap = texture;

          break;
        case 'SpecularColor':
          (material as any).specularMap = texture;

          break;
        case 'Roughness':
          if (material instanceof THREE.MeshStandardMaterial) {
            material.roughnessMap = texture;
          }

          break;
        case 'Metallic':
          if (material instanceof THREE.MeshStandardMaterial) {
            material.metalnessMap = texture;
          }

          break;
        case 'EmissiveColor':
          (material as any).emissiveMap = texture;

          break;
        case 'Bump':
          (material as any).bumpMap = texture;

          break;
        case 'AmbientColor':
          (material as any).aoMap = texture;

          break;
      }
    });
  }

  /**
   * 查找纹理节点
   */
  private findTextureNode (textureId: number): any {
    const textureNodes = (this.context.fbxTree.Objects as any).Texture;

    return textureNodes[textureId];
  }

  /**
   * 解析变形器
   */
  private parseDeformers (): any {
    const deformers: any = {
      skinDeformers: new Map(),
      blendShapeDeformers: new Map(),
    };

    if (this.context.fbxTree.Objects && 'Deformer' in this.context.fbxTree.Objects) {
      const deformerNodes = (this.context.fbxTree.Objects as any).Deformer;

      for (const nodeID in deformerNodes) {
        const deformerNode = deformerNodes[nodeID];
        const id = parseInt(nodeID);

        if (deformerNode.attrType === 'Skin') {
          deformers.skinDeformers.set(id, deformerNode);
        } else if (deformerNode.attrType === 'BlendShape') {
          deformers.blendShapeDeformers.set(id, deformerNode);
        }
      }
    }

    return deformers;
  }

  /**
   * 解析场景
   */
  private parseScene (deformers: any, geometryMap: Map<number, THREE.BufferGeometry>, materials: Map<number, THREE.Material>): void {
    if (this.context.fbxTree.Objects && 'Model' in this.context.fbxTree.Objects) {
      const modelNodes = (this.context.fbxTree.Objects as any).Model;

      for (const nodeID in modelNodes) {
        const modelNode = modelNodes[nodeID];
        const id = parseInt(nodeID);

        this.parseModelNode(modelNode, id, geometryMap, materials, deformers);
      }
    }

    // 解析动画
    const animationParser = new AnimationParser(this.context);
    const animations = animationParser.parse();

    if (animations.length > 0) {
      (this.context as any).animations = animations;
    }
  }

  /**
   * 解析模型节点
   */
  private parseModelNode (
    modelNode: FBXModelNode,
    id: number,
    geometryMap: Map<number, THREE.BufferGeometry>,
    materials: Map<number, THREE.Material>,
    deformers: any
  ): void {
    let object: THREE.Object3D;

    switch (modelNode.attrType) {
      case 'Camera':
        object = this.createCamera(modelNode);

        break;
      case 'Light':
        object = this.createLight(modelNode);

        break;
      case 'Mesh': {
        const mesh = this.createMesh(modelNode, id, geometryMap, materials, deformers);

        if (mesh) {
          object = mesh;
        } else {
          object = new THREE.Group();
        }

        break;
      }
      case 'Null':
      default:
        object = new THREE.Group();

        break;
    }

    if (object) {
      object.name = modelNode.attrName || `Model_${id}`;

      // 应用变换
      this.applyTransform(object, modelNode);

      // 添加到场景图
      this.context.sceneGraph.add(object);
    }
  }

  /**
   * 创建相机
   */
  private createCamera (modelNode: FBXModelNode): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera();

    // 设置相机属性
    if (modelNode.NearPlane !== undefined) {
      camera.near = (modelNode.NearPlane).value || 0.1;
    }

    if (modelNode.FarPlane !== undefined) {
      camera.far = (modelNode.FarPlane).value || 1000;
    }

    if (modelNode.FieldOfView !== undefined) {
      camera.fov = (modelNode.FieldOfView).value || 50;
    }

    return camera;
  }

  /**
   * 创建灯光
   */
  private createLight (modelNode: FBXModelNode): THREE.Light {
    // 默认创建点光源
    const light = new THREE.PointLight();

    // 设置灯光属性
    if (modelNode.Color !== undefined) {
      const color = (modelNode.Color).value;

      if (color && color.length >= 3) {
        light.color.setRGB(color[0], color[1], color[2]);
      }
    }

    if (modelNode.Intensity !== undefined) {
      light.intensity = (modelNode.Intensity).value || 1.0;
    }

    return light;
  }

  /**
   * 创建网格
   */
  private createMesh (
    modelNode: FBXModelNode,
    id: number,
    geometryMap: Map<number, THREE.BufferGeometry>,
    materials: Map<number, THREE.Material>,
    deformers: any
  ): THREE.Mesh | THREE.SkinnedMesh | null {
    const connections = this.context.connections.get(id);

    if (!connections) {return null;}

    // 查找几何体
    let geometry: THREE.BufferGeometry | null = null;

    for (const connection of connections.children) {
      if (connection.relationship === 'Geometry') {
        geometry = geometryMap.get(connection.ID) || null;

        break;
      }
    }

    if (!geometry) {return null;}

    // 查找材质
    let material: THREE.Material | THREE.Material[] | null = null;

    for (const connection of connections.children) {
      if (connection.relationship === 'Material') {
        const mat = materials.get(connection.ID);

        if (mat) {
          material = mat;

          break;
        }
      }
    }

    if (!material) {
      material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    }

    // 创建网格或蒙皮网格
    let mesh: THREE.Mesh | THREE.SkinnedMesh;

    const hasSkin = this.hasSkinDeformer(id, deformers);

    if (hasSkin) {
      const skinnedMesh = new THREE.SkinnedMesh(geometry, material);

      this.setupSkin(skinnedMesh, id, deformers);
      mesh = skinnedMesh;
    } else {
      mesh = new THREE.Mesh(geometry, material);
    }

    return mesh;
  }

  /**
   * 检查是否有蒙皮变形器
   */
  private hasSkinDeformer (modelId: number, deformers: any): boolean {
    const connections = this.context.connections.get(modelId);

    if (!connections) {return false;}

    for (const connection of connections.children) {
      if (connection.relationship === 'Deformer') {
        const deformer = deformers.skinDeformers.get(connection.ID);

        if (deformer) {return true;}
      }
    }

    return false;
  }

  /**
   * 设置蒙皮
   */
  private setupSkin (mesh: THREE.SkinnedMesh, modelId: number, deformers: any): void {
    const connections = this.context.connections.get(modelId);

    if (!connections) {return;}

    // 查找蒙皮变形器
    let skinDeformer: any = null;

    for (const connection of connections.children) {
      if (connection.relationship === 'Deformer') {
        skinDeformer = deformers.skinDeformers.get(connection.ID);
        if (skinDeformer) {break;}
      }
    }

    if (!skinDeformer) {return;}

    // 设置骨骼
    const bones = this.createBones(skinDeformer, deformers);

    if (bones.length > 0) {
      const skeleton = new THREE.Skeleton(bones);

      mesh.bind(skeleton);
    }
  }

  /**
   * 创建骨骼
   */
  private createBones (skinDeformer: any, deformers: any): THREE.Bone[] {
    const bones: THREE.Bone[] = [];

    // 这里需要实现完整的骨骼创建逻辑
    // 暂时返回空数组

    return bones;
  }

  /**
   * 应用变换
   */
  private applyTransform (object: THREE.Object3D, modelNode: FBXModelNode): void {
    // 位置
    if (modelNode.Lcl_Translation !== undefined) {
      const translation = (modelNode.Lcl_Translation).value;

      if (translation && translation.length >= 3) {
        object.position.set(translation[0], translation[1], translation[2]);
      }
    }

    // 旋转
    if (modelNode.Lcl_Rotation !== undefined) {
      const rotation = (modelNode.Lcl_Rotation).value;

      if (rotation && rotation.length >= 3) {
        // 转换为弧度
        const euler = new THREE.Euler(
          rotation[0] * Math.PI / 180,
          rotation[1] * Math.PI / 180,
          rotation[2] * Math.PI / 180
        );

        object.rotation.copy(euler);
      }
    }

    // 缩放
    if (modelNode.Lcl_Scaling !== undefined) {
      const scaling = (modelNode.Lcl_Scaling).value;

      if (scaling && scaling.length >= 3) {
        object.scale.set(scaling[0], scaling[1], scaling[2]);
      }
    }
  }

  /**
   * 计算节点数量
   */
  private countNodes (fbxTree: IFBXTree): number {
    let count = 0;

    if (fbxTree.Objects) {
      for (const category in fbxTree.Objects) {
        const objects = (fbxTree.Objects as any)[category];

        if (objects) {
          count += Object.keys(objects).length;
        }
      }
    }

    return count;
  }
}