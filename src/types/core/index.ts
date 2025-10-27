/**
 * @file /types/core/index.ts
 * @description 核心类型统一导出
 */

// 核心 FBX 类型
export * from './fbx-types';

// 解析器接口
export type {
  IParsingContext,
  IParser,
  IAsyncParser,
  IParserFactory,
  ParserMetadata,
  ParserLifecycle,
} from './parser';

// 为了方便使用，也导出 ParsingContext 类和 BaseParser 类
export { ParsingContext } from '../../parsers/core/parsing-context';
export { BaseParser, AsyncBaseParser } from '../../parsers/core/base-parser';

// ModelLoaderResult 已在 fbx-types.ts 中定义，不再重复定义