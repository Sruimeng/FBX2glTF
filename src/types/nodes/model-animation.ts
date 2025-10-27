/**
 * FBX 模型和动画相关类型
 */

import type { FBXTypedProperty } from './base-property';
import type { FBXTreeNode, FBXTreeNodeDetails } from './tree-node';
import type { Bone, EulerOrder, Matrix4 } from 'three';

export interface FBXTransformData {
  eulerOrder?: string,
  inheritType?: number,
  parentMatrix?: Matrix4,
  parentMatrixWorld?: Matrix4,
  postRotation?: number[],
  preRotation?: number[],
  rotation?: number[],
  rotationOffset?: number[],
  rotationPivot?: number[],
  scale?: number[],
  scalingOffset?: number[],
  scalingPivot?: number[],
  translation?: number[],
}

export interface FBXModelNode extends FBXTreeNode {
  Culling: string,
  currentUVSet: FBXTypedProperty,
  DefaultAttributeIndex: FBXTypedProperty,
  filmboxTypeID: FBXTypedProperty,
  GeometricRotation: FBXTypedProperty,
  GeometricScaling: FBXTypedProperty,
  GeometricTranslation: FBXTypedProperty,
  InheritType: FBXTypedProperty,
  Lcl_Rotation: FBXTypedProperty,
  Lcl_Scaling: FBXTypedProperty,
  Lcl_Translation: FBXTypedProperty,
  lockInfluenceWeights: FBXTypedProperty,
  LookAtProperty?: string,
  PostRotation: FBXTypedProperty,
  PreRotation: FBXTypedProperty,
  RotationActive: FBXTypedProperty,
  RotationOffset: FBXTypedProperty,
  RotationOrder: FBXTreeNode,
  RotationPivot: FBXTypedProperty,
  ScalingMax: FBXTypedProperty,
  ScalingOffset: FBXTypedProperty,
  ScalingPivot: FBXTypedProperty,
  Shading: boolean,
  singleProperty: boolean,
  Version: number,
}

export interface FBXMeshNode extends FBXTreeNode {
  DeformPercent: FBXTreeNodeDetails,
  FullWeights: FBXTreeNodeDetails,
  Indexes?: FBXTreeNodeDetails,
  Material?: FBXTreeNodeDetails,
  Matrix?: FBXTreeNodeDetails,
  Node?: number,
  Transform?: FBXTreeNodeDetails,
  TransformLink?: FBXTreeNodeDetails,
  UserData?: FBXTreeNodeDetails,
  Weights?: FBXTreeNodeDetails,
}

export interface FBXAnimationCurveNode extends FBXTreeNode {
  KeyTime: FBXTreeNodeDetails,
  KeyValueFloat: FBXTreeNodeDetails,
}

export interface FBXNodeAttribute extends FBXTreeNode {
  AspectHeight?: FBXTreeNode,
  AspectWidth?: FBXTreeNode,
  CameraProjectionType?: FBXTreeNode,
  FarPlane?: FBXTreeNode,
  FieldOfView?: FBXTreeNode,
  FocalLength?: FBXTreeNode,
  NearPlane?: FBXTreeNode,
}

export interface FBXLightNodeAttribute extends FBXNodeAttribute {
  CastLightOnObject?: FBXTreeNode,
  CastShadows?: FBXTreeNode,
  Color?: FBXTreeNode,
  EnableFarAttenuation?: FBXTreeNode,
  FarAttenuationEnd?: FBXTreeNode,
  InnerAngle?: FBXTreeNode,
  Intensity?: FBXTreeNode,
  LightType?: FBXTreeNode,
  OuterAngle?: FBXTreeNode,
}

export interface FBXDeformer {
  attrName: string,
  attrType?: string,
  id?: number,
}

export interface FBXRawTargets {
  fullWeights: number[],
  geoID?: number,
  id: number,
  initialWeight: FBXTreeNodeDetails,
  name: string,
}

export interface FBXMorphTarget {
  id: string,
  rawTargets?: FBXRawTargets[],
  skeleton?: FBXSkeleton,
}

export interface FBXSkeleton {
  bones: Bone[],
  geometryID: number,
  ID: string,
  rawBones: RawBone[],
}

export interface RawBone {
  ID: number,
  indices: number[],
  transformLink: Matrix4,
  weights: number[],
}

export interface UserDataTransform {
  eulerOrder?: EulerOrder,
  inheritType?: number,
  parentMatrix?: Matrix4,
  parentMatrixWorld?: Matrix4,
  postRotation?: number[],
  preRotation?: number[],
  rotation?: number[],
  rotationOffset?: number[],
  rotationPivot?: number[],
  scale?: number[],
  scalingOffset?: number[],
  scalingPivot?: number[],
  translation?: number[],
}

export interface FBXPoseNode extends FBXTreeNode {
  NbPoseNodes: number,
  PoseNode: FBXMeshNode | FBXMeshNode[] | Record<string, FBXMeshNode>[],
}

export interface Deformers {
  morphTargets: Record<number, FBXMorphTarget>,
  skeletons: Record<number, FBXSkeleton>,
}