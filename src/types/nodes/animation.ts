/**
 * FBX 动画相关类型
 */

import type { EulerOrder } from 'three';
import type { Matrix4 } from 'three';

export interface AnimationCurve {
  id: number,
  times: number[],
  values: number[],
}

export interface AnimationCurveRelationship {
  morph?: AnimationCurve,
  x: AnimationCurve,
  y: AnimationCurve,
  z: AnimationCurve,
}

export interface AnimationNode {
  DeformPercent?: CurveNode,
  eulerOrder?: EulerOrder,
  ID: number,
  initialPosition: number[],
  initialRotation: number[],
  initialScale: number[],
  modelName: string,
  morphName?: string,
  postRotation?: [number, number, number],
  preRotation?: [number, number, number],
  R?: CurveNode,
  S?: CurveNode,
  T?: CurveNode,
  transform?: Matrix4,
}

export interface CurveNode {
  attr: string,
  curves?: AnimationCurveRelationship,
  id: number,
}

export interface RawClip {
  layer: AnimationNode[],
  name: string,
}