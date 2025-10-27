/**
 * FBX 基础属性类型
 */

export interface FBXProperty {
  name: string,
  propertyList: (string | number | boolean)[],
  singleProperty: boolean,
  a?: string | number | boolean | string[] | number[] | object,
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