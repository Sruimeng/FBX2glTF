/**
 * FBX 连接相关类型
 */

export interface FBXConnectionReference {
  ID: number,
  relationship?: number | string,
}

export interface FBXConnectionNode {
  children: FBXConnectionReference[],
  parents: FBXConnectionReference[],
}

export interface FBXConnectionDocument {
  Description: any,
  LocalStart: any,
  LocalStop: any,
  name: string,
  propertyList: string[],
  ReferenceStart: any,
  ReferenceStop: any,
  singleProperty: boolean,
  connections: [number, number, string][],
}

export interface FBXConnectionDocment {
  from: number,
  relationship?: number,
  to: number,
  connections?: [number, number, string][],
}