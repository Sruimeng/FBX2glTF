/**
 * FBX 基础属性类型
 */

export interface FBXProperty {
  [key: string]: unknown,
  name: string,
  propertyList: object[],
  singleProperty: boolean,
}

export interface FBXTypedProperty {
  flag: string,
  type: string,
  type2?: string,
  value?: string | number | number[] | boolean,
}

export interface IFBXPropertyValue<T> {
  flag: string,
  type: string,
  type2: string,
  value: T,
}