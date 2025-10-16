/**
 * @file /types/parsers/scene-parser.ts
 * @description 场景解析器类型定义
 */

import type * as THREE from 'three';
import type { FBXNode, FBXValue } from '../core/fbx-types';

/**
 * FBX 模型节点接口
 */
export interface FBXModelNode extends FBXNode {
  /** 模型类型 */
  Type: 'Model';
  /** 版本 */
  Version: number;
  /** 模型名称 */
  ModelName?: FBXValue<string>;
  /** 模型类型 */
  ModelType?: FBXValue<string>;
  /** 变换属性 */
  Properties?: FBXTransformProperties;
  /** 子节点 */
  Children?: number[];
  /** 父节点 */
  Parent?: number;
  /** 默认属性 */
  DefaultAttributeIndex?: FBXValue<number>;
}

/**
 * FBX 变换属性接口
 */
export interface FBXTransformProperties {
  /** 位置 */
  LclTranslation?: FBXValue<number[]>;
  /** 旋转 */
  LclRotation?: FBXValue<number[]>;
  /** 缩放 */
  LclScaling?: FBXValue<number[]>;
  /** 四元数旋转 */
  LclRotationQuaternion?: FBXValue<number[]>;
  /** 可见性 */
  Visibility?: FBXValue<boolean>;
  /** 继承类型 */
  InheritType?: FBXValue<number>;
}

/**
 * FBX 空节点接口
 */
export interface FBXNullNode extends FBXNode {
  /** 空节点类型 */
  Type: 'Null';
  /** 版本 */
  Version: number;
  /** 节点名称 */
  Name?: FBXValue<string>;
  /** 变换属性 */
  Properties?: FBXTransformProperties;
  /** 子节点 */
  Children?: number[];
  /** 父节点 */
  Parent?: number;
}

/**
 * FBX 骨骼节点接口
 */
export interface FBXBoneNode extends FBXNode {
  /** 骨骼类型 */
  Type: 'Skeleton' | 'Limb';
  /** 版本 */
  Version: number;
  /** 骨骼名称 */
  Name?: FBXValue<string>;
  /** 变换属性 */
  Properties?: FBXTransformProperties;
  /** 骨骼长度 */
  Size?: FBXValue<number>;
  /** 子骨骼 */
  Children?: number[];
  /** 父骨骼 */
  Parent?: number;
}

/**
 * FBX 摄像机节点接口
 */
export interface FCBCameraNode extends FBXNode {
  /** 摄像机类型 */
  Type: 'Camera';
  /** 版本 */
  Version: number;
  /** 摄像机名称 */
  Name?: FBXValue<string>;
  /** 摄像机属性 */
  Properties?: FCBCameraProperties;
  /** 视口信息 */
  ViewFrustum?: FBXViewFrustumProperties;
}

/**
 * FBX 摄像机属性接口
 */
export interface FCBCameraProperties {
  /** 视野角度 */
  FieldOfView?: FBXValue<number>;
  /** 近裁剪面 */
  NearPlane?: FBXValue<number>;
  /** 远裁剪面 */
  FarPlane?: FBXValue<number>;
  /** 焦距 */
  FocalLength?: FBXValue<number>;
  /** 胶片宽度 */
  FilmWidth?: FBXValue<number>;
  /** 胶片高度 */
  FilmHeight?: FBXValue<number>;
  /** 摄像机类型 */
  CameraType?: FBXValue<string>;
}

/**
 * FBX 视锥体属性接口
 */
export interface FBXViewFrustumProperties {
  /** 视锥体类型 */
  FrustumType?: FBXValue<string>;
  /** 正交投影宽度 */
  OrthoWidth?: FBXValue<number>;
  /** 正交投影高度 */
  OrthoHeight?: FBXValue<number>;
}

/**
 * FBX 灯光节点接口
 */
export interface FBXLightNode extends FBXNode {
  /** 灯光类型 */
  Type: 'Light';
  /** 版本 */
  Version: number;
  /** 灯光名称 */
  Name?: FBXValue<string>;
  /** 灯光属性 */
  Properties?: FBXLightProperties;
}

/**
 * FBX 灯光属性接口
 */
