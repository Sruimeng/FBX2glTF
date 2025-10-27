import type { LoadingManager } from 'three';
import { Group } from 'three';
import type { IParsingContext } from './parser';
import type { IFBXTree, GlobalFBXConnectionNode } from './parser';

/**
 * FBX 解析上下文实现
 * 不可变的数据中心，替代 global 对象
 */
export class ParsingContext implements IParsingContext {
  private readonly _fbxTree: IFBXTree;
  private _connections: Map<number, GlobalFBXConnectionNode>;
  private _sceneGraph: Group;
  private readonly _loadingManager: LoadingManager;
  private readonly _wireframe?: boolean;

  constructor (
    fbxTree: IFBXTree,
    connections: Map<number, GlobalFBXConnectionNode>,
    loadingManager: LoadingManager,
    wireframe?: boolean
  ) {
    // 冻结FBX树，防止意外修改
    this._fbxTree = Object.freeze(fbxTree);
    this._connections = connections;
    this._loadingManager = loadingManager;
    this._wireframe = wireframe;

    // 创建场景图
    this._sceneGraph = new Group();
  }

  // Getters
  get fbxTree (): IFBXTree { return this._fbxTree; }
  get connections (): Map<number, GlobalFBXConnectionNode> { return this._connections; }
  get sceneGraph (): Group { return this._sceneGraph; }
  
  // Setters for properties that need to be modified
  set connections (value: Map<number, GlobalFBXConnectionNode>) { this._connections = value; }
  set sceneGraph (value: Group) { this._sceneGraph = value; }
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
  getConnections (id: number): GlobalFBXConnectionNode | undefined {
    return this._connections.get(id);
  }

  /**
   * 根据类型获取所有节点
   */
  getNodesByType<T>(nodeType: string): Map<number, T> {
    const nodes = new Map<number, T>();
    const objects = this._fbxTree.Objects;

    if (!objects) {return nodes;}

    Object.entries(objects).forEach(([id, node]) => {
      if ((node as { attrType?: string }).attrType === nodeType) {
        nodes.set(parseInt(id), node as T);
      }
    });

    return nodes;
  }

  /**
   * 获取与指定节点关联的所有子节点
   */
  getConnectedNodes (parentId: number): GlobalFBXConnectionNode[] {
    const connections: GlobalFBXConnectionNode[] = [];

    this._connections.forEach(connection => {
      if (connection.parents?.some((parent: { ID: number }) => parent.ID === parentId)) {
        connections.push(connection);
      }
    });

    return connections;
  }

  /**
   * 查找节点的父节点
   */
  getParentNode (childId: number): GlobalFBXConnectionNode | undefined {
    return this._connections.get(childId);
  }
}