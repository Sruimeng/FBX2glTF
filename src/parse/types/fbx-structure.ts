import type { Matrix4, Bone, Euler } from 'three';
import { Group } from 'three';

/**
 * FBX 基础结构类型定义
 */

// FBX 上下文参数
export interface FBXDocumentOptions {
  fbxTree: IFBXTree,
  fbxConnections: Map<number, FBXConnectionNode>,
  sceneGraph?: Group,
}

// FBX 树结构
export interface IFBXTree {
  FBXHeaderExtension?: FBXHeaderExtension,
  FileId?: FBXProperty,
  CreationTime?: FBXProperty,
  Creator?: FBXProperty,
  GlobalSettings?: FBXGlobalSettings,
  Documents?: FBXDocuments,
  References?: FBXProperty,
  Definitions?: FBXDefinitions,
  Objects?: FBXObjects,
  Connections?: FBXConnectionDocment | Map<number, FBXConnectionNode>,
  [key: string]: any,
}

// FBX 属性
export interface FBXProperty {
  singleProperty: boolean,
  propertyList: any[],
  name: string,
  value?: any,
  [key: string]: any,
}

// FBX 头部扩展
export interface FBXHeaderExtension {
  singleProperty?: boolean,
  FBXHeaderVersion?: number,
  FBXVersion?: number,
  EncryptionType?: number,
  CreationTimeStamp?: FBXTimeStamp,
  Creator?: string,
  SceneInfo?: FBXSceneInfo,
  propertyList?: any[],
  name?: string,
}

// FBX 连接文档
export interface FBXConnectionDocment {
  singleProperty: boolean,
  connections: Array<[string, number, number, ...string[]]>,
  propertyList: any[],
  name: string,
}

// FBX 时间戳
export interface FBXTimeStamp {
  singleProperty?: boolean,
  Version?: number,
  Year?: number,
  Month?: number,
  Day?: number,
  Hour?: number,
  Minute?: number,
  Second?: number,
  Millisecond?: number,
  propertyList?: any[],
  name?: string,
}

// FBX 场景信息
export interface FBXSceneInfo {
  singleProperty?: boolean,
  Type?: string,
  Version?: number,
  MetaData?: FBXMetaData,
  DocumentUrl?: FBXTypedProperty,
  SrcDocumentUrl?: FBXTypedProperty,
  Original?: FBXTypedProperty,
  LastSaved?: FBXTypedProperty,
  propertyList?: string[],
  name?: string,
  attrName?: string,
  [key: string]: any,
}

// FBX 元数据
export interface FBXMetaData {
  singleProperty?: boolean,
  Version?: number,
  Title?: string,
  Subject?: string,
  Author?: string,
  Keywords?: string,
  Revision?: string,
  Comment?: string,
  propertyList?: any[],
  name?: string,
}

// FBX 类型化属性
export interface FBXTypedProperty {
  type?: string,
  type2?: string,
  flag?: string,
  value?: any,
}

// FBX 全局设置
export interface FBXGlobalSettings {
  singleProperty?: boolean,
  Version?: number,
  UpAxis?: FBXTypedProperty,
  UpAxisSign?: FBXTypedProperty,
  FrontAxis?: FBXTypedProperty,
  FrontAxisSign?: FBXTypedProperty,
  CoordAxis?: FBXTypedProperty,
  CoordAxisSign?: FBXTypedProperty,
  OriginalUpAxis?: FBXTypedProperty,
  OriginalUpAxisSign?: FBXTypedProperty,
  UnitScaleFactor?: FBXTypedProperty,
  OriginalUnitScaleFactor?: FBXTypedProperty,
  AmbientColor?: FBXTypedProperty,
  DefaultCamera?: FBXTypedProperty,
  TimeMode?: FBXTypedProperty,
  TimeProtocol?: FBXTypedProperty,
  SnapOnFrameMode?: FBXTypedProperty,
  TimeSpanStart?: FBXTypedProperty,
  TimeSpanStop?: FBXTypedProperty,
  CustomFrameRate?: FBXTypedProperty,
  TimeMarker?: FBXTypedProperty,
  CurrentTimeMarker?: FBXTypedProperty,
  propertyList?: any[],
  name?: string,
  Properties70?: FBXProperties70,
}

