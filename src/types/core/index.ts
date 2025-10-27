/**
 * @file /types/core/index.ts
 * @description 核心类型统一导出
 */

// 核心 FBX 类型
export * from './fbx-types';

// 解析器接口
export type {
  IParsingContext,
  IParserFactory,
  ParserMetadata,
  ParserLifecycle,
} from './parser';

// 核心解析器类暂未实现，稍后添加

// ModelLoaderResult 已在 fbx-types.ts 中定义，不再重复定义