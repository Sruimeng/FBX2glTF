// 连接关系解析器
import type { ParseContext,FBXConnectionNode, FBXConnectionReference, FBXConnectionDocment } from '../types';

export class ConnectionParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  // 解析FBX连接关系
  parse (): Map<number, FBXConnectionNode> {
    const connectionMap = new Map<number, FBXConnectionNode>();
    const fbxTree = this.context.fbxTree;

    if (!fbxTree.Connections) {
      return connectionMap;
    }

    // 获取原始连接数据
    const rawConnections = this.extractRawConnections(fbxTree.Connections);

    // 解析每个连接
    for (const connection of rawConnections) {
      this.parseConnection(connection, connectionMap);
    }

    return connectionMap;
  }

  // 提取原始连接数据
  private extractRawConnections (connections: FBXConnectionDocment | Map<number, FBXConnectionNode>): Array<[string, number, number, ...string[]]> {
    if (connections instanceof Map) {
      // 处理Map类型的连接
      const results: Array<[string, number, number, ...string[]]> = [];
      for (const [parentId, conn] of connections) {
        for (const child of conn.children) {
          results.push(['C', parentId, child.ID, child.relationship?.toString() || ''] as [string, number, number, ...string[]]);
        }
      }
      return results;
    } else if ('connections' in connections) {
      // 处理标准FBX连接文档
      return connections.connections;
    }

    return [];
  }

  // 解析单个连接
  private parseConnection (
    connection: [string, number, number, ...string[]],
    connectionMap: Map<number, FBXConnectionNode>
  ): void {
    const [fromId, toId, ...relationshipParts] = connection;
    const relationship = relationshipParts.join('') || '';
    const fromIdNum = parseInt(fromId);
    // 确保连接映射中存在from和to的节点
    this.ensureNodeExists(fromIdNum, connectionMap);
    this.ensureNodeExists(toId, connectionMap);

    // 添加连接关系
    const fromNode = connectionMap.get(fromIdNum)!;
    const toNode = connectionMap.get(toId)!;

    // 创建连接引用，包含关系类型
    const childReference: FBXConnectionReference = {
      ID: toId,
      relationship: relationship || undefined,
    };

    const parentReference: FBXConnectionReference = {
      ID: fromIdNum,
      relationship: relationship || undefined,
    };

    fromNode.parents.push(parentReference);
    toNode.children.push(childReference);
  }

  // 确保节点存在于连接映射中
  private ensureNodeExists (id: number, connectionMap: Map<number, FBXConnectionNode>): void {
    if (!connectionMap.has(id)) {
      connectionMap.set(id, {
        parents: [],
        children: [],
      });
    }
  }

  // 获取对象的子对象
  getChildren (objectId: number): FBXConnectionReference[] {
    const node = this.context.connections.get(objectId);

    return node ? node.children : [];
  }

  // 获取对象的父对象
  getParents (objectId: number): FBXConnectionReference[] {
    const node = this.context.connections.get(objectId);

    return node ? node.parents : [];
  }

  // 查找特定类型的连接
  findConnectionsByType (objectId: number, relationship: string): FBXConnectionReference[] {
    const node = this.context.connections.get(objectId);

    if (!node) {
      return [];
    }

    return node.children.filter(child => child.relationship === relationship);
  }

  // 查找所有具有特定关系类型的连接
  findAllConnectionsByType (relationship: string): Array<{ from: number, to: number }> {
    const results: Array<{ from: number, to: number }> = [];

    for (const [fromId, node] of this.context.connections) {
      for (const child of node.children) {
        if (child.relationship === relationship) {
          results.push({ from: fromId, to: child.ID });
        }
      }
    }

    return results;
  }

  // 检查两个对象之间是否存在连接
  hasConnection (fromId: number, toId: number, relationship?: string): boolean {
    const fromNode = this.context.connections.get(fromId);

    if (!fromNode) {
      return false;
    }

    return fromNode.children.some(child =>
      child.ID === toId && (!relationship || child.relationship === relationship)
    );
  }

  // 获取对象的所有直接和间接子对象
  getAllChildren (objectId: number): FBXConnectionReference[] {
    const allChildren: FBXConnectionReference[] = [];
    const visited = new Set<number>();

    const traverse = (id: number) => {
      if (visited.has(id)) {
        return;
      }

      visited.add(id);
      const children = this.getChildren(id);

      for (const child of children) {
        allChildren.push(child);
        traverse(child.ID);
      }
    };

    traverse(objectId);

    return allChildren;
  }

  // 获取对象的所有直接和间接父对象
  getAllParents (objectId: number): FBXConnectionReference[] {
    const allParents: FBXConnectionReference[] = [];
    const visited = new Set<number>();

    const traverse = (id: number) => {
      if (visited.has(id)) {
        return;
      }

      visited.add(id);
      const parents = this.getParents(id);

      for (const parent of parents) {
        allParents.push(parent);
        traverse(parent.ID);
      }
    };

    traverse(objectId);

    return allParents;
  }

  // 获取连接关系信息
  getConnectionInfo (fromId: number, toId: number): FBXConnectionReference | null {
    const fromNode = this.context.connections.get(fromId);

    if (!fromNode) {
      return null;
    }

    return fromNode.children.find(child => child.ID === toId) || null;
  }
}
