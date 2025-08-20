// FBX 特定的类型定义
import type { Matrix4, Bone, Euler } from 'three';

// FBX 树结构
export interface IFBXTree {
  FBXHeaderExtension?: FBXHeaderExtension;
  FileId?: FBXProperty;
  CreationTime?: FBXProperty;
  Creator?: FBXProperty;
  GlobalSettings?: FBXGlobalSettings;
  Documents?: FBXDocuments;
  References?: FBXProperty;
  Definitions?: FBXDefinitions;
  Objects?: FBXObjects;
  Connections?: FBXConnectionDocment | Map<number, FBXConnectionNode>;
  [key: string]: any;
}

// FBX 属性
export interface FBXProperty {
  singleProperty: boolean;
  propertyList: any[];
  name: string;
  value?: any;
  [key: string]: any;
}

// FBX 头部扩展
export interface FBXHeaderExtension {
  singleProperty?: boolean;
  FBXHeaderVersion?: number;
  FBXVersion?: number;
  EncryptionType?: number;
  CreationTimeStamp?: FBXTimeStamp;
  Creator?: string;
  SceneInfo?: FBXSceneInfo;
  propertyList?: any[];
  name?: string;
}

// FBX 时间戳
export interface FBXTimeStamp {
  singleProperty?: boolean;
  Version?: number;
  Year?: number;
  Month?: number;
  Day?: number;
  Hour?: number;
  Minute?: number;
  Second?: number;
  Millisecond?: number;
  propertyList?: any[];
  name?: string;
}

// FBX 场景信息
export interface FBXSceneInfo {
  singleProperty?: boolean;
  Type?: string;
  Version?: number;
  MetaData?: FBXMetaData;
  DocumentUrl?: FBXTypedProperty;
  SrcDocumentUrl?: FBXTypedProperty;
  Original?: FBXTypedProperty;
  LastSaved?: FBXTypedProperty;
  propertyList?: string[];
  name?: string;
  attrName?: string;
  [key: string]: any;
}

// FBX 元数据
export interface FBXMetaData {
  singleProperty?: boolean;
  Version?: number;
  Title?: string;
  Subject?: string;
  Author?: string;
  Keywords?: string;
  Revision?: string;
  Comment?: string;
  propertyList?: any[];
  name?: string;
}

// FBX 类型化属性
export interface FBXTypedProperty {
  type?: string;
  type2?: string;
  flag?: string;
  value?: any;
}

// FBX 全局设置
export interface FBXGlobalSettings {
  singleProperty?: boolean;
  Version?: number;
  UpAxis?: FBXTypedProperty;
  UpAxisSign?: FBXTypedProperty;
  FrontAxis?: FBXTypedProperty;
  FrontAxisSign?: FBXTypedProperty;
  CoordAxis?: FBXTypedProperty;
  CoordAxisSign?: FBXTypedProperty;
  OriginalUpAxis?: FBXTypedProperty;
  OriginalUpAxisSign?: FBXTypedProperty;
  UnitScaleFactor?: FBXTypedProperty;
  OriginalUnitScaleFactor?: FBXTypedProperty;
  AmbientColor?: FBXTypedProperty;
  DefaultCamera?: FBXTypedProperty;
  TimeMode?: FBXTypedProperty;
  TimeProtocol?: FBXTypedProperty;
  SnapOnFrameMode?: FBXTypedProperty;
  TimeSpanStart?: FBXTypedProperty;
  TimeSpanStop?: FBXTypedProperty;
  CustomFrameRate?: FBXTypedProperty;
  TimeMarker?: FBXTypedProperty;
  CurrentTimeMarker?: FBXTypedProperty;
  propertyList?: any[];
  name?: string;
  Properties70?: FBXProperties70;
}

// FBX 文档
export interface FBXDocuments {
  singleProperty?: boolean;
  Count?: number;
  Document?: Record<string, FBXDocument>;
  propertyList?: any[];
  name?: string;
}

// FBX 文档项
export interface FBXDocument {
  singleProperty?: boolean;
  SourceObject?: FBXTypedProperty;
  ActiveAnimStackName?: FBXTypedProperty;
  propertyList?: any[];
  name?: string;
  RootNode?: number;
  id?: number;
  attrType?: string;
  Properties70?: FBXProperties70;
}

// FBX 定义
export interface FBXDefinitions {
  singleProperty?: boolean;
  Version?: number;
  Count?: number;
  ObjectType?: Record<string, FBXObjectType>;
  propertyList?: string[];
  name?: string;
}

