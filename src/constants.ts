import type { Bone, EulerOrder, Matrix4 } from 'three';
import type { Group } from 'three';

// FBX 上下文参数
export interface FBXDocumentOptions {
  fbxConnections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree,
  sceneGraph?: Group,
}

export interface IFBXTree {
  [key: string]: unknown,
  Connections?: FBXConnectionDocment,
  CreationTime?: FBXProperty,
  Creator?: FBXProperty,
  Definitions?: FBXDefinitions,
  Documents?: FBXDocuments,
  FBXHeaderExtension?: FBXHeaderExtension,
  FileId?: FBXProperty,
  GlobalSettings?: FBXGlobalSettings,
  Objects?: FBXObjects,
  References?: FBXProperty,
}

export interface FBXProperty {
  [key: string]: unknown,
  name: string,
  propertyList: object[],
  singleProperty: boolean,
}

export interface FBXHeaderExtension {
  CreationTimeStamp: FBXTimeStamp,
  Creator: string,
  EncryptionType: number,
  FBXHeaderVersion: number,
  FBXVersion: number,
  name: string,
  propertyList: unknown[],
  SceneInfo: FBXSceneInfo,
  singleProperty: boolean,
}

export interface FBXConnectionDocment extends FBXPropertyTemplate {
  connections: [number, number, string][],
}

export interface FBXTimeStamp {
  Day: number,
  Hour: number,
  Millisecond: number,
  Minute: number,
  Month: number,
  name: string,
  propertyList: unknown[],
  Second: number,
  singleProperty: boolean,
  Version: number,
  Year: number,
}

export interface FBXSceneInfo {
  [key: string]: unknown,
  attrName: string,
  DocumentUrl: FBXTypedProperty,
  LastSaved: FBXTypedProperty,
  MetaData: FBXMetaData,
  name: string,
  Original: FBXTypedProperty,
  propertyList: string[],
  singleProperty: boolean,
  SrcDocumentUrl: FBXTypedProperty,
  Type: string,
  Version: number,
}

export interface FBXMetaData {
  Author: string,
  Comment: string,
  Keywords: string,
  name: string,
  propertyList: unknown[],
  Revision: string,
  singleProperty: boolean,
  Subject: string,
  Title: string,
  Version: number,
}

export interface FBXTypedProperty {
  flag: string,
  type: string,
  type2?: string,
  value?: string | number | number[] | boolean,
}

export interface FBXGlobalSettings {
  AmbientColor: FBXTypedProperty,
  CoordAxis: FBXTypedProperty,
  CoordAxisSign: FBXTypedProperty,
  CurrentTimeMarker: FBXTypedProperty,
  CustomFrameRate: FBXTypedProperty,
  DefaultCamera: FBXTypedProperty,
  FrontAxis: FBXTypedProperty,
  FrontAxisSign: FBXTypedProperty,
  name: string,
  OriginalUnitScaleFactor: FBXTypedProperty,
  OriginalUpAxis: FBXTypedProperty,
  OriginalUpAxisSign: FBXTypedProperty,
  propertyList: unknown[],
  singleProperty: boolean,
  SnapOnFrameMode: FBXTypedProperty,
  TimeMarker: FBXTypedProperty,
  TimeMode: FBXTypedProperty,
  TimeProtocol: FBXTypedProperty,
  TimeSpanStart: FBXTypedProperty,
  TimeSpanStop: FBXTypedProperty,
  UnitScaleFactor: FBXTypedProperty,
  UpAxis: FBXTypedProperty,
  UpAxisSign: FBXTypedProperty,
  Version: number,
}

export interface FBXDocuments {
  Count: number,
  Document: {
    [id: string]: FBXDocument,
  },
  name: string,
  propertyList: unknown[],
  singleProperty: boolean,
}

export interface FBXDocument {
  ActiveAnimStackName: FBXTypedProperty,
  attrType: string,
  id: number,
  name: string,
  propertyList: unknown[],
  RootNode: number,
  singleProperty: boolean,
  SourceObject: FBXTypedProperty,
}

export interface FBXDefinitions {
  Count: number,
  name: string,
  ObjectType: {
    [key: string]: FBXObjectType,
  },
  propertyList: string[],
  singleProperty: boolean,
  Version: number,
}

