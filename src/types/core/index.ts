/**
 * @file /types/core/index.ts
 * @description 核心类型统一导出
 */

import type * as THREE from 'three';

// 核心 FBX 类型
export * from './fbx-types';

// 解析器接口
export type {
  IParsingContext,
  IParser,
  IAsyncParser,
  IParserFactory,
  ParserMetadata,
  ParserLifecycle
} from './parser';

// 为了方便使用，也导出 ParsingContext 类和 BaseParser 类
export { ParsingContext } from '../../parsers/core/parsing-context';
export { BaseParser, AsyncBaseParser } from '../../parsers/core/base-parser';

// 解析器结果类型
export interface ModelLoaderResult {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  modelInfo: any;
}