// FBX 对象类型
export interface FBXObjectType {
  singleProperty?: boolean;
  Count?: number;
  PropertyTemplate?: FBXPropertyTemplate;
  propertyList?: string[];
  name?: string;
  undefined?: FBXObjectType;
}

// FBX 属性模板
export interface FBXPropertyTemplate {
  singleProperty?: boolean;
  Description?: FBXTypedProperty;
  LocalStart?: FBXTypedProperty;
  LocalStop?: FBXTypedProperty;
  ReferenceStart?: FBXTypedProperty;
  ReferenceStop?: FBXTypedProperty;
  propertyList?: string[];
  name?: string;
  Properties70?: FBXProperties70;
}

// FBX 对象容器
export interface FBXObjects {
  singleProperty: boolean;
  Geometry?: Record<string, FBXGeometryNode>;
  Model?: Record<string, FBXModelNode>;
  Material?: Record<string, FBXMaterialNode>;
  Texture?: Record<string, FBXTextureNode>;
  Video?: Record<string, FBXVideoNode>;
  NodeAttribute?: Record<string, FBXNodeAttribute>;
  AnimationStack?: Record<string, FBXAnimationStack>;
  AnimationLayer?: Record<string, FBXAnimationLayer>;
  AnimationCurveNode?: Record<string, FBXAnimationCurveNode>;
  AnimationCurve?: Record<string, FBXAnimationCurve>;
  Deformer?: Record<string, FBXDeformer>;
  [key: string]: any;
  propertyList: any[];
  name: string;
}

// FBX 树节点基础接口
export interface FBXTreeNode {
  value?: FBXEulerOrder | string | number;
  ID?: number;
  id?: number;
  attrName?: string;
  attrType?: string;
  name?: string;
  propertyList?: any[];
  singleProperty?: boolean;
  version?: number;
  Properties70?: FBXProperties70;
}

// FBX 树节点详情
export interface FBXTreeNodeDetails extends FBXTreeNode {
  a: number[];
}

// FBX 连接节点
export interface FBXConnectionNode {
  parents: FBXConnectionReference[];
  children: FBXConnectionReference[];
}

// FBX 连接引用
export interface FBXConnectionReference {
  ID: number;
  relationship?: number | string;
}

// FBX 属性集合
export interface FBXProperties70 {
  singleProperty: boolean;
  P: FBXProperty70[];
  propertyList: any[];
  name: string;
}

// FBX 属性项
export interface FBXProperty70 {
  type: string;
  type2: string;
  flag: string;
  value: any;
}

// FBX 节点属性
export interface FBXNodeAttribute {
  CameraProjectionType?: FBXTreeNode;
  NearPlane?: FBXTreeNode;
  FarPlane?: FBXTreeNode;
  FocalLength?: FBXTreeNode;
  AspectWidth?: FBXTreeNode;
  AspectHeight?: FBXTreeNode;
  FieldOfView?: FBXTreeNode;
}

// FBX 模型节点
export interface FBXModelNode extends FBXTreeNode {
  LookAtProperty?: FBXTypedProperty;
  GeometricTranslation?: FBXTypedProperty;
  GeometricRotation?: FBXTypedProperty;
  GeometricScaling?: FBXTypedProperty;
  singleProperty?: boolean;
  ScalingOffset?: FBXTypedProperty;
  RotationOffset?: FBXTypedProperty;
  Lcl_Rotation?: FBXTypedProperty;
  PostRotation?: FBXTypedProperty;
  Version?: number;
  RotationPivot?: FBXTypedProperty;
  ScalingPivot?: FBXTypedProperty;
  RotationActive?: FBXTypedProperty;
  InheritType?: FBXTypedProperty;
  ScalingMax?: FBXTypedProperty;
  DefaultAttributeIndex?: FBXTypedProperty;
  currentUVSet?: FBXTypedProperty;
  RotationOrder?: FBXTreeNode;
  Shading?: boolean;
  Lcl_Translation?: FBXTypedProperty;
  Lcl_Scaling?: FBXTypedProperty;
  filmboxTypeID?: FBXTypedProperty;
  lockInfluenceWeights?: FBXTypedProperty;
  PreRotation?: FBXTypedProperty;
  Culling?: string;
  Properties70?: FBXProperties70;
}

