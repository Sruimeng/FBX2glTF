/**
 * @file /parsers/core/parsing-context.ts
 * @description 解析上下文实现
 */

import type * as THREE from 'three';
import type { IParsingContext, IFBXTree, FBXConnectionNode } from '../../types/core/parser';

/**
 * 解析上下文实现
 * 提供线程安全的、不可变的解析环境
 */
export class ParsingContext implements IParsingContext {
  private readonly _fbxTree: IFBXTree;
  private readonly _connections: Map<number, FBXConnectionNode>;
  private readonly _loadingManager: THREE.LoadingManager;
  private readonly _cache: Map<string, any> = new Map();

  constructor(
    fbxTree: IFBXTree,
    connections: Map<number, FBXConnectionNode>,
    loadingManager: THREE.LoadingManager
  ) {
    // 深度冻结 fbxTree 以防止意外修改
    this._fbxTree = this.deepFreeze(fbxTree);
    this._connections = Object.freeze(new Map(connections));
    this._loadingManager = loadingManager;
  }

  get fbxTree(): IFBXTree {
    return this._fbxTree;
  }

  get connections(): Map<number, FBXConnectionNode> {
    return this._connections;
  }

  get loadingManager(): THREE.LoadingManager {
    return this._loadingManager;
  }

  /**
   * 根据节点 ID 获取节点对象
   * @template T 节点类型
   */
  getNodeById<T>(id: number): T | undefined {
    return this._fbxTree.Objects?.[id] as T;
  }

  /**
   * 获取指定节点的连接信息
   */
  getConnections(id: number): FBXConnectionNode | undefined {
    return this._connections.get(id);
  }

  /**
   * 根据节点类型获取所有匹配的节点
   * @template T 节点类型
   * @param nodeType 节点类型名称
   */
  getNodesByType<T>(nodeType: string): Map<number, T> {
    const cacheKey = `nodesByType:${nodeType}`;

    // 使用缓存提高性能
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const nodes = new Map<number, T>();
    const objects = this._fbxTree.Objects;

    if (!objects) {
      this._cache.set(cacheKey, nodes);
      return nodes;
    }

    Object.entries(objects).forEach(([id, node]) => {
      if ((node as any).attrType === nodeType) {
        nodes.set(parseInt(id), node as T);
      }
    });

    this._cache.set(cacheKey, nodes);
    return nodes;
  }

  /**
   * 获取节点的子节点
   */
  getChildNodes(id: number): Array<{ ID: number }> {
    const connection = this._connections.get(id);
    return connection?.children || [];
  }

  /**
   * 获取节点的父节点
   */
  getParentNodes(id: number): Array<{ ID: number }> {
    const connection = this._connections.get(id);
    return connection?.parents || [];
  }

  /**
   * 检查节点是否存在
   */
  hasNode(id: number): boolean {
    return !!this._fbxTree.Objects?.[id];
  }

  /**
   * 缓存计算结果
   */
  setCache<T>(key: string, value: T): void {
    this._cache.set(key, value);
  }

  /**
   * 获取缓存结果
   */
  getCache<T>(key: string): T | undefined {
    return this._cache.get(key);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this._cache.clear();
  }

  /**
   * 深度冻结对象
   * @param obj 要冻结的对象
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // 冻结普通对象
    Object.keys(obj).forEach(key => {
      const value = (obj as any)[key];
      if (value && typeof value === 'object') {
        this.deepFreeze(value);
      }
    });

    return Object.freeze(obj);
  }

  /**
   * 获取上下文摘要信息
   */
  getSummary(): {
    return {
      totalNodes: Object.keys(this._fbxTree.Objects || {}).length,
      totalConnections: this._connections.size,
      cachedItems: this._cache.size,
      hasLoadingManager: !!this._loadingManager
    };
  }

  /**
   * 创建子上下文（用于测试或特殊场景）
   */
  createChildContext(
    overrides?: Partial<IFBXTree> & { connections?: Map<number, FBXConnectionNode> }
  ): IParsingContext {
    const newFbxTree = overrides
      ? { ...this._fbxTree, ...overrides }
      : this._fbxTree;

    const newConnections = overrides?.connections
      ? new Map(overrides.connections)
      : this._connections;

    return new ParsingContext(newFbxTree, newConnections, this._loadingManager);
  }
}