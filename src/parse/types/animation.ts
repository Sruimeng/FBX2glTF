// 动画相关类型定义
import type { EulerOrder, Matrix4, AnimationClip } from 'three';
import type { FBXTreeNode, FBXTreeNodeDetails, FBXProperties70 } from './fbx-structure';

// 动画曲线
export interface AnimationCurve {
  id: number,
  times: number[],
  values: number[],
}

// 曲线节点
export interface CurveNode {
  id: number,
  attr: string,
  curves: {
    x?: AnimationCurve,
    y?: AnimationCurve,
    z?: AnimationCurve,
    morph?: AnimationCurve,
  },
}

// 动画节点
export interface AnimationNode {
  morphName?: string,
  DeformPercent?: CurveNode,
  S?: CurveNode,
  R?: CurveNode,
  T?: CurveNode,
  transform?: Matrix4,
  modelName: string,
  ID: number,
  eulerOrder?: EulerOrder,
  preRotation?: [number, number, number],
  postRotation?: [number, number, number],
  initialPosition: number[],
  initialRotation: number[],
  initialScale: number[],
}

// 原始动画剪辑
export interface RawClip {
  name: string,
  layer: AnimationNode[],
}

// 动画数据
export interface AnimationData {
  clips: AnimationClip[],
  curves: Map<number, CurveNode>,
  layers: Map<number, AnimationNode[]>,
}

// FBX 动画栈
export interface FBXAnimationStack extends FBXTreeNode {
  Properties70?: FBXProperties70,
}

// FBX 动画层
export interface FBXAnimationLayer extends FBXTreeNode {
  Properties70?: FBXProperties70,
}

// FBX 动画曲线节点
export interface FBXAnimationCurveNode extends FBXTreeNode {
  KeyTime: FBXTreeNodeDetails,
  KeyValueFloat: FBXTreeNodeDetails,
}

// FBX 动画曲线
export interface FBXAnimationCurve extends FBXTreeNode {
  KeyTime: FBXTreeNodeDetails,
  KeyValueFloat: FBXTreeNodeDetails,
  KeyAttrFlags: FBXTreeNodeDetails,
  KeyAttrDataFloat: FBXTreeNodeDetails,
}

