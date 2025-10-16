/**
 * @file /types/nodes/model.ts
 * @description Model 节点定义
 */

import type { CullingType, InheritType } from '../enums';
import type { FBXNode, FBXValue } from '../shared';

export interface FBXModelNode extends FBXNode {
  id: number,
  attrName: string,
  attrType: string,

  Version: number,
  Culling: CullingType,
  InheritType: FBXValue<InheritType>,
  Lcl_Translation: FBXValue<number[]>,
  Lcl_Rotation: FBXValue<number[]>,
  Lcl_Scaling: FBXValue<number[]>,
  GeometricTranslation?: FBXValue<number[]>,
  GeometricRotation?: FBXValue<number[]>,
  GeometricScaling?: FBXValue<number[]>,
  PreRotation?: FBXValue<number[]>,
  PostRotation?: FBXValue<number[]>,
  RotationOrder?: FBXValue<number>,
  // Additional transform properties
  ScalingOffset?: FBXValue<number[]>,
  ScalingPivot?: FBXValue<number[]>,
  RotationOffset?: FBXValue<number[]>,
  RotationPivot?: FBXValue<number[]>,
}