export interface FBXLightProperties {
  /** 灯光类型 */
  LightType?: FBXValue<string>;
  /** 颜色 */
  Color?: FBXValue<number[]>;
  /** 强度 */
  Intensity?: FBXValue<number>;
  /** 内锥角 */
  InnerAngle?: FBXValue<number>;
  /** 外锥角 */
  OuterAngle?: FBXValue<number>;
  /** 衰减 */
  Decay?: FBXValue<number>;
  /** 范围 */
  Range?: FBXValue<number>;
  /** 是否投射阴影 */
  CastShadows?: FBXValue<boolean>;
}

/**
 * 场景解析器输入接口
 */
export interface SceneParserInput {
  /** FBX 模型节点映射 */
  modelNodes: Map<number, FBXModelNode>;
  /** FBX 空节点映射 */
  nullNodes: Map<number, FBXNullNode>;
  /** FBX 骨骼节点映射 */
  boneNodes: Map<number, FBXBoneNode>;
  /** FBX 摄像机节点映射 */
  cameraNodes: Map<number, FCBCameraNode>;
  /** FBX 灯光节点映射 */
  lightNodes: Map<number, FBXLightNode>;
  /** 已解析的几何体 */
  geometries: Map<number, THREE.BufferGeometry>;
  /** 已解析的材质 */
  materials: Map<number, THREE.Material>;
  /** 已解析的骨骼 */
  skeletons: Map<number, THREE.Skeleton>;
  /** 节点层级关系 */
  hierarchy: Map<number, number[]>;
  /** 根节点ID */
  rootNodeIds: number[];
}

/**
 * 场景解析器输出接口
 */
export interface SceneParserOutput {
  /** Three.js 场景对象 */
  scene: THREE.Scene;
  /** 场景根对象 */
  root: THREE.Group;
  /** 场景元数据 */
  metadata: SceneMetadata;
  /** 解析统计 */
  stats: SceneParserStats;
}

/**
 * 场景元数据接口
 */
export interface SceneMetadata {
  /** 场景名称 */
  name: string;
  /** 场景版本 */
  version: string;
  /** 单位信息 */
  units: SceneUnits;
  /** 上方向向量 */
  upAxis: 'X' | 'Y' | 'Z';
  /** 前方向向量 */
  frontAxis: 'X' | 'Y' | 'Z';
  /** 坐标系类型 */
  coordSystem: 'right-handed' | 'left-handed';
}

/**
 * 场景单位信息接口
 */
export interface SceneUnits {
  /** 单位类型 */
  type: 'millimeters' | 'centimeters' | 'meters' | 'kilometers' | 'inches' | 'feet' | 'yards' | 'miles';
  /** 缩放因子 */
  scaleFactor: number;
  /** 单位名称 */
  name: string;
}

/**
 * 场景解析统计接口
 */
export interface SceneParserStats {
  /** 总节点数 */
  totalNodes: number;
  /** 模型节点数 */
  modelNodes: number;
  /** 空节点数 */
  nullNodes: number;
  /** 骨骼节点数 */
  boneNodes: number;
  /** 摄像机节点数 */
  cameraNodes: number;
  /** 灯光节点数 */
  lightNodes: number;
  /** 几何体数量 */
  geometryCount: number;
  /** 材质数量 */
  materialCount: number;
  /** 骨骼数量 */
  skeletonCount: number;
  /** 场景深度 */
  maxDepth: number;
}

/**
 * 场景解析器配置
 */
export interface SceneParserConfig {
  /** 是否应用全局变换 */
  applyGlobalTransform?: boolean;
  /** 全局缩放因子 */
  globalScale?: number;
  /** 是否翻转Y轴 */
  flipY?: boolean;
  /** 是否使用左手坐标系 */
  useLeftHanded?: boolean;
  /** 是否自动创建摄像机 */
  createCamera?: boolean;
  /** 是否自动创建环境光 */
  createAmbientLight?: boolean;
  /** 环境光颜色 */
  ambientLightColor?: THREE.Color;
  /** 环境光强度 */
  ambientLightIntensity?: number;
  /** 是否启用节点可见性 */
  enableVisibility?: boolean;
  /** 是否处理用户属性 */
  processUserData?: boolean;
}