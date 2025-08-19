// 材质相关类型定义
import type { Texture, MeshStandardMaterialParameters } from 'three';
import type { FBXTreeNode, FBXTypedProperty, FBXProperties70, FBXProperty70 } from './fbx-structure';

// 材质数据
export interface MaterialData {
  id: number,
  material: FBXMaterialNode,
  threeMaterial?: any,
  textures: Map<string, Texture>,
}

// 纹理数据
export interface TextureData {
  id: number,
  texture: FBXTextureNode,
  image?: HTMLImageElement | ArrayBuffer,
  threeTexture?: Texture,
}

// 材质解析结果
export interface MaterialParseResult {
  materials: Map<number, MaterialData>,
  textures: Map<number, TextureData>,
}

// FBX 材质属性值
export interface IFBXPropertyValue<T> {
  type: string,
  type2: string,
  flag: string,
  value: T,
}

// FBX 材质节点
export interface FBXMaterialNode {
  MappingInformationType?: string,
  ReferenceInformationType?: string,
  Materials?: any,
  Diffuse?: IFBXPropertyValue<number[]>,
  DisplacementFactor?: IFBXPropertyValue<number[] | number>,
  Emissive?: IFBXPropertyValue<number[]>,
  TransparencyFactor?: IFBXPropertyValue<string>,
  Opacity?: IFBXPropertyValue<string>,
  TransparentColor?: IFBXPropertyValue<string[]>,
  Specular?: IFBXPropertyValue<number[]>,
  id?: number,
  attrName?: string,
  attrType?: string,
  singleProperty?: boolean,
  name?: string,
  Version?: number,
  ShadingModel?: IFBXPropertyValue<string>,
  MultiLayer?: number,
  DiffuseColor?: IFBXPropertyValue<number[]>,
  EmissiveColor?: IFBXPropertyValue<number[]>,
  EmissiveFactor?: IFBXPropertyValue<string>,
  AmbientColor?: IFBXPropertyValue<number[]>,
  AmbientFactor?: IFBXPropertyValue<number>,
  BumpFactor?: IFBXPropertyValue<number>,
  SpecularColor?: IFBXPropertyValue<number[]>,
  SpecularFactor?: IFBXPropertyValue<number>,
  Shininess?: IFBXPropertyValue<number>,
  ShininessExponent?: IFBXPropertyValue<number>,
  ReflectionColor?: IFBXPropertyValue<number[]>,
  ReflectionFactor?: IFBXPropertyValue<number>,
  propertyList?: Array<number | string>,
  Properties70?: FBXProperties70,
}

// FBX 纹理节点
export interface FBXTextureNode {
  WrapModeU?: FBXTypedProperty,
  Scaling?: FBXTypedProperty,
  WrapModeV?: FBXTypedProperty,
  Translation?: FBXTypedProperty,
  FileName?: string,
  Media?: string,
  RelativeFilename?: string,
  TextureName?: string,
  Type?: string,
  UseMaterial?: FBXTypedProperty,
  Version?: number,
  attrName?: string,
  attrType?: string,
  id?: number,
  name?: string,
  propertyList?: Array<number | string>,
  singleProperty?: boolean,
  Properties70?: FBXProperties70,
}

// FBX 视频节点
export interface FBXVideoNode {
  Content?: ArrayBuffer,
  Filename?: string,
  RelativeFilename?: string,
  Path?: string,
  Type?: string,
  type?: string,
  type2?: string,
  attrType?: string,
  flag?: string,
  value?: string,
  UseMipMap?: number,
  id?: number,
  name?: string,
  attrName?: string,
  propertyList?: Array<string | number>,
  singleProperty?: boolean,
  Properties70?: FBXProperties70,
}

// FBX 材质（旧接口）
export interface FBXMaterial {
  singleProperty: boolean,
  Version: number,
  ShadingModel: string,
  MultiLayer: number,
  AmbientColor: FBXTypedProperty,
  DiffuseColor: FBXTypedProperty,
  DiffuseFactor: FBXTypedProperty,
  TransparencyFactor: FBXTypedProperty,
  Emissive: FBXTypedProperty,
  Ambient: FBXTypedProperty,
  Diffuse: FBXTypedProperty,
  Opacity: FBXTypedProperty,
  propertyList: object[],
  name: string,
  id: number,
  attrName: string,
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

// FBX 网格标准材质参数
export interface FBXMeshStandardMaterialParameters extends MeshStandardMaterialParameters {
  reflectivity?: number,
  specularMap?: Texture,
}