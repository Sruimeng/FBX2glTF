/**
 * @file src/constants.ts
 * @description 全局常量和运行时状态
 * @version 2025.10
 *
 * @remarks
 * - 重构后只保留全局运行时状态
 * - 类型定义已迁移到 /types 目录
 */

import { Group } from 'three';
import type { FBXContext, IFBXTree } from '../types';

/**
 * 全局运行时对象
 * @deprecated 此全局状态将被新的 ParsingContext 架构替代
 */
export const global: FBXContext = {
  connections: {},
  fbxTree: {} as IFBXTree,
  sceneGraph: new Group(),
};

// 重新导出新的类型系统，保持向后兼容
export * from '../types';
