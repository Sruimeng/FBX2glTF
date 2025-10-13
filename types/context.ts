/**
 * @file /types/context.ts
 * @description 运行时上下文定义
 */

import { Group, Matrix4, EulerOrder } from 'three';
import { IFBXTree } from './tree';
import { FBXConnectionNode } from './connections';

/**
 * FBX 加载运行时上下文
 */
export interface FBXContext {
  connections: Record<number, FBXConnectionNode>;
  fbxTree: IFBXTree;
  sceneGraph: Group;
}

/**
 * 全局运行时对象
 */
export const global: FBXContext = {
  connections: {},
  fbxTree: {} as IFBXTree,
  sceneGraph: new Group(),
};

/**
 * FBX 节点的变换信息
 */
export interface FBXTransform {
  eulerOrder?: EulerOrder;
  inheritType?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  preRotation?: number[];
  postRotation?: number[];
  rotationPivot?: number[];
  scalingPivot?: number[];
  parentMatrix?: Matrix4;
  parentMatrixWorld?: Matrix4;
}