export interface FBXObjectType {
  Count: number,
  name: string,
  propertyList: string[],
  PropertyTemplate?: FBXPropertyTemplate,
  singleProperty: boolean,
  undefined?: FBXObjectType,
}

export interface FBXPropertyTemplate {
  Description: FBXTypedProperty,
  LocalStart: FBXTypedProperty,
  LocalStop: FBXTypedProperty,
  name: string,
  propertyList: string[],
  ReferenceStart: FBXTypedProperty,
  ReferenceStop: FBXTypedProperty,
  singleProperty: boolean,
}
export interface FBXRawTargets {
  fullWeights: number[],
  geoID?: number,
  id: number,
  initialWeight: FBXTreeNodeDetails,
  name: string,
}
export interface FBXMorphTarget {
  id: string,
  rawTargets?: FBXRawTargets[],
  skeleton?: FBXSkeleton,
}
export interface UserDataTransform {
  eulerOrder?: EulerOrder,
  inheritType?: number,
  parentMatrix?: Matrix4,
  parentMatrixWorld?: Matrix4,
  postRotation?: number[],
  preRotation?: number[],
  rotation?: number[],
  rotationOffset?: number[],
  rotationPivot?: number[],
  scale?: number[],
  scalingOffset?: number[],
  scalingPivot?: number[],
  translation?: number[],
}

export interface FBXSkeleton {
  bones: Bone[],
  geometryID: number,
  ID: string,
  rawBones: RawBone[],
}

export interface RawBone {
  ID: number,
  indices: number[],
  transformLink: Matrix4,
  weights: number[],
}

export interface FBXPoseNode extends FBXTreeNode {
  NbPoseNodes: number,
  PoseNode: FBXMeshNode | FBXMeshNode[] | Record<string, FBXMeshNode>[],
}

export interface Deformers {
  morphTargets: Record<number, FBXMorphTarget>,
  skeletons: Record<number, FBXSkeleton>,
}

export interface FBXNodeAttribute extends FBXTreeNode {
  AspectHeight?: FBXTreeNode,
  AspectWidth?: FBXTreeNode,
  CameraProjectionType?: FBXTreeNode,
  FarPlane?: FBXTreeNode,
  FieldOfView?: FBXTreeNode,
  FocalLength?: FBXTreeNode,
  NearPlane?: FBXTreeNode,
}

export interface FBXAnimationCurveNode extends FBXTreeNode {
  KeyTime: FBXTreeNodeDetails,
  KeyValueFloat: FBXTreeNodeDetails,
}

export interface FBXLightNodeAttribute extends FBXNodeAttribute {
  CastLightOnObject?: FBXTreeNode,
  CastShadows?: FBXTreeNode,
  Color?: FBXTreeNode,
  EnableFarAttenuation?: FBXTreeNode,
  FarAttenuationEnd?: FBXTreeNode,
  InnerAngle?: FBXTreeNode,
  Intensity?: FBXTreeNode,
  LightType?: FBXTreeNode,
  OuterAngle?: FBXTreeNode,
}

export interface FBXObjects {
  [key: string]: unknown,
  AnimationCurve?: Record<string, FBXAnimationCurveNode>,
  AnimationCurveNode?: Record<string, FBXAnimationCurveNode>,
  Deformer?: Record<string, FBXDeformer>,
  Geometry?: {
    [id: string]: FBXGeometryNode,
  },
  LayeredTexture?: Record<string, FBXLayer>,
  Material?: Record<string, FBXMaterialNode>,
  Model?: Record<string, FBXModelNode>,
  name: string,
  NodeAttribute?: Record<string, FBXNodeAttribute>,
  Pose?: Record<string, FBXPoseNode>,
  propertyList: unknown[],
  singleProperty: boolean,
  Texture?: Record<string, FBXTextureNode>,
  Video?: Record<string, FBXVideoNode>,
}

export interface FBXDeformer {
  attrName: string,
  attrType?: string,
  id?: number,
  // 添加其他可能的属性，如 type, indices 等，根据 FBX 规范
}

