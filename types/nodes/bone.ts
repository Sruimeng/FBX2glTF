/**
 * @file /types/nodes/bone.ts
 * @description FBX 骨骼节点类型定义
 */

// import type { FBXNode } from '../shared';

/**
 * 原始骨骼定义
 */
export interface RawBone {
  ID: number,
  indices: number[],
  weights: number[],
  transformLinkMatrix: unknown, // THREE.Matrix4
  transformLink?: unknown,
}