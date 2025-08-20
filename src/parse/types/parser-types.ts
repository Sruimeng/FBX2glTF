// 解析器相关的类型定义
import type { BufferGeometry, Matrix4, Texture, AnimationClip } from 'three';
import { Group } from 'three';
import type { FBXConnectionNode, IFBXTree, FBXSkeleton, FBXMorphTarget, FBXMaterialNode, FBXTextureNode } from './fbx-types';

// 解析上下文
export interface ParseContext {
  fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
  sceneGraph: Group,
}

// 解析选项
export interface ParserOptions {
  textureLoader: any,
  manager: any,
}

// 解析结果
export interface ParserResult {
  scene: Group,
  animations: AnimationClip[],
  geometries: Map<number, GeometryData>,
  materials: Map<number, MaterialData>,
  textures: Map<number, TextureData>,
}

// 验证错误
export interface ValidationError {
  code: string,
  message: string,
  details?: any,
}

// 动画相关类型
export interface AnimationCurve {
  id: number,
  times: number[],
  values: number[],
}

export interface CurveNode {
  id: number,
  attr: string,
  curves: {
    x?: AnimationCurve,
    y?: AnimationCurve,
    z?: AnimationCurve,
    morph?: AnimationCurve,
  },
}

export interface AnimationNode {
  morphName?: string,
  DeformPercent?: CurveNode,
  S?: CurveNode,
  R?: CurveNode,
  T?: CurveNode,
  transform?: Matrix4,
  modelName: string,
  ID: number,
  eulerOrder?: string,
  preRotation?: [number, number, number],
  postRotation?: [number, number, number],
  initialPosition: number[],
  initialRotation: number[],
  initialScale: number[],
}

export interface RawClip {
  name: string,
  layer: AnimationNode[],
}

// 几何体相关类型
export interface GeoBufferInfo {
  dataSize: number,
  buffer: number[],
  indices: number[],
  mappingType: string,
  referenceType: string,
}

export interface GeoInfo {
  material?: GeoBufferInfo,
  vertexPositions?: number[],
  vertexIndices?: any[],
  baseVertexPositions?: number[],
  color?: GeoBufferInfo,
  normal?: GeoBufferInfo,
  uv?: GeoBufferInfo[],
  weightTable?: {
    [key: number]: Array<{ id: number, weight: number }>,
  },
  skeleton?: FBXSkeleton,
}

export interface GeometryData {
  id: number,
  geometry: BufferGeometry,
  info: GeoInfo,
}

export interface GeometryParseResult {
  geometries: Map<number, GeometryData>,
  skeletons: Map<number, FBXSkeleton>,
}

// 材质相关类型
export interface MaterialData {
  id: number,
  material: FBXMaterialNode,
  threeMaterial?: any,
  textures: Map<string, Texture>,
}

export interface TextureData {
  id: number,
  texture: FBXTextureNode,
  image?: HTMLImageElement | ArrayBuffer,
  threeTexture?: Texture,
}

export interface MaterialParseResult {
  materials: Map<number, MaterialData>,
  textures: Map<number, TextureData>,
}

// 变形器相关类型
export interface Deformers {
  skeletons: Record<number, FBXSkeleton>,
  morphTargets: Record<number, FBXMorphTarget>,
}

// 场景相关类型
export interface UserDataTransform {
  translation?: number[],
  rotation?: number[],
  scale?: number[],
  preRotation?: number[],
  postRotation?: number[],
  rotationOffset?: number[],
  rotationPivot?: number[],
  scalingOffset?: number[],
  scalingPivot?: number[],
  eulerOrder?: string,
  inheritType?: number,
  parentMatrix?: Matrix4,
  parentMatrixWorld?: Matrix4,
}

// 全局对象
export interface Global {
  fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
  sceneGraph: Group,
}

export const global: Global = {
  fbxTree: {},
  connections: new Map(),
  sceneGraph: new Group(),
};
