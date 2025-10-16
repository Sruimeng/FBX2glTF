/**
 * @file /types/nodes/geometry.ts
 * @description Geometry 节点定义
 */

import type { MappingInformationType, ReferenceInformationType } from '../enums';
import type { FBXNode, FBXArrayData } from '../shared';

export interface FBXGeometryNode extends FBXNode {
  id: number,
  attrName: string,
  attrType: string,

  GeometryVersion: number,
  Vertices: FBXArrayData,
  PolygonVertexIndex: FBXArrayData,
  Edges?: FBXArrayData,

  LayerElementNormal?: FBXLayerElementNormal[],
  LayerElementSmoothing?: FBXLayerElementSmoothing[],
  LayerElementUV?: FBXLayerElementUV[],
  LayerElementMaterial?: FBXLayerElementMaterial[],
  LayerElementColor?: FBXLayerElementColor[],
  // Additional properties for special geometry types
  Indexes?: FBXArrayData,
  Order?: FBXArrayData,
  KnotVector?: FBXArrayData,
  Points?: FBXArrayData,
  Form?: FBXArrayData,
}

// --- Layer Elements ---

/** LayerElement 的基础接口 */
interface FBXLayerElement {
  Name: string,
  Version: number,
  MappingInformationType: MappingInformationType,
  ReferenceInformationType: ReferenceInformationType,
}

/** 法线层 */
export interface FBXLayerElementNormal extends FBXLayerElement {
  Normals: FBXArrayData,
}

/** 平滑组层 */
export interface FBXLayerElementSmoothing extends FBXLayerElement {
  Smoothing: FBXArrayData,
}

/** UV层 */
export interface FBXLayerElementUV extends FBXLayerElement {
  UV: FBXArrayData,
  UVIndex: FBXArrayData,
}

/** 材质索引层 */
export interface FBXLayerElementMaterial extends FBXLayerElement {
  Materials: FBXArrayData,
}

/** 颜色层 */
export interface FBXLayerElementColor extends FBXLayerElement {
  Colors: FBXArrayData,
  ColorIndex?: FBXArrayData,
}