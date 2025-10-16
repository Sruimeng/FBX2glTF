/**
 * @file /types/nodes/bone.ts
 * @description FBX 骨骼节点类型定义
 */

// import type { FBXNode } from '../shared';

/**
 * FBX 骨骼节点
 */
export interface FBXBoneNode {
  id: number;
  attrType?: string;
  attrName?: string;
  Properties?: Record<string, unknown>;
  Properties70?: Record<string, unknown>;
}

/**
 * FBX 骨骼节点属性
 */
export interface FBXBoneAttribute {
  Transform?: { a: number[] };
  TransformLink?: { a: number[] };
  PreRotation?: { value: number[] };
  PostRotation?: { value: number[] };
  Lcl_Rotation?: { value: number[] };
  Lcl_Scaling?: { value: number[] };
  Lcl_Translation?: { value: number[] };
  RotationOffset?: { value: number[] };
  RotationPivot?: { value: number[] };
  ScalingOffset?: { value: number[] };
  ScalingPivot?: { value: number[] };
  GeometricRotation?: { value: number[] };
  GeometricScaling?: { value: number[] };
  GeometricTranslation?: { value: number[] };
}

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