// FBX 文档
export interface FBXDocuments {
  singleProperty?: boolean,
  Count?: number,
  Document?: Record<string, FBXDocument>,
  propertyList?: any[],
  name?: string,
}

// FBX 文档项
export interface FBXDocument {
  singleProperty?: boolean,
  SourceObject?: FBXTypedProperty,
  ActiveAnimStackName?: FBXTypedProperty,
  propertyList?: any[],
  name?: string,
  RootNode?: number,
  id?: number,
  attrType?: string,
  Properties70?: FBXProperties70,
}

// FBX 定义
export interface FBXDefinitions {
  singleProperty?: boolean,
  Version?: number,
  Count?: number,
  ObjectType?: Record<string, FBXObjectType>,
  propertyList?: string[],
  name?: string,
}

// FBX 对象类型
export interface FBXObjectType {
  singleProperty?: boolean,
  Count?: number,
  PropertyTemplate?: FBXPropertyTemplate,
  propertyList?: string[],
  name?: string,
  undefined?: FBXObjectType,
}

// FBX 属性模板
export interface FBXPropertyTemplate {
  singleProperty?: boolean,
  Description?: FBXTypedProperty,
  LocalStart?: FBXTypedProperty,
  LocalStop?: FBXTypedProperty,
  ReferenceStart?: FBXTypedProperty,
  ReferenceStop?: FBXTypedProperty,
  propertyList?: string[],
  name?: string,
  Properties70?: FBXProperties70,
}

// FBX 对象容器
export interface FBXObjects {
  singleProperty: boolean,
  Geometry?: Record<string, any>, // 从 geometry.ts 导入 FBXGeometryNode
  Model?: Record<string, FBXModelNode>,
  Material?: Record<string, any>, // 从 material.ts 导入 FBXMaterialNode
  Texture?: Record<string, any>, // 从 material.ts 导入 FBXTextureNode
  Video?: Record<string, any>, // 从 material.ts 导入 FBXVideoNode
  NodeAttribute?: Record<string, FBXNodeAttribute>,
  AnimationStack?: Record<string, any>, // 从 animation.ts 导入 FBXAnimationStack
  AnimationLayer?: Record<string, any>, // 从 animation.ts 导入 FBXAnimationLayer
  AnimationCurveNode?: Record<string, any>, // 从 animation.ts 导入 FBXAnimationCurveNode
  AnimationCurve?: Record<string, any>, // 从 animation.ts 导入 FBXAnimationCurve
  Deformer?: Record<string, FBXDeformer>,
  [key: string]: any,
  propertyList: any[],
  name: string,
}

// FBX 树节点基础接口
export interface FBXTreeNode {
  value?: FBXEulerOrder | string | number,
  ID?: number,
  id?: number,
  attrName?: string,
  attrType?: string,
  name?: string,
  propertyList?: any[],
  singleProperty?: boolean,
  version?: number,
  Properties70?: FBXProperties70,
}

// FBX 树节点详情
export interface FBXTreeNodeDetails extends FBXTreeNode {
  a: number[],
}

// FBX 连接节点
export interface FBXConnectionNode {
  parents: FBXConnectionReference[],
  children: FBXConnectionReference[],
}

// FBX 连接引用
export interface FBXConnectionReference {
  ID: number,
  relationship?: number | string,
}

// FBX 属性集合
export interface FBXProperties70 {
  singleProperty: boolean,
  P: FBXProperty70[],
  propertyList: any[],
  name: string,
}

// FBX 属性项
export interface FBXProperty70 {
  type: string,
  type2: string,
  flag: string,
  value: any,
}

