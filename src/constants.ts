/**
 * @file src/constants.ts
 * @description 全局常量和运行时状态
 * @version 2025.10
 *
 * @remarks
 * - 重构后只保留全局运行时状态
 * - 类型定义已迁移到 /types 目录
 */

import type { IFBXTree, FBXGeometryData, FBXTextureInfo } from './types/core';
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

export class FBXTreeFactory {
  private tree: IFBXTree;

  constructor() {
    this.tree = {
      objects: {},
      connections: {},
      Objects: {},
    };
  }

  create(): IFBXTree {
    return this.tree;
  }

  add(name: string, node: any): void {
    this.tree.objects = this.tree.objects || {};
    this.tree.objects[name] = node;
  }

  addConnection(connection: any): void {
    this.tree.connections = this.tree.connections || {};
    if (!this.tree.connections.C) {
      this.tree.connections.C = [];
    }
    this.tree.connections.C.push(connection);
  }

  build(): IFBXTree {
    return this.tree;
  }

  setHeader(header: any): void {
    this.tree.header = header;
  }

  setGlobalSettings(settings: any): void {
    this.tree.settings = settings;
  }

  addObject(category: string, id: string, object: any): void {
    this.tree.Objects = this.tree.Objects || {};
    this.tree.Objects[category] = this.tree.Objects[category] || {};
    this.tree.Objects[category][id] = object;
  }
}

// FBX 欧拉角枚举
export enum FBXEulerOrder {
  Order_XYZ = 0,
  Order_YZX = 1,
  Order_ZXY = 2,
  Order_XZY = 3,
  Order_YXZ = 4,
  Order_ZYX = 5,
  SphericXYZ = 6,
}

export interface FBXConnectionNode {
  children: Array<{ ID: number; relationship?: string }>;
  parents: Array<{ ID: number; relationship?: string }>;
}

export interface FBXConnectionReference {
  ID: number;
  relationship?: string;
}

export interface FBXGeometryNode extends FBXGeometryData {
  id: number;
  attrName: string;
  attrType: string;
  Vertices?: { a: number[] };
  PolygonVertexIndex?: { a: number[] };
  LayerElementNormal?: {
    Normals?: { a: number[] };
    NormalsW?: { a: number[] };
  };
  LayerElementUV?: {
    UV?: { a: number[] };
    UVIndex?: { a: number[] };
  };
  LayerElementColor?: {
    Colors?: { a: number[] };
    ColorIndex?: { a: number[] };
  };
  LayerElementMaterial?: {
    Materials?: { a: number[] };
  };
  Indexes?: { a: number[] };
  // 允许数字索引访问
  [key: number]: any;
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
  rawTargets?: any[];
  position?: number[]; // for MorphTarget
}

export interface FBXSkeleton {
  id: number;
  attrName: string;
  attrType: string;
  Transform: { a: number[] };
  TransformLink: { a: number[] };
  rawBones?: any[];
}

export interface UserDataTransform {
  position: number[];
  rotation: number[];
  scale: number[];
  inheritType?: number;
  translation?: number[];
  preRotation?: number[];
  postRotation?: number[];
  eulerOrder?: number;
  scalingOffset?: number[];
  scalingPivot?: number[];
  rotationOffset?: number[];
  rotationPivot?: number[];
  parentMatrixWorld?: any;
  parentMatrix?: any;
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