export interface FBXGeometryNode {
  attrName: string,
  attrType: string,
  Form?: string,
  GeometryVersion: number,
  id: number,
  Indexes?: FBXProperty,
  KnotVector?: FBXTreeNodeDetails,
  Layer?: {
    [id: string]: FBXLayer,
  },
  LayerElementBinormal?: {
    [id: string]: FBXLayerElement,
  },
  LayerElementColor: FBXLayerElementColor[],
  LayerElementMaterial?: {
    [id: string]: FBXMaterialNode,
  },
  LayerElementNormal?: {
    [id: string]: FBXLayerElement,
  },
  LayerElementSmoothing?: {
    [id: string]: FBXLayerElement,
  },
  LayerElementTangent?: {
    [id: string]: FBXLayerElement,
  },
  LayerElementUV?: {
    [id: string]: FBXLayerElementUV,
  },
  name: string,
  Order?: string,
  Points?: FBXTreeNodeDetails,
  PolygonVertexIndex: FBXProperty,
  propertyList: unknown[],
  singleProperty: boolean,
  Vertices: FBXProperty,
}

export interface FBXLayerElement {
  Binormals?: FBXProperty,
  BinormalsW?: FBXProperty,
  id: number,
  MappingInformationType: string,
  Materials?: FBXProperty,
  Name: string,
  name: string,
  Normals?: FBXTreeNodeDetails,
  NormalsW?: FBXProperty,
  propertyList: unknown[],
  ReferenceInformationType: string,
  singleProperty: boolean,
  Smoothing?: FBXProperty,
  Tangents?: FBXProperty,
  TangentsW?: FBXProperty,
  Version: number,
}

export interface FBXLayerElementUV extends FBXLayerElement {
  UV: FBXProperty,
  UVIndex: FBXProperty,
}

export interface FBXLayerElementColor extends FBXLayerElement {
  ColorIndex: FBXTreeNodeDetails,
  Colors: FBXTreeNodeDetails,
}
export interface FBXLayerElementNormal extends FBXLayerElement {
  NormalIndex?: FBXTreeNodeDetails,
  NormalsIndex?: FBXTreeNodeDetails,
}

export interface FBXLayer {
  id: number,
  LayerElement: FBXLayerElementRef,
  name: string,
  propertyList: unknown[],
  singleProperty: boolean,
  Version: number,
}

export interface FBXLayerElementRef {
  name: string,
  propertyList: object[],
  singleProperty: boolean,
  Type: string,
  TypedIndex: number,
  undefined?: FBXLayerElementRef,
}

export interface FBXMaterial {
  Ambient: FBXTypedProperty,
  AmbientColor: FBXTypedProperty,
  attrName: string,
  Diffuse: FBXTypedProperty,
  DiffuseColor: FBXTypedProperty,
  DiffuseFactor: FBXTypedProperty,
  Emissive: FBXTypedProperty,
  id: number,
  MultiLayer: number,
  name: string,
  Opacity: FBXTypedProperty,
  propertyList: object[],
  ShadingModel: string,
  singleProperty: boolean,
  TransparencyFactor: FBXTypedProperty,
  Version: number,
}

export interface FBXTransformData {
  eulerOrder?: string,
  inheritType?: number,
  parentMatrix?: Matrix4,
  parentMatrixWorld?: Matrix4,
  postRotation?: number[],
  preRotation?: number[],
  rotation?: number[],
  rotationOffset?: number[],
  rotationPivot?: number[],
  scale?: number[],
  scalingOffset?: number[],
  scalingPivot?: number[],
  translation?: number[],
}

export interface FBXConnectionNode {
  children: FBXConnectionReference[],
  parents: FBXConnectionReference[],
}

export interface FBXTreeNode {
  a?: number[],
  attrName?: string,
  attrType?: string,
  ID?: number,
  id?: number,
  name?: string,
  propertyList?: string[],
  singleProperty?: boolean,
  value?: FBXEulerOrder | string | number,
  version?: number,
}

export interface FBXConnectionReference {
  ID: number,
  relationship?: number | string, // 可能是OO或OP等关系类型
}

export interface FBXTreeNodeDetails extends FBXTreeNode {
  a: number[],
}

export interface FBXMeshNode extends FBXTreeNode {
  DeformPercent: FBXTreeNodeDetails,
  FullWeights: FBXTreeNodeDetails,
  Indexes?: FBXTreeNodeDetails,
  Material?: FBXTreeNodeDetails,
  Matrix?: FBXTreeNodeDetails,
  Node?: number,
  Transform?: FBXTreeNodeDetails,
  TransformLink?: FBXTreeNodeDetails,
  UserData?: FBXTreeNodeDetails,
  Weights?: FBXTreeNodeDetails,
}

