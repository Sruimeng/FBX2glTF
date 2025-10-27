/**
 * FBX 几何体相关类型
 */

import type { FBXProperty } from './base-property';
import type { FBXTreeNodeDetails } from './tree-node';
import type { FBXLayerElement, FBXLayerElementUV, FBXLayerElementColor } from './layer-element';

export interface FBXGeometryNode {
  attrName: string,
  attrType: string,
  Form?: string,
  GeometryVersion: number,
  id: number,
  Indexes?: FBXProperty,
  KnotVector?: FBXTreeNodeDetails,
  Layer?: {
    [id: string]: any,
  },
  LayerElementBinormal?: {
    [id: string]: FBXLayerElement,
  },
  LayerElementColor: FBXLayerElementColor[],
  LayerElementMaterial?: {
    [id: string]: any,
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