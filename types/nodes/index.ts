/**
 * @file /types/nodes/index.ts
 * @description FBX 节点类型定义导出
 */

// Export all node types
export type { FBXBoneNode, FBXBoneAttribute } from './bone';
export type { FBXMeshNode } from './mesh';
export type { FBXMaterialNode } from './material';
export type { FBXPoseNode, FBXRawTargets } from './pose';

// Export other node types that may exist
export type {
  FBXGeometryNode,
  FBXLayerElementNormal,
  FBXLayerElementSmoothing,
  FBXLayerElementUV,
  FBXLayerElementMaterial,
  FBXLayerElementColor,
} from './geometry';
export type { FBXTextureNode } from './texture';
export type { FBXModelNode } from './model';
export type {
  FBXAnimationCurveNode,
  FBXAnimationCurve,
  FBXAnimationLayer,
  FBXAnimationStack,
  FBXDeformer,
} from './animation';
export type { FBXLightNodeAttribute } from './light';
export type { FBXVideoNode } from './video';
export type { FBXCameraNodeAttribute } from './attribute';
