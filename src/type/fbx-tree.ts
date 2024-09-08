import type { Node } from '@gltf-transform/core';

export interface ModelInfo {
  type: string,
  parent: number,
  modelIndex: number,
  ID: number,
  node: Node,
}