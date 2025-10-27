/**
 * FBX 几何体相关类型
 */

import type { FBXProperty } from './base-property';
import type { FBXTreeNodeDetails } from './tree-node';
import type { FBXLayerElement, FBXLayerElementUV, FBXLayerElementColor, FBXLayer } from './layer-element';
import type { FBXMaterialNode } from './material';

export interface FBXGeometryNode {
  attrName: string,
  attrType: string,
  Form?: string,
  GeometryVersion: number,
  id: number,
  Indexes?: FBXProperty,
  KnotVector?: FBXTreeNodeDetails,
  Layer?: Record<string, FBXLayer>,
  LayerElementBinormal?: Record<string, FBXLayerElement>,
  LayerElementColor: FBXLayerElementColor[],
  LayerElementMaterial?: Record<string, FBXMaterialNode>,
  LayerElementNormal?: Record<string, FBXLayerElement>,
  LayerElementSmoothing?: Record<string, FBXLayerElement>,
  LayerElementTangent?: Record<string, FBXLayerElement>,
  LayerElementUV?: Record<string, FBXLayerElementUV>,
  name: string,
  Order?: string,
  Points?: FBXTreeNodeDetails,
  PolygonVertexIndex: FBXProperty,
  propertyList: (string | number | boolean)[],
  singleProperty: boolean,
  Vertices: FBXProperty,
}