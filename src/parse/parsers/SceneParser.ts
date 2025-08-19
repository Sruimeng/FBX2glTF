// 场景解析器
import type { BufferGeometry, Object3D, Matrix4 } from 'three';
import {
  Group,
  Bone,
  PerspectiveCamera,
  PointLight,
  DirectionalLight,
  SpotLight,
  SkinnedMesh,
  Mesh,
  Color,
  Skeleton,
} from 'three';
import type {
  FBXConnectionNode,
  FBXModelNode,
  FBXSkeleton,
  UserDataTransform,
  FBXTransformData,
} from '../../constants';
import { generateTransform, getEulerOrder } from '../utils';
import type { ParseContext } from '../types/common';

export class SceneParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  // 解析场景
  parse (
    deformers: any,
    geometryMap: Map<number, any>,
    materials: Map<number, any>
  ): void {
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;
    const sceneGraph = this.context.sceneGraph;

    if (!fbxTree || !connections || !sceneGraph) {
      throw new Error('FBXTree, connections, or sceneGraph is not defined');
    }

    const objects = fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }

    const modelNodes = objects.Model || {};
    const rootNode = this.findRootModel(modelNodes, connections);

    if (rootNode) {
      this.parseModelHierarchy(rootNode, modelNodes, connections, geometryMap, materials, deformers);
    }
  }

  // 查找根模型节点
  private findRootModel (modelNodes: Record<string, FBXModelNode>, connections: Map<number, FBXConnectionNode>): FBXModelNode | null {
    if (!modelNodes) {return null;}

    for (const nodeID in modelNodes) {
      const modelNode = modelNodes[nodeID];
      const modelConnections = connections.get(parseInt(nodeID));

      if (modelConnections) {
        const hasParent = modelConnections.parents.some(parent => {
          const parentNode = modelNodes[parent.ID.toString()];

          return parentNode && parentNode.attrType === 'Model';
        });

        if (!hasParent) {
          return modelNode;
        }
      }
    }

    return null;
  }

  // 解析模型层次结构
  private parseModelHierarchy (
    rootNode: FBXModelNode,
    modelNodes: Record<string, FBXModelNode>,
    connections: Map<number, FBXConnectionNode>,
    geometryMap: Map<number, any>,
    materials: Map<number, any>,
    deformers: any
  ): void {
    const sceneGraph = this.context.sceneGraph;
    const rootObject = this.parseModelNode(rootNode, modelNodes, connections, geometryMap, materials, deformers);

    if (rootObject) {
      sceneGraph.add(rootObject);
    }
  }

  // 解析模型节点
  private parseModelNode (
    modelNode: FBXModelNode,
    modelNodes: Record<string, FBXModelNode>,
    connections: Map<number, FBXConnectionNode>,
    geometryMap: Map<number, any>,
    materials: Map<number, any>,
    deformers: any
  ): Object3D | null {
    let object: Object3D;

    // 根据模型类型创建对象
    switch (modelNode.attrType) {
      case 'Camera':
        object = this.parseCamera(modelNode);

        break;
      case 'Light':
        object = this.parseLight(modelNode);

        break;
      case 'Mesh': {
        const meshObject = this.parseMesh(modelNode, geometryMap, materials, deformers);

        if (meshObject) {
          object = meshObject;
        } else {
          object = new Group();
        }

        break;
      }
      case 'Null':
      case 'LimbNode':
        object = new Group();

        break;
      default:
        object = new Group();
    }

    if (object) {
      // 设置名称
      object.name = modelNode.attrName || '';

      // 设置变换
      const transformData = this.parseTransformData(modelNode);
      const transformMatrix = generateTransform(transformData as FBXTransformData);

      object.matrix.copy(transformMatrix);
      object.matrix.decompose(object.position, object.quaternion, object.scale);

      // 设置用户数据
      object.userData = {
        originalName: modelNode.attrName,
        transformData,
      };

      // 递归处理子对象
      const modelConnections = connections.get(modelNode.id || 0);

      if (modelConnections) {
        for (const connection of modelConnections.children) {
          const childModel = modelNodes[connection.ID.toString()];

          if (childModel) {
            const childObject = this.parseModelNode(
              childModel,
              modelNodes,
              connections,
              geometryMap,
              materials,
              deformers
            );

            if (childObject) {
              object.add(childObject);
            }
          }
        }
      }
    }

    return object;
  }

  // 解析相机
  private parseCamera (modelNode: FBXModelNode): PerspectiveCamera {
    const camera = new PerspectiveCamera();

    // 解析相机属性
    const nodeAttribute = this.findNodeAttribute(modelNode);

    if (nodeAttribute) {
      if (nodeAttribute.NearPlane) {
        camera.near = nodeAttribute.NearPlane.value;
      }

      if (nodeAttribute.FarPlane) {
        camera.far = nodeAttribute.FarPlane.value;
      }

      if (nodeAttribute.FocalLength) {
        camera.fov = 2 * Math.atan(camera.getFilmHeight() / (2 * nodeAttribute.FocalLength.value)) * (180 / Math.PI);
      }
    }

    return camera;
  }

  // 查找节点属性
  private findNodeAttribute (modelNode: FBXModelNode): any {
    const connections = this.context.connections;
    const modelConnections = connections.get(modelNode.id || 0);

    if (modelConnections) {
      // 这里需要根据实际FBX结构查找节点属性
      // 简化实现，返回null
    }

    return null;
  }

  // 解析光源
  private parseLight (modelNode: FBXModelNode): DirectionalLight | PointLight | SpotLight {
    let light: DirectionalLight | PointLight | SpotLight;
    const nodeAttribute = this.findNodeAttribute(modelNode);

    // 解析光源类型
    const lightType = nodeAttribute?.LightType?.value || 0;

    switch (lightType) {
      case 0: // 点光源
        light = new PointLight();

        break;
      case 1: // 方向光
        light = new DirectionalLight();

        break;
      case 2: // 聚光灯
        light = new SpotLight();

        break;
      default:
        light = new DirectionalLight();
    }

    // 解析光源属性
    if (nodeAttribute?.Color) {
      light.color = new Color(nodeAttribute.Color.value[0], nodeAttribute.Color.value[1], nodeAttribute.Color.value[2]);
    }

    if (nodeAttribute?.Intensity) {
      light.intensity = nodeAttribute.Intensity.value;
    }

    if (light instanceof SpotLight && nodeAttribute) {
      if (nodeAttribute.InnerAngle) {
        light.angle = nodeAttribute.InnerAngle.value * (Math.PI / 180);
      }
      if (nodeAttribute.OuterAngle) {
        light.penumbra = (nodeAttribute.OuterAngle.value - (nodeAttribute.InnerAngle?.value || 0)) / nodeAttribute.OuterAngle.value;
      }
    }

    return light;
  }

  // 解析网格
  private parseMesh (
    modelNode: FBXModelNode,
    geometryMap: Map<number, any>,
    materials: Map<number, any>,
    deformers: any
  ): Object3D | null {
    const connections = this.context.connections;
    const modelConnections = connections.get(modelNode.id || 0);

    if (!modelConnections) {return null;}

    // 查找几何体
    let geometry: BufferGeometry | null = null;
    let skeleton: FBXSkeleton | null = null;

    for (const connection of modelConnections.children) {
      const geometryData = geometryMap.get(connection.ID);

      if (geometryData) {
        geometry = geometryData.geometry;
        skeleton = geometryData.info.skeleton || null;

        break;
      }
    }

    if (!geometry) {return null;}

    // 查找材质
    let material: any = null;

    for (const connection of modelConnections.children) {
      const materialData = materials.get(connection.ID);

      if (materialData) {
        material = materialData.threeMaterial;

        break;
      }
    }

    // 创建网格
    let mesh: Mesh | SkinnedMesh;

    if (skeleton) {
      mesh = new SkinnedMesh(geometry, material);
      this.setupSkinning(mesh as SkinnedMesh, skeleton, deformers);
    } else {
      mesh = new Mesh(geometry, material);
    }

    return mesh;
  }

  // 设置蒙皮
  private setupSkinning (mesh: SkinnedMesh, skeleton: FBXSkeleton, deformers: any): void {
    const bones: Bone[] = [];
    const boneInverses: Matrix4[] = [];

    // 创建骨骼
    for (const rawBone of skeleton.rawBones) {
      const bone = new Bone();

      bone.name = rawBone.ID.toString();
      bone.matrix.copy(rawBone.transformLink);
      bone.matrixWorld.copy(bone.matrix);
      bones.push(bone);
      boneInverses.push(bone.matrix.clone().invert());
    }

    // 设置骨架
    const skeletonObj = new Skeleton(bones, boneInverses);

    mesh.bind(skeletonObj, mesh.matrixWorld);

    // 设置骨骼层次结构
    this.setupBoneHierarchy(bones, skeleton);
  }

  // 设置骨骼层次结构
  private setupBoneHierarchy (bones: Bone[], skeleton: FBXSkeleton): void {
    const connections = this.context.connections;

    for (let i = 0; i < bones.length; i++) {
      const bone = bones[i];
      const boneConnections = connections.get(parseInt(bone.name));

      if (boneConnections) {
        for (const connection of boneConnections.parents) {
          const parentBone = bones.find(b => b.name === connection.ID.toString());

          if (parentBone) {
            parentBone.add(bone);

            break;
          }
        }
      }
    }
  }

  // 解析变换数据
  private parseTransformData (modelNode: FBXModelNode): UserDataTransform {
    const transformData: UserDataTransform = {};

    // 解析平移
    if (modelNode.Lcl_Translation) {
      transformData.translation = modelNode.Lcl_Translation.value;
    }

    // 解析旋转
    if (modelNode.Lcl_Rotation) {
      transformData.rotation = modelNode.Lcl_Rotation.value;
    }

    // 解析缩放
    if (modelNode.Lcl_Scaling) {
      transformData.scale = modelNode.Lcl_Scaling.value;
    }

    // 解析预旋转
    if (modelNode.PreRotation) {
      transformData.preRotation = modelNode.PreRotation.value;
    }

    // 解析后旋转
    if (modelNode.PostRotation) {
      transformData.postRotation = modelNode.PostRotation.value;
    }

    // 解析旋转偏移
    if (modelNode.RotationOffset) {
      transformData.rotationOffset = modelNode.RotationOffset.value;
    }

    // 解析旋转轴心
    if (modelNode.RotationPivot) {
      transformData.rotationPivot = modelNode.RotationPivot.value;
    }

    // 解析缩放偏移
    if (modelNode.ScalingOffset) {
      transformData.scalingOffset = modelNode.ScalingOffset.value;
    }

    // 解析缩放轴心
    if (modelNode.ScalingPivot) {
      transformData.scalingPivot = modelNode.ScalingPivot.value;
    }

    // 解析欧拉角顺序
    if (modelNode.RotationOrder) {
      transformData.eulerOrder = getEulerOrder(modelNode.RotationOrder.value as any) as any;
    }

    // 解析继承类型
    if (modelNode.InheritType) {
      transformData.inheritType = modelNode.InheritType.value;
    }

    return transformData;
  }
}