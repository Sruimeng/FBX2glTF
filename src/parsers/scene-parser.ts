/**
 * @file /parsers/scene-parser.ts
 * @description 场景解析器实现
 */

import * as THREE from 'three';
import type {
  IParsingContext,
  IParser,
  BaseParser,
  ParserMetadata,
} from '../types/core';
import type {
  SceneParserInput,
  SceneParserOutput,
  SceneMetadata,
  SceneStats,
  SceneUnits,
  SceneParserConfig,
} from '../types/parsers/scene-parser';
import type {
  FBXModelNode,
  FBXNullNode,
  FBXBoneNode,
  FCBCameraNode,
  FBXLightNode,
} from '../types/parsers/scene-parser';
import { MatrixUtils } from '../utils/transform/matrix-utils';

/**
 * 场景解析器
 * 负责解析 FBX 场景结构并构建完整的 Three.js 场景
 */
export class SceneParser extends BaseParser<SceneParserInput, SceneParserOutput> {
  private config: SceneParserConfig;

  constructor (context: IParsingContext, config?: SceneParserConfig) {
    super(context, {
      name: 'SceneParser',
      version: '1.0.0',
      description: '解析 FBX 场景结构并构建 Three.js 场景',
      dependencies: ['THREE', 'MatrixUtils'],
    });

    this.config = {
      applyGlobalTransform: true,
      globalScale: 1.0,
      flipY: true,
      useLeftHanded: false,
      createCamera: true,
      createAmbientLight: true,
      ambientLightColor: new THREE.Color(0x404040),
      ambientLightIntensity: 0.5,
      enableVisibility: true,
      processUserData: true,
      ...config,
    };
  }

