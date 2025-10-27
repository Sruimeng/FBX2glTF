/**
 * FBX 层级结构类型
 */

import type { FBXProperty } from './base-property';
import type { FBXTreeNodeDetails } from './tree-node';

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