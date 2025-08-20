// 连接关系解析器
import type { ParseContext, FBXConnectionNode, FBXConnectionReference, FBXConnectionDocment } from '../types';

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
      ID: fromIdNum,
      relationship: relationship || undefined,
    };

    const parentReference: FBXConnectionReference = {
      ID: toId,
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
}