  /**
   * 解析场景
   */
  parse (input: SceneParserInput, context: IParsingContext): SceneParserOutput {
    const { modelNodes, nullNodes, boneNodes, cameraNodes, lightNodes, geometries, materials, skeletons, hierarchy, rootNodeIds } = input;

    this.log('开始解析 FBX 场景');

    try {
      // 创建场景和根对象
      const { scene, root } = this.createScene();

      // 解析场景元数据
      const metadata = this.parseSceneMetadata();

      // 构建场景层级结构
      this.buildSceneHierarchy(
        scene,
        root,
        modelNodes,
        nullNodes,
        boneNodes,
        cameraNodes,
        lightNodes,
        geometries,
        materials,
        skeletons,
        hierarchy,
        rootNodeIds
      );

      // 应用全局变换
      if (this.config.applyGlobalTransform) {
        this.applyGlobalTransform(root);
      }

      // 创建默认摄像机
      if (this.config.createCamera && this.getCameraCount(scene) === 0) {
        this.createDefaultCamera(scene);
      }

      // 创建默认环境光
      if (this.config.createAmbientLight && this.getLightCount(scene) === 0) {
        this.createDefaultAmbientLight(scene);
      }

      // 生成场景统计
      const stats = this.generateSceneStats(scene, input);

      const output: SceneParserOutput = {
        scene,
        root,
        metadata,
        stats,
      };

      this.log(`成功解析场景: ${stats.totalNodes} 节点`);

      return output;

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 创建场景和根对象
   */
  private createScene (): { scene: THREE.Scene, root: THREE.Group } {
    const scene = new THREE.Scene();

    scene.name = 'FBX_Scene';

    const root = new THREE.Group();

    root.name = 'FBX_Root';

    scene.add(root);

    return { scene, root };
  }

  /**
   * 解析场景元数据
   */
  private parseSceneMetadata (): SceneMetadata {
    // 从 FBX 全局设置中解析元数据
    // 在实际实现中，需要解析 FBX 的全局设置节点

    return {
      name: 'FBX_Scene',
      version: '1.0',
      units: {
        type: 'meters',
        scaleFactor: 1.0,
        name: 'meter',
      },
      upAxis: 'Y',
      frontAxis: '-Z',
      coordSystem: 'right-handed',
    };
  }

  /**
   * 构建场景层级结构
   */
  private buildSceneHierarchy (
    scene: THREE.Scene,
    root: THREE.Group,
    modelNodes: Map<number, FBXModelNode>,
    nullNodes: Map<number, FBXNullNode>,
    boneNodes: Map<number, FBXBoneNode>,
    cameraNodes: Map<number, FCBCameraNode>,
    lightNodes: Map<number, FBXLightNode>,
    geometries: Map<number, THREE.BufferGeometry>,
    materials: Map<number, THREE.Material>,
    skeletons: Map<number, THREE.Skeleton>,
    hierarchy: Map<number, number[]>,
    rootNodeIds: number[]
  ): void {
    // 创建节点映射
    const allNodes = new Map<number, FBXModelNode | FBXNullNode | FBXBoneNode | FCBCameraNode | FBXLightNode>();

    modelNodes.forEach((node, id) => allNodes.set(id, node));
    nullNodes.forEach((node, id) => allNodes.set(id, node));
    boneNodes.forEach((node, id) => allNodes.set(id, node));
    cameraNodes.forEach((node, id) => allNodes.set(id, node));
    lightNodes.forEach((node, id) => allNodes.set(id, node));

    // 处理根节点
    const processedNodes = new Set<number>();
    const rootObjects: THREE.Object3D[] = [];

    rootNodeIds.forEach(rootId => {
      const rootObject = this.processNode(
        rootId,
        allNodes,
        geometries,
        materials,
        skeletons,
        hierarchy,
        processedNodes
      );

      if (rootObject) {
        rootObjects.push(rootObject);
        root.add(rootObject);
      }
    });

    // 如果没有明确指定根节点，选择最顶层的节点作为根
    if (rootObjects.length === 0 && allNodes.size > 0) {
      this.findRootNodes(allNodes, hierarchy).forEach(rootId => {
        const rootObject = this.processNode(
          rootId,
          allNodes,
          geometries,
          materials,
          skeletons,
          hierarchy,
          processedNodes
        );

        if (rootObject) {
          root.add(rootObject);
        }
      });
    }

    this.log(`构建场景层级: ${root.children.length} 个根节点`);
  }

  /**
   * 处理节点
   */
  private processNode (
    nodeId: number,
    allNodes: Map<number, FBXModelNode | FBXNullNode | FBXBoneNode | FCBCameraNode | FBXLightNode>,
    geometries: Map<number, THREE.BufferGeometry>,
    materials: Map<number, THREE.Material>,
    skeletons: Map<number, THREE.Skeleton>,
    hierarchy: Map<number, number[]>,
    processedNodes: Set<number>
  ): THREE.Object3D | null {
    if (processedNodes.has(nodeId)) {
      return null;
    }

    const nodeData = allNodes.get(nodeId);

    if (!nodeData) {
      this.log(`节点 ${nodeId} 数据不存在`, 'warn');

      return null;
    }

    processedNodes.add(nodeId);

    // 根据节点类型创建 Three.js 对象
    let object: THREE.Object3D;

    if (this.isModelNode(nodeData)) {
      object = this.createModelObject(nodeData as FBXModelNode, geometries, materials, skeletons);
    } else if (this.isBoneNode(nodeData)) {
      object = this.createBoneObject(nodeData as FBXBoneNode);
    } else if (this.isCameraNode(nodeData)) {
      object = this.createCameraObject(nodeData as FCBCameraNode);
    } else if (this.isLightNode(nodeData)) {
      object = this.createLightObject(nodeData as FBXLightNode);
    } else {
      object = this.createNullObject(nodeData as FBXNullNode);
    }

    // 设置变换属性
    this.setTransformProperties(object, nodeData);

    // 设置可见性
    if (this.config.enableVisibility) {
      this.setVisibility(object, nodeData);
    }

    // 处理用户数据
    if (this.config.processUserData) {
      this.setUserData(object, nodeData);
    }

    // 递归处理子节点
    const childIds = hierarchy.get(nodeId) || [];

    childIds.forEach(childId => {
      const childObject = this.processNode(
        childId,
        allNodes,
        geometries,
        materials,
        skeletons,
        hierarchy,
        processedNodes
      );

      if (childObject) {
        object.add(childObject);
      }
    });

    return object;
  }

  /**
   * 创建模型对象
   */
  private createModelObject (
    modelNode: FBXModelNode,
    geometries: Map<number, THREE.BufferGeometry>,
    materials: Map<number, THREE.Material>,
    skeletons: Map<number, THREE.Skeleton>
  ): THREE.Object3D {
    const object = new THREE.Object3D();

    object.name = modelNode.ModelName?.value || `Model_${Object.id}`;

    // 检查是否是网格
    const geometryId = this.getGeometryId(modelNode);

    if (geometryId && geometries.has(geometryId)) {
      const geometry = geometries.get(geometryId)!;
      const materialId = this.getMaterialId(modelNode);
      const material = materialId && materials.has(materialId) ? materials.get(materialId) : new THREE.MeshStandardMaterial();

      const mesh = new THREE.Mesh(geometry, material);

      mesh.name = object.name;
      mesh.userData = { ...object.userData, isMesh: true };

      // 检查是否需要蒙皮
      if (skeletons.has(geometryId)) {
        const skeleton = skeletons.get(geometryId)!;

        mesh.bind(new THREE.Skeleton(skeleton.bones, skeleton.boneInverses));
        mesh.userData = { ...mesh.userData, isSkinned: true };
      }

      return mesh;
    }

    return object;
  }

  /**
   * 创建骨骼对象
   */
  private createBoneObject (boneNode: FBXBoneNode): THREE.Bone {
    const bone = new THREE.Bone();

    bone.name = boneNode.Name?.value || `Bone_${bone.id}`;

    return bone;
  }

  /**
   * 创建摄像机对象
   */
  private createCameraObject (cameraNode: FCBCameraNode): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    const name = cameraNode.Name?.value || `Camera_${cameraNode.id}`;

    // 解析摄像机属性
    const props = cameraNode.Properties;
    const fov = props?.FieldOfView?.value || 60;
    const near = props?.NearPlane?.value || 0.1;
    const far = props?.FarPlane?.value || 1000;

    // 根据摄像机类型创建
    const cameraType = props?.CameraType?.value || 'perspective';
    let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

    if (cameraType === 'orthographic') {
      const orthoWidth = props?.OrthoWidth?.value || 10;
      const orthoHeight = props?.OrthoHeight?.value || 10;

      camera = new THREE.OrthographicCamera(
        -orthoWidth / 2, orthoWidth / 2,
        orthoHeight / 2, -orthoHeight / 2,
        near, far
      );
    } else {
      camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    }

    camera.name = name;

    return camera;
  }

  /**
   * 创建灯光对象
   */
  private createLightObject (lightNode: FBXLightNode): THREE.Light {
    const name = lightNode.Name?.value || `Light_${lightNode.id}`;
    const props = lightNode.Properties;

    const lightType = props?.LightType?.value || 'point';
    const color = this.parseColor(props?.Color?.value);
    const intensity = props?.Intensity?.value || 1;

    let light: THREE.Light;

    switch (lightType.toLowerCase()) {
      case 'directional':
        light = new THREE.DirectionalLight(color, intensity);

        break;
      case 'spot':
        const angle = props?.OuterAngle?.value || Math.PI / 4;
        const penumbra = props?.InnerAngle?.value || 0;

        light = new THREE.SpotLight(color, intensity, 0, angle, penumbra);

        break;
      case 'ambient':
        light = new THREE.AmbientLight(color, intensity);

        break;
      case 'point':
      default:
        light = new THREE.PointLight(color, intensity);

        break;
    }

    light.name = name;

    return light;
  }

  /**
   * 创建空对象
   */
  private createNullObject (nullNode: FBXNullNode): THREE.Object3D {
    const object = new THREE.Object3D();

    object.name = nullNode.Name?.value || `Null_${nullNode.id}`;
    object.userData = { isNull: true };

    return object;
  }

  /**
   * 设置变换属性
   */
  private setTransformProperties (object: THREE.Object3D, nodeData: any): void {
    const properties = nodeData.Properties;

    if (!properties) {return;}

    // 位置
    if (properties.LclTranslation?.value) {
      const translation = properties.LclTranslation.value;

      if (Array.isArray(translation) && translation.length >= 3) {
        object.position.set(translation[0], translation[1], translation[2]);
      }
    }

    // 旋转
    if (properties.LclRotation?.value) {
      const rotation = properties.LclRotation.value;

      if (Array.isArray(rotation) && rotation.length >= 3) {
        // FBX 使用度数，转换为弧度
        object.rotation.x = rotation[0] * Math.PI / 180;
        object.rotation.y = rotation[1] * Math.PI / 180;
        object.rotation.z = rotation[2] * Math.PI / 180;
      }
    }

    // 缩放
    if (properties.LclScaling?.value) {
      const scaling = properties.LclScaling.value;

      if (Array.isArray(scaling) && scaling.length >= 3) {
        object.scale.set(scaling[0], scaling[1], scaling[2]);
      }
    }

    // 四元数旋转（如果存在）
    if (properties.LclRotationQuaternion?.value) {
      const quaternion = properties.LclRotationQuaternion.value;

      if (Array.isArray(quaternion) && quaternion.length >= 4) {
        object.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
      }
    }
  }

  /**
   * 设置可见性
   */
  private setVisibility (object: THREE.Object3D, nodeData: any): void {
    const properties = nodeData.Properties;

    if (properties?.Visibility?.value !== undefined) {
      object.visible = Boolean(properties.Visibility.value);
    }
  }

  /**
   * 设置用户数据
   */
  private setUserData (object: THREE.Object3D, nodeData: any): void {
    object.userData = {
      ...object.userData,
      fbxId: nodeData.id,
      fbxType: nodeData.Type,
      fbxName: nodeData.Name?.value,
      properties: nodeData.Properties,
    };
  }

  /**
   * 查找根节点
   */
  private findRootNodes (
    allNodes: Map<number, any>,
    hierarchy: Map<number, number[]>
  ): number[] {
    const allNodeIds = Array.from(allNodes.keys());
    const childNodeIds = new Set<number>();

    // 收集所有子节点ID
    hierarchy.forEach(childIds => {
      childIds.forEach(id => childNodeIds.add(id));
    });

    // 根节点是没有父节点的节点
    return allNodeIds.filter(id => !childNodeIds.has(id));
  }

  /**
   * 应用全局变换
   */
  private applyGlobalTransform (root: THREE.Group): void {
    // 应用全局缩放
    root.scale.multiplyScalar(this.config.globalScale!);

    // 如果需要翻转Y轴
    if (this.config.flipY) {
      root.rotation.x = Math.PI;
    }

    // 如果使用左手坐标系
    if (this.config.useLeftHanded) {
      root.scale.x *= -1;
    }
  }

  /**
   * 创建默认摄像机
   */
  private createDefaultCamera (scene: THREE.Scene): void {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

    camera.name = 'DefaultCamera';
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    scene.add(camera);
  }

  /**
   * 创建默认环境光
   */
  private createDefaultAmbientLight (scene: THREE.Scene): void {
    const ambientLight = new THREE.AmbientLight(
      this.config.ambientLightColor,
      this.config.ambientLightIntensity
    );

    ambientLight.name = 'DefaultAmbientLight';
    scene.add(ambientLight);
  }

  /**
   * 生成场景统计
   */
  private generateSceneStats (scene: THREE.Scene, input: SceneParserInput): SceneStats {
    const stats: SceneStats = {
      totalNodes: 0,
      modelNodes: 0,
      nullNodes: 0,
      boneNodes: 0,
      cameraNodes: 0,
      lightNodes: 0,
      geometryCount: input.geometries.size,
      materialCount: input.materials.size,
      skeletonCount: input.skeletons.size,
      maxDepth: 0,
    };

    // 递归计算节点统计
    this.calculateNodeStats(scene, stats, 0);

    return stats;
  }

  /**
   * 递归计算节点统计
   */
  private calculateNodeStats (object: THREE.Object3D, stats: SceneStats, depth: number): void {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (object.userData.fbxType) {
      switch (object.userData.fbxType) {
        case 'Model':
          stats.modelNodes++;

          break;
        case 'Null':
          stats.nullNodes++;

          break;
        case 'Skeleton':
          stats.boneNodes++;

          break;
        case 'Camera':
          stats.cameraNodes++;

          break;
        case 'Light':
          stats.lightNodes++;

          break;
      }
    }

    object.children.forEach(child => {
      this.calculateNodeStats(child, stats, depth + 1);
    });
  }

  // 辅助方法
  private isModelNode (node: any): boolean {
    return node.Type === 'Model';
  }

  private isBoneNode (node: any): boolean {
    return node.Type === 'Skeleton' || node.Type === 'Limb';
  }

  private isCameraNode (node: any): boolean {
    return node.Type === 'Camera';
  }

  private isLightNode (node: any): boolean {
    return node.Type === 'Light';
  }

  private getGeometryId (modelNode: FBXModelNode): number | undefined {
    // 在实际实现中，需要解析连接关系
    return undefined;
  }

  private getMaterialId (modelNode: FBXModelNode): number | undefined {
    // 在实际实现中，需要解析连接关系
    return undefined;
  }

  private parseColor (colorValue: any): THREE.Color {
    if (Array.isArray(colorValue) && colorValue.length >= 3) {
      return new THREE.Color(colorValue[0], colorValue[1], colorValue[2]);
    }

    return new THREE.Color(0xffffff);
  }

  private getCameraCount (scene: THREE.Scene): number {
    let count = 0;

    scene.traverse(object => {
      if (object instanceof THREE.Camera) {count++;}
    });

    return count;
  }

  private getLightCount (scene: THREE.Scene): number {
    let count = 0;

    scene.traverse(object => {
      if (object instanceof THREE.Light) {count++;}
    });

    return count;
  }

  /**
   * 验证输入数据
   */
  protected validateInput (input: SceneParserInput): void {
    super.validateInput(input);

    if (!input.modelNodes) {
      throw new Error('模型节点映射不能为空');
    }
  }

  /**
   * 获取配置
   */
  public getConfig (): SceneParserConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig (newConfig: Partial<SceneParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('更新场景解析器配置');
  }
}

/**
 * 场景解析器工厂
 */
export class SceneParserFactory {
  private defaultConfig: SceneParserConfig;

  constructor (defaultConfig?: SceneParserConfig) {
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 创建场景解析器实例
   */
  create (context: IParsingContext, config?: SceneParserConfig): SceneParser {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return new SceneParser(context, mergedConfig);
  }

  /**
   * 获取默认配置
   */
  public getDefaultConfig (): SceneParserConfig {
    return { ...this.defaultConfig };
  }
}
