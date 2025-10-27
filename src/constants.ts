/**
 * @file src/constants.ts
 * @description 全局常量和运行时状态
 * @version 2025.10
 *
 * @remarks
 * - 重构后只保留全局运行时状态
 * - 类型定义已迁移到 /types 目录
 */

import type { IFBXTree, FBXConnectionReference, FBXGeometryData, FBXTextureInfo } from './types/core';
import { Group } from 'three';

/**
 * FBX 解析上下文（旧版）
 * @deprecated 此全局状态将被新的 ParsingContext 架构替代
 */
export interface FBXContext {
  connections: Map<number, { ID: number; relationship?: string }[]>;
  fbxTree: IFBXTree;
  sceneGraph: Group;
}

// 向后兼容的类型定义（用于旧版解析器）
export interface FBXConnection {
  child: number;
  parent: number;
  relationship: string;
}

export interface FBXTreeFactory {
  create(): IFBXTree;
}

export interface FBXEulerOrder {
  value: number;
}

export interface FBXConnectionNode {
  children: Array<{ ID: number; relationship?: string }>;
  parents: Array<{ ID: number; relationship?: string }>;
}

export interface FBXConnectionReference extends FBXConnectionReference {}

export interface FBXGeometryNode extends FBXGeometryData {
  id: number;
  attrName: string;
  attrType: string;
}

export interface FBXLayerElementColor {
  Colors: { a: number[] };
  ColorIndex: { a: number[] };
}

export interface FBXLayerElementNormal {
  Normals: { a: number[] };
  NormalsW: { a: number[] };
}

export interface FBXLayerElementUV {
  UV: { a: number[] };
  UVIndex: { a: number[] };
}

export interface FBXMorphTarget {
  name: string;
  vertices?: { a: number[] };
  normals?: { a: number[] };
}

export interface FBXSkeleton {
  id: number;
  attrName: string;
  attrType: string;
  Transform: { a: number[] };
  TransformLink: { a: number[] };
}

export interface UserDataTransform {
  position: number[];
  rotation: number[];
  scale: number[];
}

export interface Deformers {
  [key: string]: any;
}

export interface FBXMaterialNode {
  id: number;
  attrName: string;
  attrType: string;
}

export interface FBXMeshNode {
  id: number;
  attrName: string;
  attrType: string;
}

export interface FBXModelNode {
  id: number;
  attrName: string;
  attrType: string;
}

export interface FBXPoseNode {
  id: number;
  attrType: string;
  PoseNode?: Array<{
    Node: number | { value: number };
    Matrix?: { a: number[] };
  }>;
  NbPoseNodes?: { value: number };
}

export interface FBXRawTargets {
  [key: string]: any;
}

export interface FBXTextureNode extends FBXTextureInfo {
  id: number;
  attrName: string;
}

export interface RawBone {
  ID: number;
  attrName: string;
  attrType: string;
  Transform: { a: number[] };
  TransformLink: { a: number[] };
}

// 欧拉角枚举
export enum EulerOrder {
  XYZ = 0,
  YZX = 1,
  ZXY = 2,
  XZY = 3,
  YXZ = 4,
  ZYX = 5
}

/**
 * 全局运行时对象
 * @deprecated 此全局状态将被新的 ParsingContext 架构替代
 */
export const global: FBXContext = {
  connections: new Map(),
  fbxTree: {} as IFBXTree,
  sceneGraph: new Group(),
};

// 重新导出新的类型系统，保持向后兼容
export * from './types/core';