// FBX 变形器
export interface FBXDeformer extends FBXTreeNode {
  Indexes?: FBXTreeNodeDetails;
  Weights?: FBXTreeNodeDetails;
  Transform?: FBXTreeNodeDetails;
  TransformLink?: FBXTreeNodeDetails;
}

// FBX 光照节点属性
export interface FBXLightNodeAttribute extends FBXNodeAttribute {
  CastShadows?: FBXTreeNode;
  LightType?: FBXTreeNode;
  Color?: FBXTreeNode;
  Intensity?: FBXTreeNode;
  InnerAngle?: FBXTreeNode;
  OuterAngle?: FBXTreeNode;
  CastLightOnObject?: FBXTreeNode;
  EnableFarAttenuation?: FBXTreeNode;
  FarAttenuationEnd?: FBXTreeNode;
}

// FBX 欧拉角顺序枚举
export enum FBXEulerOrder {
  ZYX = 0,
  YZX = 1,
  XZY = 2,
  ZXY = 3,
  YXZ = 4,
  XYZ = 5,
  SphericXYZ = 6
}

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

// FBX 连接文档
export interface FBXConnectionDocment {
  singleProperty: boolean;
  connections: Array<[string, number, number, ...string[]]>;
  propertyList: any[];
  name: string;
}

// 动画相关类型
export interface FBXAnimationStack extends FBXTreeNode {
  Properties70?: FBXProperties70;
}

export interface FBXAnimationLayer extends FBXTreeNode {
  Properties70?: FBXProperties70;
}

export interface FBXAnimationCurveNode extends FBXTreeNode {
  KeyTime: FBXTreeNodeDetails;
  KeyValueFloat: FBXTreeNodeDetails;
}

export interface FBXAnimationCurve extends FBXTreeNode {
  KeyTime: FBXTreeNodeDetails;
  KeyValueFloat: FBXTreeNodeDetails;
  KeyAttrFlags: FBXTreeNodeDetails;
  KeyAttrDataFloat: FBXTreeNodeDetails;
}

// 几何体相关类型
export interface FBXGeometryNode extends FBXTreeNode {
  Order?: string;
  Form?: string;
  KnotVector?: FBXTreeNodeDetails;
  Points?: FBXTreeNodeDetails;
  LayerElementColor?: any;
  attrName: string;
  singleProperty: boolean;
  Vertices?: FBXProperty;
  Indexes?: FBXProperty;
  PolygonVertexIndex?: FBXProperty;
  GeometryVersion?: number;
  LayerElementNormal?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementBinormal?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementTangent?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementUV?: {
    [id: string]: FBXLayerElementUV;
  };
  LayerElementSmoothing?: {
    [id: string]: FBXLayerElement;
  };
  LayerElementMaterial?: {
    [id: string]: FBXLayerElement;
  };
  Layer?: {
    [id: string]: FBXLayer;
  };
  Properties70?: FBXProperties70;
  propertyList: any[];
  id: number;
  attrType: string;
  name: string;
}

export interface FBXLayerElement {
  singleProperty: boolean;
  Version: number;
  Name: string;
  MappingInformationType: string;
  ReferenceInformationType: string;
  Normals?: FBXTreeNodeDetails;
  NormalsW?: FBXProperty;
  Binormals?: FBXProperty;
  BinormalsW?: FBXProperty;
  Tangents?: FBXProperty;
  TangentsW?: FBXProperty;
  Smoothing?: FBXProperty;
  Materials?: FBXProperty;
  propertyList: any[];
  id: number;
  name: string;
}

export interface FBXLayerElementUV extends FBXLayerElement {
  UV: FBXProperty;
  UVIndex: FBXProperty;
}

export interface FBXLayer {
  singleProperty: boolean;
  Version: number;
  LayerElement: FBXLayerElementRef;
  propertyList: any[];
  id: number;
  name: string;
}

export interface FBXLayerElementRef {
  singleProperty: boolean;
  Type: string;
  TypedIndex: number;
  propertyList: object[];
  name: string;
  undefined?: FBXLayerElementRef;
}

