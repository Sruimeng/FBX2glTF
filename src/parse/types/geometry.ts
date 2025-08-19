// 几何体相关类型定义
import type { BufferGeometry, Matrix4, Bone } from 'three';
import type { FBXTreeNode, FBXTreeNodeDetails, FBXProperty, FBXProperties70, FBXEulerOrder, EulerOrder } from './fbx-structure';

// 几何缓冲区信息
export interface GeoBufferInfo {
  dataSize: number,
  buffer: number[],
  indices: number[],
  mappingType: string,
  referenceType: string,
}

// 几何信息
export interface GeoInfo {
  material?: GeoBufferInfo,
  vertexPositions?: number[],
  vertexIndices?: any[],
  baseVertexPositions?: number[],
  color?: GeoBufferInfo,
  normal?: GeoBufferInfo,
  uv?: {
    dataSize: number,
    buffer: any[],
    indices: any[],
    mappingType: string,
    referenceType: string,
  }[],
  weightTable?: {
    [key: number]: Array<{ id: number, weight: number }>,
  },
  skeleton?: FBXSkeleton,
}

// 几何体数据
export interface GeometryData {
  id: number,
  geometry: BufferGeometry,
  info: GeoInfo,
}

// 几何体解析结果
export interface GeometryParseResult {
  geometries: Map<number, GeometryData>,
  skeletons: Map<number, FBXSkeleton>,
}

// FBX 层元素
export interface FBXLayerElement {
  singleProperty: boolean
  Version: number
  Name: string
  MappingInformationType: string
  ReferenceInformationType: string
  Normals?: FBXTreeNodeDetails
  NormalsW?: FBXProperty
  Binormals?: FBXProperty
  BinormalsW?: FBXProperty
  Tangents?: FBXProperty
  TangentsW?: FBXProperty
  Smoothing?: FBXProperty
  Materials?: FBXProperty
  propertyList: any[]
  id: number
  name: string
}

// FBX 层元素 UV
export interface FBXLayerElementUV extends FBXLayerElement {
  UV: FBXProperty
  UVIndex: FBXProperty
}

// FBX 层元素颜色
export interface FBXLayerElementColor extends FBXLayerElement {
  Colors: FBXTreeNodeDetails
  ColorIndex: FBXTreeNodeDetails
}

// FBX 层元素法线
export interface FBXLayerElementNormal extends FBXLayerElement {
  NormalIndex?: FBXTreeNodeDetails
  NormalsIndex?: FBXTreeNodeDetails
}

// FBX 层
export interface FBXLayer {
  singleProperty: boolean
  Version: number
  LayerElement: FBXLayerElementRef
  propertyList: any[]
  id: number
  name: string
}

// FBX 层元素引用
export interface FBXLayerElementRef {
  singleProperty: boolean
  Type: string
  TypedIndex: number
  propertyList: object[]
  name: string
  undefined?: FBXLayerElementRef
}

// FBX 骨架
export interface FBXSkeleton {
  ID: string
  rawBones: RawBone[]
  bones: Bone[]
  geometryID: number
}

// 原始骨骼
export interface RawBone {
  ID: number
  indices: number[]
  weights: number[]
  transformLink: Matrix4
}

// FBX 几何节点
export interface FBXGeometryNode {
  Order?: string
  Form?: string
  KnotVector?: FBXTreeNodeDetails
  Points?: FBXTreeNodeDetails
  LayerElementColor?: any
  attrName: string
  singleProperty: boolean
  Vertices?: FBXProperty
  Indexes?: FBXProperty
  PolygonVertexIndex?: FBXProperty
  GeometryVersion?: number
  LayerElementNormal?: {
    [id: string]: FBXLayerElement
  }
  LayerElementBinormal?: {
    [id: string]: FBXLayerElement
  }
  LayerElementTangent?: {
    [id: string]: FBXLayerElement
  }
  LayerElementUV?: {
    [id: string]: FBXLayerElementUV
  }
  LayerElementSmoothing?: {
    [id: string]: FBXLayerElement
  }
  LayerElementMaterial?: {
    [id: string]: FBXLayerElement
  }
  Layer?: {
    [id: string]: FBXLayer
  }
  Properties70?: FBXProperties70
  propertyList: any[]
  id: number
  attrType: string
  name: string
}

// FBX 网格节点
export interface FBXMeshNode extends FBXTreeNode {
  DeformPercent: FBXTreeNodeDetails
  FullWeights: FBXTreeNodeDetails
  Indexes?: FBXTreeNodeDetails
  Transform?: FBXTreeNodeDetails
  TransformLink?: FBXTreeNodeDetails
  UserData?: FBXTreeNodeDetails
  Weights?: FBXTreeNodeDetails
  Material?: FBXTreeNodeDetails
  Matrix?: FBXTreeNodeDetails
  Node?: number
}

// FBX 姿势节点
export interface FBXPoseNode extends FBXTreeNode {
  PoseNode: FBXMeshNode | FBXMeshNode[] | Record<string, FBXMeshNode>[]
  NbPoseNodes: number
}

// FBX 变形器集合
export interface Deformers {
  skeletons: Record<number, FBXSkeleton>
  morphTargets: Record<number, FBXMorphTarget>
}

// FBX 形态目标
export interface FBXMorphTarget {
  id: string
  rawTargets?: FBXRawTargets[]
  skeleton?: FBXSkeleton
}

// FBX 原始目标
export interface FBXRawTargets {
  geoID?: number
  name: string
  initialWeight: FBXTreeNodeDetails
  id: number
  fullWeights: number[]
}

// 用户数据变换
export interface UserDataTransform {
  translation?: number[]
  rotation?: number[]
  scale?: number[]
  preRotation?: number[]
  postRotation?: number[]
  rotationOffset?: number[]
  rotationPivot?: number[]
  scalingOffset?: number[]
  scalingPivot?: number[]
  eulerOrder?: EulerOrder
  inheritType?: number
  parentMatrix?: Matrix4
  parentMatrixWorld?: Matrix4
}

// FBX 映射信息类型
export enum MappingInformationType {
  BY_POLYGON_VERTEX = 'ByPolygonVertex',
  BY_POLYGON = 'ByPolygon',
  BY_VERTEX = 'ByVertex',
  BY_EDGE = 'ByEdge',
  ALL_SAME = 'AllSame'
}

// FBX 引用信息类型
export enum ReferenceInformationType {
  DIRECT = 'Direct',
  INDEX_TO_DIRECT = 'IndexToDirect'
}

// FBX 层元素类型
export enum LayerElementType {
  NORMAL = 'LayerElementNormal',
  BINORMAL = 'LayerElementBinormal',
  TANGENT = 'LayerElementTangent',
  UV = 'LayerElementUV',
  COLOR = 'LayerElementColor',
  MATERIAL = 'LayerElementMaterial',
  SMOOTHING = 'LayerElementSmoothing'
}
