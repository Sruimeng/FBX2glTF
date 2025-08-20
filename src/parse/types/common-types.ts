// 通用的类型定义
import type { TextureLoader, LoadingManager, Group } from 'three';
import type { IFBXTree, FBXConnectionNode } from './fbx-types';

// FBX 上下文参数
export interface FBXDocumentOptions {
  fbxTree: IFBXTree,
  fbxConnections: Map<number, FBXConnectionNode>,
  sceneGraph?: Group,
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
export type EulerOrder = {

};
