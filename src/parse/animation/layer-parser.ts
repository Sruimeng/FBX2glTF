/**
 * FBX 动画层解析器
 */

import type { Object3D } from 'three';
import { Matrix4, PropertyBinding } from 'three';
import type { IParsingContext } from '../../types';
import type { AnimationNode, CurveNode } from '../../types';

// 扩展 Object3D 接口以包含 ID 属性
interface Object3DWithID extends Object3D {
  ID?: number,
}

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
 * 创建动画节点
 * @param rawModel 原始模型数据
 * @param sceneGraph 场景图
 * @returns 动画节点
 */
function createAnimationNode (rawModel: any, sceneGraph: Object3D): AnimationNode {
  const rawModelID = rawModel.id || 0;
  const node: AnimationNode = {
    ID: rawModelID,
    initialPosition: [0, 0, 0],
    initialRotation: [0, 0, 0],
    initialScale: [1, 1, 1],
    modelName: rawModel.attrName
      ? PropertyBinding.sanitizeNodeName(rawModel.attrName)
      : '',
  };

  sceneGraph.traverse((child: Object3DWithID) => {
    if (child.ID === rawModel.id) {
      node.transform = child.matrix;

      if (child.userData.transformData) {
        node.eulerOrder = child.userData.transformData.eulerOrder;
      }
    }
  });

  if (!node.transform) {
    node.transform = new Matrix4();
  }

  // if the animated model is pre rotated, we'll have to apply the pre rotations to every
  // animation value as well
  if ('PreRotation' in rawModel && rawModel.PreRotation?.value) {
    const value = rawModel.PreRotation.value;

    if (Array.isArray(value) && value.length >= 3) {
      node.preRotation = [value[0], value[1], value[2]];
    }
  }
  if ('PostRotation' in rawModel && rawModel.PostRotation?.value) {
    const value = rawModel.PostRotation.value;

    if (Array.isArray(value) && value.length >= 3) {
      node.postRotation = [value[0], value[1], value[2]];
    }
  }

  return node;
}

/**
 * 创建变形动画节点
 * @param rawModel 原始模型数据
 * @param deformerID 变形器ID
 * @param objects FBX对象集合
 * @returns 变形动画节点
 */
function createMorphAnimationNode (
  rawModel: any,
  deformerID: number,
  objects: any
): AnimationNode {
  return {
    ID: 0,
    initialPosition: [],
    initialRotation: [],
    initialScale: [],
    modelName: rawModel.attrName
      ? PropertyBinding.sanitizeNodeName(rawModel.attrName)
      : '',
    morphName: objects.Deformer?.[deformerID]?.attrName,
  };
}

/**
 * 为曲线节点分配属性
 * @param layerCurveNodes 层曲线节点数组
 * @param i 索引
 * @param curveNode 曲线节点
 */
function assignCurveToNode (
  layerCurveNodes: AnimationNode[],
  i: number,
  curveNode: CurveNode
): void {
  if (layerCurveNodes[i]) {
    switch (curveNode.attr) {
      case 'T':
        layerCurveNodes[i].T = curveNode;

        break;
      case 'R':
        layerCurveNodes[i].R = curveNode;

        break;
      case 'S':
        layerCurveNodes[i].S = curveNode;

        break;
      case 'DeformPercent':
        layerCurveNodes[i].DeformPercent = curveNode;

        break;
      default:
        break;
    }
  }
}

/**
 * 解析动画层
 * @param context 解析上下文
 * @param curveNodesMap 曲线节点映射
 * @returns 层映射
 */
export function parseAnimationLayers (
  context: IParsingContext,
  curveNodesMap: Map<number, CurveNode>
): Map<number, AnimationNode[]> {
  const objects = context.fbxTree.Objects;

  const animationLayer = objects?.AnimationLayer;
  const models = objects?.Model;
  const connections = context.connections;
  const sceneGraph = context.sceneGraph;

  if (!animationLayer || !connections || !models || !sceneGraph || !objects) {
    throw new Error('FBXTree.Objects.AnimationLayer is undefined');
  }

  const rawLayers = animationLayer;
  const layersMap = new Map();

  for (const nodeID in rawLayers) {
    const layerCurveNodes: AnimationNode[] = [];
    const connection = connections.get(parseInt(nodeID));

    if (connection !== undefined) {
      // all the animationCurveNodes used in the layer
      const children = connection.children;

      children.forEach((child, i) => {
        if (curveNodesMap.has(child.ID)) {
          const curveNode = curveNodesMap.get(child.ID);

          if (!curveNode) {
            return;
          }

          // check that the curves are defined for at least one axis, otherwise ignore the curveNode
          if (
            curveNode.curves?.x !== undefined
            || curveNode.curves?.y !== undefined
            || curveNode.curves?.z !== undefined
          ) {
            if (layerCurveNodes[i] === undefined) {
              const connectionParents = connections.get(child.ID)?.parents;
              const validParent = connectionParents?.find(parent => parent.relationship !== undefined);
              const modelID = validParent?.ID;

              if (modelID !== undefined) {
                const rawModel = models[modelID.toString()];

                if (rawModel === undefined) {
                  console.warn('THREE.FBXLoader: Encountered a unused curve.', child);

                  return;
                }

                layerCurveNodes[i] = createAnimationNode(rawModel, sceneGraph);
              }
            }

            assignCurveToNode(layerCurveNodes, i, curveNode);
          } else if (curveNode.curves?.morph !== undefined) {
            if (layerCurveNodes[i] === undefined) {
              const deformerID = getConnectionID(connections.get(child.ID)) || 0;
              const morpherID = getConnectionID(connections.get(deformerID)) || 0;
              const geoID = getConnectionID(connections.get(morpherID)) || 0;

              // assuming geometry is not used in more than one model
              const modelID = getConnectionID(connections.get(geoID)) || 0;

              if (!models) {
                throw new Error('FBXTree.Objects.Model is undefined');
              }

              const rawModel = models[modelID];

              layerCurveNodes[i] = createMorphAnimationNode(rawModel, deformerID, objects);
            }

            assignCurveToNode(layerCurveNodes, i, curveNode);
          }
        }
      });

      layersMap.set(parseInt(nodeID), layerCurveNodes);
    }
  }

  return layersMap;
}