// 材质相关类型
export interface FBXMaterialNode extends FBXTreeNode {
  MappingInformationType?: string;
  ReferenceInformationType?: string;
  Materials?: any;
  Diffuse?: IFBXPropertyValue<number[]>;
  DisplacementFactor?: IFBXPropertyValue<number[] | number>;
  Emissive?: IFBXPropertyValue<number[]>;
  TransparencyFactor?: IFBXPropertyValue<string>;
  Opacity?: IFBXPropertyValue<string>;
  TransparentColor?: IFBXPropertyValue<string[]>;
  Specular?: IFBXPropertyValue<number[]>;
  id?: number;
  attrName?: string;
  attrType?: string;
  singleProperty?: boolean;
  name?: string;
  Version?: number;
  ShadingModel?: IFBXPropertyValue<string>;
  MultiLayer?: number;
  DiffuseColor?: IFBXPropertyValue<number[]>;
  EmissiveColor?: IFBXPropertyValue<number[]>;
  EmissiveFactor?: IFBXPropertyValue<string>;
  AmbientColor?: IFBXPropertyValue<number[]>;
  AmbientFactor?: IFBXPropertyValue<number>;
  BumpFactor?: IFBXPropertyValue<number>;
  SpecularColor?: IFBXPropertyValue<number[]>;
  SpecularFactor?: IFBXPropertyValue<number>;
  Shininess?: IFBXPropertyValue<number>;
  ShininessExponent?: IFBXPropertyValue<number>;
  ReflectionColor?: IFBXPropertyValue<number[]>;
  ReflectionFactor?: IFBXPropertyValue<number>;
  propertyList?: Array<number | string>;
  Properties70?: FBXProperties70;
}

export interface IFBXPropertyValue<T> {
  type: string;
  type2: string;
  flag: string;
  value: T;
}

export interface FBXTextureNode extends FBXTreeNode {
  WrapModeU?: FBXTypedProperty;
  Scaling?: FBXTypedProperty;
  WrapModeV?: FBXTypedProperty;
  Translation?: FBXTypedProperty;
  FileName?: string;
  Media?: string;
  RelativeFilename?: string;
  TextureName?: string;
  Type?: string;
  UseMaterial?: FBXTypedProperty;
  Version?: number;
  attrName?: string;
  attrType?: string;
  id?: number;
  name?: string;
  propertyList?: Array<number | string>;
  singleProperty?: boolean;
  Properties70?: FBXProperties70;
}

export interface FBXVideoNode extends FBXTreeNode {
  Content?: ArrayBuffer;
  Filename?: string;
  RelativeFilename?: string;
  Path?: string;
  Type?: string;
  type?: string;
  type2?: string;
  attrType?: string;
  flag?: string;
  value?: string;
  UseMipMap?: number;
  id?: number;
  name?: string;
  attrName?: string;
  propertyList?: Array<string | number>;
  singleProperty?: boolean;
  Properties70?: FBXProperties70;
}
```</think>
You are an expert engineer and your task is to write a new file from scratch.

You must respond with the file's content wrapped in triple backticks (```).
The backticks should be on their own line.
The text you output will FBX2glTF/src/parse/types/parser-types.ts
</file_path>

