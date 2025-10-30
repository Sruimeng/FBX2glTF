/**
 * FBX 动画堆栈解析器
 */

import type { IParsingContext } from '../../types';
import type { FBXAnimationStack } from '../../types/nodes';
import type { AnimationNode, RawClip } from '../../types';

/**
 * 从连接关系中获取连接ID
 * @param connection 连接关系
 * @returns 连接ID
 */
function getConnectionID (connection: { parents: { ID: number }[] } | { children: { ID: number }[] } | undefined): number | undefined {
  if (!connection) {
    return undefined;
  }
  // 处理 parents 情况
  if ('parents' in connection && connection.parents && connection.parents.length > 0) {
    return connection.parents[0].ID;
  }
  // 处理 children 情况
  if ('children' in connection && connection.children && connection.children.length > 0) {
    return connection.children[0].ID;
  }

  return undefined;
}

/**
 * 解析动画堆栈
 * @param context 解析上下文
 * @param layersMap 层映射
 * @returns 原始动画片段映射
 */
export function parseAnimStacks (
  context: IParsingContext,
  layersMap: Map<number, AnimationNode[]>
): Record<string, RawClip> {
  const rawStacks = context.fbxTree.Objects?.AnimationStack as Record<string, FBXAnimationStack>;
  const connections = context.connections;

  if (!rawStacks || !connections) {
    throw new Error('FBXTree.Objects.AnimationStack or this.context.connections is undefined');
  }

  // connect the stacks (clips) up to the layers
  const rawClips: Record<string, RawClip> = {};

  for (const nodeID in rawStacks) {
    const children = connections.get(parseInt(nodeID))?.children || [];
    const rawStack: FBXAnimationStack = rawStacks[nodeID];

    if (children.length > 1) {
      // it seems like stacks will always be associated with a single layer. But just in case there are files
      // where there are multiple layers per stack, we'll display a warning
      console.warn(
        'THREE.FBXLoader: Encountered an animation stack with multiple layers, this is currently not supported. Ignoring subsequent layers.',
      );
    }

    const connectionID = getConnectionID({ children: [children[0]] });
    const layer = connectionID ? layersMap.get(connectionID) : undefined;

    if (!layer) {
      throw new Error('Layer not found for nodeID: ' + nodeID);
    }

    rawClips[nodeID] = {
      layer: layer,
      name: rawStack.name || rawStack.attrName || '',
    };
  }

  return rawClips;
}