/**
 * @file /types/nodes/mesh.ts
 * @description FBX 网格节点类型定义
 */

import type { FBXNode } from '../shared';

/**
 * FBX 网格节点
 */
export interface FBXMeshNode extends FBXNode {
  id: number,
  attrName: string,
  attrType: string,
  Vertices?: FBXNode<number[]>,
  PolygonVertexIndex?: FBXNode<number[]>,
  Normals?: FBXNode<number[]>,
  Tangents?: FBXNode<number[]>,
  Binormals?: FBXNode<number[]>,
  Colors?: FBXNode<number[]>,
  UV?: FBXNode<number[]>,
  Materials?: FBXNode<number[]>,
  LayerElementNormal?: FBXNode<number[]>,
  LayerElementMaterial?: FBXNode<number[]>,
  LayerElementUV?: FBXNode<number[]>,
  LayerElementColor?: FBXNode<number[]>,
  LayerElementTangent?: FBXNode<number[]>,
  LayerElementBinormal?: FBXNode<number[]>,
}
