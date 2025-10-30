/**
 * FBX 动画曲线解析器
 */

import type { AnimationCurve, CurveNode, FBXAnimationCurveNode } from '../../types';
import { convertFBXTimeToSeconds } from '../utils';

// 本地接口定义
interface FBXAnimationCurve {
  id?: number,
  KeyTime?: { a: number[] },
  KeyValueFloat?: { a: number[] },
}

interface ProcessedAnimationCurve extends AnimationCurve {
  id: number,
  times: number[],
  values: number[],
}

/**
 * 解析动画曲线节点
 * @param objects FBX对象集合
 * @returns 曲线节点映射
 */
export function parseAnimationCurveNodes (objects: any): Map<number, CurveNode> {
  if (!objects) {
    throw new Error('FBXTree.Objects is undefined');
  }

  const rawCurveNodes = objects.AnimationCurveNode;
  const curveNodesMap: Map<number, CurveNode> = new Map();

  for (const nodeID in rawCurveNodes) {
    const rawCurveNode: FBXAnimationCurveNode = rawCurveNodes[nodeID];
    const attrName = rawCurveNode.attrName || '';
    const id = rawCurveNode.id || rawCurveNode.ID || 0;

    if (attrName.match(/S|R|T|DeformPercent/) !== null) {
      const curveNode: CurveNode = {
        attr: attrName,
        curves: {
          morph: {
            id: 0,
            times: [],
            values: [],
          },
          x: {
            id: 0,
            times: [],
            values: [],
          },
          y: {
            id: 0,
            times: [],
            values: [],
          },
          z: {
            id: 0,
            times: [],
            values: [],
          },
        },
        id,
      };

      curveNodesMap.set(curveNode.id, curveNode);
    }
  }

  return curveNodesMap;
}

/**
 * 解析动画曲线
 * @param objects FBX对象集合
 * @param curveNodesMap 曲线节点映射
 * @param connections 连接关系
 */
export function parseAnimationCurves (
  objects: any,
  curveNodesMap: Map<number, CurveNode>,
  connections: Map<number, any>
): void {
  if (!objects) {
    throw new Error('FBXTree.Objects is undefined');
  }

  const rawCurves = objects.AnimationCurve;

  for (const nodeID in rawCurves) {
    const rawCurve: FBXAnimationCurve = rawCurves[nodeID];
    const id = rawCurve.id || 0;
    const animationCurve: ProcessedAnimationCurve = {
      id,
      times: rawCurve.KeyTime ? rawCurve.KeyTime.a.map(convertFBXTimeToSeconds) : [],
      values: rawCurve.KeyValueFloat ? rawCurve.KeyValueFloat.a : [],
    };

    const relationships = connections.get(animationCurve.id);

    if (relationships !== undefined) {
      const parent = relationships.parents[0];

      if (parent && typeof parent.ID !== 'undefined') {
        const animationCurveID = parent.ID;
        const animationCurveRelationship = parent.relationship;

        // 检查 relationship 是否是字符串
        if (typeof animationCurveRelationship === 'string') {
          // 检查 curveNodesMap 中是否存在该 ID
          const curveNode = curveNodesMap.get(animationCurveID);

          if (curveNode) {
            if (animationCurveRelationship.match(/X/)) {
              if (curveNode.curves) {
                curveNode.curves.x = animationCurve;
              }
            } else if (animationCurveRelationship.match(/Y/)) {
              if (curveNode.curves) {
                curveNode.curves.y = animationCurve;
              }
            } else if (animationCurveRelationship.match(/Z/)) {
              if (curveNode.curves) {
                curveNode.curves.z = animationCurve;
              }
            } else if (animationCurveRelationship.match(/DeformPercent/)) {
              if (curveNode.curves) {
                curveNode.curves.morph = animationCurve;
              }
            }
          }
        }
      }
    }
  }
}