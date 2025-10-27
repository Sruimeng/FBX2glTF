// 重新导出原有类型，保持向后兼容
export {
  IFBXTree,
  FBXDocumentOptions,
  FBXProperty,
  FBXHeaderExtension,
  FBXConnectionDocment,
  FBXTimeStamp,
  FBXSceneInfo,
  FBXMetaData,
  FBXTypedProperty,
  FBXGlobalSettings,
  FBXLayerElement,
  FBXLayerElementColor,
  FBXLayerElementNormal,
  FBXLayerElementUV,
  FBXLayer,
  FBXDeformer,
  FBXGeometryNode,
  FBXModelNode,
  FBXMeshNode,
  FBXNodeAttribute,
  FBXAnimationCurveNode,
  FBXLightNodeAttribute,
  FBXObjects,
  FBXMaterial,
  FBXMaterialNode,
  FBXTextureNode,
  FBXVideoNode,
  FBXPoseNode,
  FBXSkeleton,
  RawBone,
  Deformers,
  FBXMorphTarget,
  Global,
  FBXTree,
} from '../constants';

// 导出节点类型
export { FBXConnectionNode } from './nodes';

// 导出新的核心类型
export type {
  IParsingContext,
  IParser,
  IAsyncParser,
  ModelLoaderResult,
  ParsingOptions,
} from './core';

// 导出 ParsingContext 实现
export { ParsingContext } from './core/context';

// 导出解析器基类
export { BaseParser, AsyncBaseParser } from './core/base-parser';

// 提供类型别名帮助迁移
import type { IParsingContext, ModelLoaderResult } from './core';

export type GlobalContext = IParsingContext;
export type FBXLoaderResult = ModelLoaderResult;