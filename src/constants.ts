/**
 * @file constants.ts
 * @description FBX解析器常量定义
 */

import type { IFBXTree } from './types/core/fbx-types';

// 全局变量声明（为了兼容原始Three.js FBXLoader）
export const global = typeof window !== 'undefined' ? window : {};

// FBX相关常量
export const FBX_VERSION_MIN = 6400;
export const FBX_VERSION_MIN_ASCII = 7000;

// FBX欧拉角枚举
export enum FBXEulerOrder {
  XYZ = 0,
  XZY = 1,
  YXZ = 2,
  YZX = 3,
  ZXY = 4,
  ZYX = 5,
  SphericXYZ = 6
}

// FBX连接类型
export enum FBXConnectionType {
  OO = 'OO',       // Object to Object
  OP = 'OP',       // Object to Property
  PO = 'PO',       // Property to Object
  PP = 'PP'        // Property to Property
}

// FBX节点类型
export enum FBXNodeType {
  Model = 'Model',
  Geometry = 'Geometry',
  Material = 'Material',
  Texture = 'Texture',
  Video = 'Video',
  AnimationStack = 'AnimationStack',
  AnimationLayer = 'AnimationLayer',
  AnimationCurveNode = 'AnimationCurveNode',
  AnimationCurve = 'AnimationCurve',
  Deformer = 'Deformer',
  Pose = 'Pose',
  GlobalSettings = 'GlobalSettings',
  Documents = 'Documents',
  References = 'References',
  Definitions = 'Definitions',
  Objects = 'Objects',
  Connections = 'Connections',
  Takes = 'Takes'
}

// FBX属性类型
export enum FBXPropertyType {
  Boolean = 'bool',
  Integer16 = 'int16',
  Integer32 = 'int',
  Integer64 = 'int64',
  Float32 = 'float',
  Float64 = 'double',
  String = 'string',
  Binary = 'binary',
  Vector2 = 'Vector2D',
  Vector3 = 'Vector3D',
  Color = 'Color',
  ColorRGB = 'ColorRGB',
  Matrix4x4 = 'Matrix4x4',
  DateTime = 'DateTime'
}

// FBX工厂类
export class FBXTreeFactory {
  private tree: Partial<IFBXTree> = {};

  addConnection (connection: any): void {
    this.tree.connections = this.tree.connections || {};
    if (!this.tree.connections.C) {
      this.tree.connections.C = [];
    }
    (this.tree.connections as any).C.push(connection);
  }

  build (): IFBXTree {
    return this.tree as IFBXTree;
  }

  setHeader (header: any): void {
    (this.tree as any).header = header;
  }

  setGlobalSettings (settings: any): void {
    this.tree.settings = settings;
  }

  addObject (category: string, id: string, object: any): void {
    this.tree.Objects = this.tree.Objects || {};
    (this.tree.Objects as any)[category] = (this.tree.Objects as any)[category] || {};
    (this.tree.Objects as any)[category][id] = object;
  }
}

// 默认FBX树
export const DEFAULT_FBX_TREE: IFBXTree = {
  objects: {},
  connections: { C: [] },
  settings: {},
  time: {},
  version: 0,
  root: undefined,
  Objects: {},
};

// 常用的转换系数
export const FBX_CONVERSION_FACTORS = {
  // FBX中缩放通常是100，需要转换为1
  SCALE_FACTOR: 0.01,

  // 角度转换为弧度
  DEG_TO_RAD: Math.PI / 180,

  // 颜色值归一化
  COLOR_NORMALIZATION: 1 / 255,
};

// 错误代码
export const FBX_ERROR_CODES = {
  INVALID_FORMAT: 'INVALID_FORMAT',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  PARSE_ERROR: 'PARSE_ERROR',
  MISSING_DATA: 'MISSING_DATA',
  INVALID_CONNECTION: 'INVALID_CONNECTION',
  CORRUPTED_DATA: 'CORRUPTED_DATA',
} as const;

export type FBXErrorCodeType = typeof FBX_ERROR_CODES[keyof typeof FBX_ERROR_CODES];