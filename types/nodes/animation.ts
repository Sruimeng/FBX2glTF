/**
 * @file /types/nodes/animation.ts
 * @description Animation 节点定义
 */

import { FBXNode, FBXArrayData } from '../shared';

/**
 * 动画曲线节点
 */
export interface FBXAnimationCurveNode extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;
}

/**
 * 动画曲线节点
 */
export interface FBXAnimationCurve extends FBXNode {
  id: number;
  KeyTime: FBXArrayData;
  KeyValueFloat: FBXArrayData;
}

/**
 * 动画层节点
 */
export interface FBXAnimationLayer extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;
}

/**
 * 动画堆栈节点
 */
export interface FBXAnimationStack extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;
}

/**
 * 变形器节点
 */
export interface FBXDeformer extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;
}