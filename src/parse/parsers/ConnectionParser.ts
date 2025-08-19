// 连接关系解析器
import type { FBXConnectionNode, FBXConnectionReference } from '../types';
import type { ParseContext } from '../types/common';

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

    const connections = 'connections' in fbxTree.Connections ? fbxTree.Connections.connections : [];

    for (let i = 0; i < connections.length; ++i) {
      const connection = connections[i];

      this.parseConnection(connection, connectionMap);
    }

    return connectionMap;
  }

  // 解析连接
  private parseConnection (
    connection: [string, number, number, ...string[]],
    connectionMap: Map<number, FBXConnectionNode>
  ): void {
    const from = connection[1];
    const to = connection[2];

    // 确保连接映射中存在from和to的节点
    if (!connectionMap.has(from)) {
      connectionMap.set(from, {
        parents: [],
        children: [],
      });
    }
    if (!connectionMap.has(to)) {
      connectionMap.set(to, {
        parents: [],
        children: [],
      });
    }

    // 添加连接关系
    const fromNode = connectionMap.get(from)!;
    const toNode = connectionMap.get(to)!;

    fromNode.children.push({
      ID: to,
    });

    toNode.parents.push({
      ID: from,
    });
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

    if (!node) {return [];}

    return node.children.filter((child: FBXConnectionReference) => child.relationship === relationship);
  }
}
