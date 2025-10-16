/**
 * @file /types/nodes/pose.ts
 * @description FBX 姿态节点类型定义
 */

import type { FBXNode } from '../shared';

/**
 * FBX 姿态节点
 */
export interface FBXPoseNode extends FBXNode {
  id: number,
  attrName: string,
  attrType: string,
  Pose?: Record<string, unknown>,
  Type?: string,
}

/**
 * FBX 原始目标
 */
export interface FBXRawTargets {
  name: string,
  geoID: number,
}