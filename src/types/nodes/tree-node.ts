/**
 * FBX 树节点基础类型
 */

import type { FBXEulerOrder } from './enums';

export interface FBXTreeNode {
  a?: number[],
  attrName?: string,
  attrType?: string,
  ID?: number,
  id?: number,
  name?: string,
  propertyList?: string[],
  singleProperty?: boolean,
  value?: FBXEulerOrder | string | number,
  version?: number,
}

export interface FBXTreeNodeDetails extends FBXTreeNode {
  a: number[],
}