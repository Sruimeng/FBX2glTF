// 动画相关类型定义
import type { EulerOrder, Matrix4, AnimationClip } from 'three';

export interface AnimationCurve {
  id: number,
  times: number[],
  values: number[],
}

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

export interface RawClip {
  name: string,
  layer: AnimationNode[],
}

export interface AnimationData {
  clips: AnimationClip[],
  curves: Map<number, CurveNode>,
  layers: Map<number, AnimationNode[]>,
}