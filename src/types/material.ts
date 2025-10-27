/**
 * FBX 材质相关类型
 */

import type { FBXTypedProperty } from './base-property';
import type { FBXProperty } from './base-property';

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

export interface FBXMaterialNode {
  AmbientColor: IFBXPropertyValue<number[]>,
  AmbientFactor: IFBXPropertyValue<number>,
  attrName: string,
  attrType: string,
  BumpFactor: IFBXPropertyValue<number>,
  Diffuse: IFBXPropertyValue<number[]>,
  DiffuseColor: IFBXPropertyValue<number[]>,
  DisplacementFactor: IFBXPropertyValue<number[] | number>,
  Emissive: IFBXPropertyValue<number[]>,
  EmissiveColor: IFBXPropertyValue<number[]>,
  EmissiveFactor: IFBXPropertyValue<string>,
  id: number,
  MappingInformationType: string,
  Materials: FBXProperty,
  MultiLayer: number,
  name: string,
  Opacity: IFBXPropertyValue<string>,
  propertyList: Array<number | string>,
  ReferenceInformationType: string,
  ReflectionColor: IFBXPropertyValue<number[]>,
  ReflectionFactor: IFBXPropertyValue<number>,
  ShadingModel: IFBXPropertyValue<string>,
  Shininess: IFBXPropertyValue<number>,
  ShininessExponent: IFBXPropertyValue<number>,
  singleProperty: boolean,
  Specular: IFBXPropertyValue<number[]>,
  SpecularColor: IFBXPropertyValue<number[]>,
  SpecularFactor: IFBXPropertyValue<number>,
  TransparencyFactor: IFBXPropertyValue<string>,
  TransparentColor: IFBXPropertyValue<string[]>,
  Version: number,
}

interface IFBXPropertyValue<T> {
  flag: string,
  type: string,
  type2: string,
  value: T,
}