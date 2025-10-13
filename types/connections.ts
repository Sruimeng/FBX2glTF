/**
 * @file /types/connections.ts
 * @description 连接关系定义
 */

import { FBXConnectionType } from './enums';

/**
 * 单个连接关系
 */
export interface FBXConnection {
  ID: number;
  from: number;
  to: number;
  relationship?: FBXConnectionType;
}

/**
 * 连接节点引用
 */
export interface FBXConnectionNode {
  children: FBXConnection[];
  parents: FBXConnection[];
}