export interface FBXModelNode extends FBXTreeNode {
  Culling: string,
  currentUVSet: FBXTypedProperty,
  DefaultAttributeIndex: FBXTypedProperty,
  filmboxTypeID: FBXTypedProperty,
  GeometricRotation: FBXTypedProperty,
  GeometricScaling: FBXTypedProperty,
  GeometricTranslation: FBXTypedProperty,
  InheritType: FBXTypedProperty,
  Lcl_Rotation: FBXTypedProperty,
  Lcl_Scaling: FBXTypedProperty,
  Lcl_Translation: FBXTypedProperty,
  lockInfluenceWeights: FBXTypedProperty,
  LookAtProperty?: string,
  PostRotation: FBXTypedProperty,
  PreRotation: FBXTypedProperty,
  RotationActive: FBXTypedProperty,
  RotationOffset: FBXTypedProperty,
  RotationOrder: FBXTreeNode,
  RotationPivot: FBXTypedProperty,
  ScalingMax: FBXTypedProperty,
  ScalingOffset: FBXTypedProperty,
  ScalingPivot: FBXTypedProperty,
  Shading: boolean,
  singleProperty: boolean,
  Version: number,
}

/**
 * FBX文件中纹理节点的接口定义
 */
export interface FBXTextureNode {
  /** 属性名称 */
  attrName: string,
  /** 属性类型 */
  attrType: string,
  /** 纹理文件的完整路径 */
  FileName: string,
  /** 唯一标识符 */
  id: number,
  /** 媒体文件名 */
  Media: string,

  /** 节点名称 */
  name: string,

  /** 属性列表，通常包含 [id, 名称, 类型] */
  propertyList: Array<number | string>,

  /** 相对路径的文件名 */
  RelativeFilename: string,

  Scaling: FBXTypedProperty,

  /** 是否为单一属性 */
  singleProperty: boolean,

  /** 纹理名称，通常描述纹理用途 */
  TextureName: string,

  Translation: FBXTypedProperty,

  /** 纹理类型 */
  Type: string,

  /** 使用材质的标志 */
  UseMaterial: {
    flag: string,
    type: string,
    type2: string,
    value: number,
  },

  /** 版本号 */
  Version: number,

  WrapModeU: {
    value: number,
  },

  WrapModeV: {
    value: number,
  }, // Added back the WrapModeV property
}

export interface FBXVideoNode {
  attrName: string,
  attrType: string,
  // 主要属性
  Content: ArrayBuffer,
  Filename: string,

  // 标志和值
  flag: string,
  // 标识信息
  id: number,
  name: string,
  Path: string,

  // 属性列表，通常包含 [id, 文件名, 类型]
  propertyList: Array<string | number>,
  RelativeFilename: string,
  // 是否为单一属性
  singleProperty: boolean,

  // 类型标识
  Type: string,
  type: string,
  type2: string,

  UseMipMap: number,

  value: string,
}

export interface FBXConnectionDocment {
  from: number,
  relationship?: number,
  to: number,
}

// FBX连接类型
export enum FBXConnectionType {
  OBJECT_OBJECT = 'OO', // 对象到对象的连接
  OBJECT_PROPERTY = 'OP', // 对象到属性的连接
}

/**
 * FBX材质节点中颜色或数值属性的通用接口
 */
export interface IFBXPropertyValue<T> {
  /** 标志 */
  flag: string,
  /** 属性类型 */
  type: string,
  /** 次级类型 */
  type2: string,
  /** 属性值 */
  value: T,
}

/**
 * FBX文件中材质节点的接口定义
 */
export interface FBXMaterialNode {
  /** 环境光颜色 */
  AmbientColor: IFBXPropertyValue<number[]>,
  /** 环境光因子 */
  AmbientFactor: IFBXPropertyValue<number>,
  /** 属性名称 */
  attrName: string,
  /** 属性类型 */
  attrType: string,
  /** 凹凸因子 */
  BumpFactor: IFBXPropertyValue<number>,
  Diffuse: IFBXPropertyValue<number[]>,
  /** 漫反射颜色 */
  DiffuseColor: IFBXPropertyValue<number[]>,
  DisplacementFactor: IFBXPropertyValue<number[] | number>,
  Emissive: IFBXPropertyValue<number[]>,
  /** 自发光颜色 */
  EmissiveColor: IFBXPropertyValue<number[]>,
  /** 自发光因子 */
  EmissiveFactor: IFBXPropertyValue<string>,

