import type { LoadingManager } from 'three';
import { Group } from 'three';
import type { FBXConnectionNode } from '../nodes';
import type { IParsingContext } from './parser';

/**
 * FBX 解析上下文实现
 * 不可变的数据中心，替代 global 对象
 */
export class ParsingContext implements IParsingContext {
  private readonly _fbxTree: any;
  private readonly _connections: Map<number, FBXConnectionNode>;
  private readonly _sceneGraph: Group;
  private readonly _loadingManager: LoadingManager;
  private readonly _wireframe?: boolean;

  constructor (
    fbxTree: any,
    connections: Map<number, FBXConnectionNode>,
    loadingManager: LoadingManager,
    wireframe?: boolean
  ) {
    // 冻结对象，防止意外修改
    this._fbxTree = Object.freeze(fbxTree);
    this._connections = Object.freeze(connections);
    this._loadingManager = loadingManager;
    this._wireframe = wireframe;

    // 创建场景图
    this._sceneGraph = new Group();
  }

  // Getters
  get fbxTree (): any { return this._fbxTree; }
  get connections (): Map<number, FBXConnectionNode> { return this._connections; }
  get sceneGraph (): Group { return this._sceneGraph; }
  get loadingManager (): LoadingManager { return this._loadingManager; }
  get wireframe (): boolean | undefined { return this._wireframe; }

  // 便捷方法
  /**
   * 根据 ID 获取 FBX 节点
   */
  getNodeById<T = unknown>(id: number): T | undefined {
    return this._fbxTree.Objects?.[id] as T;
  }

  /**
   * 获取指定 ID 的连接关系
   */
  getConnections (id: number): FBXConnectionNode | undefined {
    return this._connections.get(id);
  }

  /**
   * 根据类型获取所有节点
   */
  getNodesByType<T = unknown>(nodeType: string): Map<number, T> {
    const nodes = new Map<number, T>();
    const objects = this._fbxTree.Objects;

    if (!objects) {return nodes;}

    Object.entries(objects).forEach(([id, node]) => {
      if ((node as any).attrType === nodeType) {
        nodes.set(parseInt(id), node as T);
      }
    });

    return nodes;
  }

  /**
   * 获取与指定节点关联的所有子节点
   */
  getConnectedNodes (parentId: number): FBXConnectionNode[] {
    const connections: FBXConnectionNode[] = [];

    this._connections.forEach(connection => {
      if (connection.parent === parentId) {
        connections.push(connection);
      }
    });

    return connections;
  }

  /**
   * 查找节点的父节点
   */
  getParentNode (childId: number): FBXConnectionNode | null {
    for (const connection of this._connections.values()) {
      if (connection.child === childId) {
        return connection;
      }
    }

    return null;
  }
}