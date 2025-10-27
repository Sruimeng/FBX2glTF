import type { LoadingManager, Group, AnimationClip } from 'three';
import type { FBXConnectionNode } from '../connection';
import type { IFBXTree } from '../document';

/**
 * FBX 解析上下文接口
 * 提供解析过程中需要的所有数据和工具
 */
export interface IParsingContext {
  readonly fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
  sceneGraph: Group,
  readonly loadingManager: LoadingManager,
  readonly wireframe?: boolean,

  // 便捷方法
  getNodeById<T>(id: number): T | undefined,
  getConnections(id: number): FBXConnectionNode | undefined,
  getNodesByType<T>(nodeType: string): Map<number, T>,
}

/**
 * 解析器基础接口
 */
export interface IParser<TInput, TOutput> {
  parse(input: TInput, context: IParsingContext): TOutput,
}

/**
 * 异步解析器接口
 */
export interface IAsyncParser<TInput, TOutput> {
  parse(input: TInput, context: IParsingContext): Promise<TOutput>,
}

/**
 * 解析结果类型
 */
export interface ModelLoaderResult {
  scene: Group,
  animations: AnimationClip[],
  modelInfo?: {
    name: string,
    version: string,
    author?: string,
  },
}

/**
 * 解析选项
 */
export interface ParsingOptions {
  wireframe?: boolean,
  generateMipmaps?: boolean,
  flipY?: boolean,
  premultiplyAlpha?: boolean,
}