  /** 唯一标识符 */
  id: number,

  MappingInformationType: string,

  Materials: FBXProperty,

  /** 是否多层 */
  MultiLayer: number,

  /** 节点名称 */
  name: string,

  Opacity: IFBXPropertyValue<string>,

  /** 属性列表，通常包含 [id, 名称, 类型] */
  propertyList: Array<number | string>,

  ReferenceInformationType: string,

  /** 反射颜色 */
  ReflectionColor: IFBXPropertyValue<number[]>,

  /** 反射因子 */
  ReflectionFactor: IFBXPropertyValue<number>,

  /** 着色模型类型 */
  ShadingModel: IFBXPropertyValue<string>,

  /** 光泽度 */
  Shininess: IFBXPropertyValue<number>,

  /** 光泽度指数 */
  ShininessExponent: IFBXPropertyValue<number>,

  /** 是否为单一属性 */
  singleProperty: boolean,

  Specular: IFBXPropertyValue<number[]>,

  /** 镜面颜色 */
  SpecularColor: IFBXPropertyValue<number[]>,

  /** 镜面因子 */
  SpecularFactor: IFBXPropertyValue<number>,

  TransparencyFactor: IFBXPropertyValue<string>,

  TransparentColor: IFBXPropertyValue<string[]>,

  /** 版本号 */
  Version: number,
}

export enum FBXEulerOrder {
  SphericXYZ = 6, // not possible to support
  XYZ = 5, // -> ZYX extrinsic
  XZY = 2, // -> YZX extrinsic
  YXZ = 4, // -> ZXY extrinsic
  YZX = 1, // -> XZY extrinsic
  ZXY = 3, // -> YXZ extrinsic
  ZYX = 0, // -> XYZ extrinsic
}

// FBX节点类型枚举
export enum FBXNodeType {
  ANIMATION = 'Animation',
  DEFORMER = 'Deformer',
  GEOMETRY = 'Geometry',
  MATERIAL = 'Material',
  MODEL = 'Model',
  TEXTURE = 'Texture',
  VIDEO = 'Video',
}

// FBX材质属性类型
export enum FBXMaterialPropertyType {
  AMBIENT = 'Ambient',
  DIFFUSE = 'Diffuse',
  EMISSIVE = 'Emissive',
  REFLECTIVITY = 'Reflectivity',
  SHININESS = 'Shininess',
  SPECULAR = 'Specular',
}

// FBX映射信息类型
export enum MappingInformationType {
  ALL_SAME = 'AllSame',
  BY_EDGE = 'ByEdge',
  BY_POLYGON = 'ByPolygon',
  BY_POLYGON_VERTEX = 'ByPolygonVertex',
  BY_VERTEX = 'ByVertex',
}

// FBX引用信息类型
export enum ReferenceInformationType {
  DIRECT = 'Direct',
  INDEX_TO_DIRECT = 'IndexToDirect',
}

// FBX层元素类型
export enum LayerElementType {
  BINORMAL = 'LayerElementBinormal',
  COLOR = 'LayerElementColor',
  MATERIAL = 'LayerElementMaterial',
  NORMAL = 'LayerElementNormal',
  SMOOTHING = 'LayerElementSmoothing',
  TANGENT = 'LayerElementTangent',
  UV = 'LayerElementUV',
}

export interface Global {
  connections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree,
  sceneGraph: Group,
  wireframe?: boolean,
}

// FBXTree holds a representation of the FBX data, returned by the TextParser ( FBX ASCII format)
// and BinaryParser( FBX Binary format)
export class FBXTree implements IFBXTree {
  FBXHeaderExtension?: FBXHeaderExtension;
  FileId?: FBXProperty;
  CreationTime?: FBXProperty;
  Creator?: FBXProperty;
  GlobalSettings?: FBXGlobalSettings;
  Documents?: FBXDocuments;
  References?: FBXProperty;
  Definitions?: FBXDefinitions;
  Objects?: FBXObjects;
  Connections?: FBXConnectionDocment;
  [key: string]: unknown; // 添加索引签名
  connections?: FBXConnectionNode[];
  add (key: string, val: unknown) {
    this[key] = val;
  }
}