// FBX 节点属性
export interface FBXNodeAttribute extends FBXTreeNode {
  CameraProjectionType?: FBXTreeNode,
  NearPlane?: FBXTreeNode,
  FarPlane?: FBXTreeNode,
  FocalLength?: FBXTreeNode,
  AspectWidth?: FBXTreeNode,
  AspectHeight?: FBXTreeNode,
  FieldOfView?: FBXTreeNode,
}

// FBX 模型节点
export interface FBXModelNode extends FBXTreeNode {
  LookAtProperty?: FBXTypedProperty,
  GeometricTranslation?: FBXTypedProperty,
  GeometricRotation?: FBXTypedProperty,
  GeometricScaling?: FBXTypedProperty,
  singleProperty?: boolean,
  ScalingOffset?: FBXTypedProperty,
  RotationOffset?: FBXTypedProperty,
  Lcl_Rotation?: FBXTypedProperty,
  PostRotation?: FBXTypedProperty,
  Version?: number,
  RotationPivot?: FBXTypedProperty,
  ScalingPivot?: FBXTypedProperty,
  RotationActive?: FBXTypedProperty,
  InheritType?: FBXTypedProperty,
  ScalingMax?: FBXTypedProperty,
  DefaultAttributeIndex?: FBXTypedProperty,
  currentUVSet?: FBXTypedProperty,
  RotationOrder?: FBXTreeNode,
  Shading?: boolean,
  Lcl_Translation?: FBXTypedProperty,
  Lcl_Scaling?: FBXTypedProperty,
  filmboxTypeID?: FBXTypedProperty,
  lockInfluenceWeights?: FBXTypedProperty,
  PreRotation?: FBXTypedProperty,
  Culling?: string,
  Properties70?: FBXProperties70,
}

// FBX 变形器
export interface FBXDeformer extends FBXTreeNode {
  Indexes?: FBXTreeNodeDetails,
  Weights?: FBXTreeNodeDetails,
  Transform?: FBXTreeNodeDetails,
  TransformLink?: FBXTreeNodeDetails,
}

// FBX 光照节点属性
export interface FBXLightNodeAttribute extends FBXNodeAttribute {
  CastShadows?: FBXTreeNode,
  LightType?: FBXTreeNode,
  Color?: FBXTreeNode,
  Intensity?: FBXTreeNode,
  InnerAngle?: FBXTreeNode,
  OuterAngle?: FBXTreeNode,
  CastLightOnObject?: FBXTreeNode,
  EnableFarAttenuation?: FBXTreeNode,
  FarAttenuationEnd?: FBXTreeNode,
}

// FBX 欧拉角顺序枚举
export enum FBXEulerOrder {
  'ZYX' = 0, // -> XYZ extrinsic
  'YZX' = 1, // -> XZY extrinsic
  'XZY' = 2, // -> YZX extrinsic
  'ZXY' = 3, // -> YXZ extrinsic
  'YXZ' = 4, // -> ZXY extrinsic
  'XYZ' = 5, // -> ZYX extrinsic
  'SphericXYZ' = 6, // not possible to support
}

// EulerOrder 类型兼容性定义
export type EulerOrder = FBXEulerOrder | Euler['order'];

// FBX 节点类型枚举
export enum FBXNodeType {
  MODEL = 'Model',
  GEOMETRY = 'Geometry',
  MATERIAL = 'Material',
  TEXTURE = 'Texture',
  VIDEO = 'Video',
  ANIMATION = 'Animation',
  DEFORMER = 'Deformer'
}

// FBX 变换数据
export interface FBXTransformData {
  postRotation?: number[],
  scalingOffset?: number[],
  scalingPivot?: number[],
  rotationOffset?: number[],
  rotationPivot?: number[],
  parentMatrixWorld?: Matrix4,
  parentMatrix?: Matrix4,
  eulerOrder?: EulerOrder | string,
  inheritType?: number,
  translation?: number[],
  rotation?: number[],
  scale?: number[],
  preRotation?: number[],
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