<edit_description>
创建解析器相关的类型定义
</edit_description>
```ts
// 解析器相关的类型定义
import type { BufferGeometry, Object3D, Matrix4, Texture, AnimationClip, Group } from 'three';
import type { FBXConnectionNode, IFBXTree, FBXTreeNode, FBXTransformData, FBXSkeleton, FBXMorphTarget } from './fbx-types';

// 解析上下文
export interface ParseContext {
  fbxTree: IFBXTree;
  connections: Map<number, FBXConnectionNode>;
  sceneGraph: Group;
}

// 解析选项
export interface ParserOptions {
  textureLoader: any;
  manager: any;
}

// 解析结果
export interface ParserResult {
  scene: Group;
  animations: AnimationClip[];
  geometries: Map<number, GeometryData>;
  materials: Map<number, MaterialData>;
  textures: Map<number, TextureData>;
}

// 验证错误
export interface ValidationError {
  code: string;
  message: string;
  details?: any;
}

// 动画相关类型
export interface AnimationCurve {
  id: number;
  times: number[];
  values: number[];
}

export interface CurveNode {
  id: number;
  attr: string;
  curves: {
    x?: AnimationCurve;
    y?: AnimationCurve;
    z?: AnimationCurve;
    morph?: AnimationCurve;
  };
}

export interface AnimationNode {
  morphName?: string;
  DeformPercent?: CurveNode;
  S?: CurveNode;
  R?: CurveNode;
  T?: CurveNode;
  transform?: Matrix4;
  modelName: string;
  ID: number;
  eulerOrder?: string;
  preRotation?: [number, number, number];
  postRotation?: [number, number, number];
  initialPosition: number[];
  initialRotation: number[];
  initialScale: number[];
}

export interface RawClip {
  name: string;
  layer: AnimationNode[];
}

// 几何体相关类型
export interface GeoBufferInfo {
  dataSize: number;
  buffer: number[];
  indices: number[];
  mappingType: string;
  referenceType: string;
}

export interface GeoInfo {
  material?: GeoBufferInfo;
  vertexPositions?: number[];
  vertexIndices?: any[];
  baseVertexPositions?: number[];
  color?: GeoBufferInfo;
  normal?: GeoBufferInfo;
  uv?: GeoBufferInfo[];
  weightTable?: {
    [key: number]: Array<{ id: number; weight: number }>;
  };
  skeleton?: FBXSkeleton;
}

export interface GeometryData {
  id: number;
  geometry: BufferGeometry;
  info: GeoInfo;
}

export interface GeometryParseResult {
  geometries: Map<number, GeometryData>;
  skeletons: Map<number, FBXSkeleton>;
}

export interface RawBone {
  ID: number;
  indices: number[];
  weights: number[];
  transformLink: Matrix4;
}

export interface FBXMorphTarget {
  id: string;
  rawTargets?: FBXRawTargets[];
  skeleton?: FBXSkeleton;
}

export interface FBXRawTargets {
  geoID?: number;
  name: string;
  initialWeight: FBXTreeNodeDetails;
  id: number;
  fullWeights: number[];
}

// 材质相关类型
export interface MaterialData {
  id: number;
  material: FBXMaterialNode;
  threeMaterial?: any;
  textures: Map<string, Texture>;
}

export interface TextureData {
  id: number;
  texture: FBXTextureNode;
  image?: HTMLImageElement | ArrayBuffer;
  threeTexture?: Texture;
}

export interface MaterialParseResult {
  materials: Map<number, MaterialData>;
  textures: Map<number, TextureData>;
}

// 变形器相关类型
export interface Deformers {
  skeletons: Record<number, FBXSkeleton>;
  morphTargets: Record<number, FBXMorphTarget>;
}

// 场景相关类型
export interface UserDataTransform {
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  preRotation?: number[];
  postRotation?: number[];
  rotationOffset?: number[];
  rotationPivot?: number[];
  scalingOffset?: number[];
  scalingPivot?: number[];
  eulerOrder?: string;
  inheritType?: number;
  parentMatrix?: Matrix4;
  parentMatrixWorld?: Matrix4;
}

// 全局对象
export interface Global {
  fbxTree: IFBXTree;
  connections: Map<number, FBXConnectionNode>;
  sceneGraph: Group;
}

export const global: Global = {
  fbxTree: {},
  connections: new Map(),
  sceneGraph: new Group(),
};
```</think>
You are an expert engineer and your task is to write a new file from scratch.

You must respond with the file's content wrapped in triple backticks (```).
The backticks should be on their own line.
The text you output will be FBX2glTF/src/parse/types/common-types.ts
</file_path>

<edit_description>
创建通用的类型定义
</edit_description>
```ts
// 通用的类型定义
import type { TextureLoader, LoadingManager, Group } from 'three';
import type { IFBXTree, FBXConnectionNode } from './fbx-types';

// FBX 上下文参数
export interface FBXDocumentOptions {
  fbxTree: IFBXTree;
  fbxConnections: Map<number, FBXConnectionNode>;
  sceneGraph?: Group;
}

// 解析器选项
export interface ParserOptions {
  textureLoader: TextureLoader;
  manager: LoadingManager;
}

// 解析上下文
export interface ParseContext {
  fbxTree: IFBXTree;
  connections: Map<number, FBXConnectionNode>;
  sceneGraph: Group;
}

// 解析结果
export interface ParserResult {
  scene: Group;
  animations: any[];
  geometries: Map<number, any>;
  materials: Map<number, any>;
  textures: Map<number, any>;
}

// 验证错误
export interface ValidationError {
  code: string;
  message: string;
  details?: any;
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

// FBX 材质属性类型
export enum FBXMaterialPropertyType {
  EMISSIVE = 'Emissive',
  AMBIENT = 'Ambient',
  DIFFUSE = 'Diffuse',
  SPECULAR = 'Specular',
  SHININESS = 'Shininess',
  REFLECTIVITY = 'Reflectivity'
}

// EulerOrder 类型兼容性定义
export type EulerOrder = any;
```</think>
现在开始重构解析器，首先简化 AnimationParser，将 Handler 的功能合并进来：
