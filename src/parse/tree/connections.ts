import type { RawConnection, FBXConnectionNode, IFBXTree } from '../../types';

// Parse context.fbxTree.Connections which holds parent-child connections between objects (e.g. material -> texture, model->geometry )
// and details the connection type
export function parseConnections (fbxTree: IFBXTree): Map<number, FBXConnectionNode> {
  const connectionMap = new Map();

  if ('Connections' in fbxTree) {
    if (!fbxTree.Connections) {
      throw new Error('FBXLoader');
    }
    const rawConnections = fbxTree.Connections?.connections || [];

    rawConnections.forEach((rawConnection: RawConnection) => {
      const fromID = rawConnection[0];
      const toID = rawConnection[1];
      const relationship = rawConnection[2];

      if (!connectionMap.has(fromID)) {
        connectionMap.set(fromID, {
          children: [],
          parents: [],
        });
      }

      const parentRelationship = { ID: toID, relationship: relationship };

      connectionMap.get(fromID).parents.push(parentRelationship);

      if (!connectionMap.has(toID)) {
        connectionMap.set(toID, {
          children: [],
          parents: [],
        });
      }

      const childRelationship = { ID: fromID, relationship: relationship };

      connectionMap.get(toID).children.push(childRelationship);
    });
  }

  return connectionMap;
}