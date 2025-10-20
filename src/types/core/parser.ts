/**
 * @file /types/core/parser.ts
 * @description 核心解析器接口定义
 */

import type * as THREE from 'three';
import type { IFBXTree, FBXConnectionNode } from './fbx-types';

// Re-export commonly needed types
export type { IFBXTree, FBXConnectionNode } from './fbx-types';

// 解析器结果类型
export interface ModelLoaderResult {
  scene: THREE.Group,
  animations: THREE.AnimationClip[],
  modelInfo: any,
}

/**
 * 解析上下文接口
 * 提供解析过程中的所有必要数据和工具方法
 */
export interface IParsingContext {
  readonly fbxTree: IFBXTree,
  readonly connections: Map<number, FBXConnectionNode>,
  readonly loadingManager: THREE.LoadingManager,
}

/**
 * 基础解析器接口
 * @template TInput 输入类型
 * @template TOutput 输出类型
 */
export interface IParser<TInput, TOutput> {
  parse(input: TInput, context: IParsingContext): TOutput,
}

/**
 * 异步解析器接口
 * @template TInput 输入类型
 * @template TOutput 输出类型
 */
export interface IAsyncParser<TInput, TOutput> {
  parse(input: TInput, context: IParsingContext): Promise<TOutput>,
}

/**
 * 解析器工厂接口
 * @template TInput 输入类型
 * @template TOutput 输出类型
 */
export interface IParserFactory<TInput, TOutput> {
  create(context: IParsingContext): IParser<TInput, TOutput> | IAsyncParser<TInput, TOutput>,
}

/**
 * 解析器元数据
 */
export interface ParserMetadata {
  name: string,
  version: string,
  description: string,
  dependencies: string[],
}

/**
 * 解析器生命周期钩子
 */
export interface ParserLifecycle {
  beforeParse?(context: IParsingContext): void,
  afterParse?(result: any, context: IParsingContext): void,
  onError?(error: Error, context: IParsingContext): void,
}
