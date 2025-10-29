/**
 * FBX 解析器类型安全工具函数
 * 统一的类型守卫和安全的值提取方法
 */

import type { BufferGeometry, Object3D } from 'three';

/**
 * 几何体信息接口
 */
export interface GeometryInfo {
  isPBR: boolean,
  isTextured: boolean,
  isUVMapped: boolean,
  polygons: number,
  quads: number,
  triangles: number,
  vertices: number,
}

/**
 * 模型信息接口（GeometryInfo的别名，用于向后兼容）
 */
export interface ModelInfo extends GeometryInfo {}

/**
 * 具有FBX变形器的几何体接口
 */
export interface GeometryWithDeformer extends BufferGeometry {
  FBX_Deformer: string,
}

/**
 * 检查是否为数字字符串
 */
export function isNumericString (value: string): value is `${number}` {
  return /^-?\d*\.?\d+$/.test(value);
}

/**
 * 检查是否为连接值格式
 */
export function isConnectionValue (value: string): boolean {
  return value.includes(',') && /^\d+,\d+/.test(value);
}

/**
 * 检查是否为数组终止格式
 */
export function isArrayTerminated (value: string): boolean {
  return value.endsWith(',');
}

/**
 * 类型安全地提取数字数组
 */
export function extractNumberArray (value: unknown): number[] | null {
  if (Array.isArray(value) && value.every(item => typeof item === 'number')) {
    return value as number[];
  }
  if (value && typeof value === 'object' && 'a' in value) {
    const arrayValue = (value as { a: unknown }).a;

    if (Array.isArray(arrayValue) && arrayValue.every(item => typeof item === 'number')) {
      return arrayValue as number[];
    }
  }

  return null;
}

/**
 * 类型安全地提取节点ID
 */
export function extractNodeId (poseNode: unknown): number | null {
  if (poseNode && typeof poseNode === 'object') {
    if ('Node' in poseNode && typeof (poseNode as { Node: unknown }).Node === 'number') {
      return (poseNode as { Node: number }).Node;
    }
  }

  return null;
}

/**
 * 类型安全地提取矩阵数组
 */
export function extractMatrixArray (poseNode: unknown): number[] {
  if (poseNode && typeof poseNode === 'object') {
    if ('Matrix' in poseNode && (poseNode as { Matrix: { a: unknown } }).Matrix.a) {
      const matrixA = (poseNode as { Matrix: { a: unknown } }).Matrix.a;

      if (Array.isArray(matrixA) && matrixA.every(item => typeof item === 'number')) {
        return matrixA as number[];
      }
    }
  }

  return [];
}

/**
 * 类型安全地提取material参数值
 */
export function extractMaterialValue (param: unknown): number | string | null {
  if (param === null || param === undefined) {
    return null;
  }
  if (typeof param === 'object' && 'value' in param) {
    const value = (param as { value: unknown }).value;

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
      return value[0];
    }
  }

  return null;
}

/**
 * 类型安全地提取material数组值
 */
export function extractMaterialArray (param: unknown): number[] | null {
  if (param === null || param === undefined) {
    return null;
  }
  if (typeof param === 'object' && 'value' in param) {
    const value = (param as { value: unknown }).value;

    if (Array.isArray(value) && value.every(item => typeof item === 'number')) {
      return value as number[];
    }
  }

  return null;
}

/**
 * 检查对象是否为有效的FBX属性值
 */
export function isValidFBXPropertyValue (value: unknown): value is string | number | boolean | number[] {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every(item => typeof item === 'number'))
  );
}

/**
 * 检查是否为有效的FBX连接引用
 */
export function isValidFBXConnectionReference (obj: unknown): obj is { ID: number, relationship?: string } {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'ID' in obj &&
    typeof (obj as any).ID === 'number'
  );
}

/**
 * 检查是否为有效的FBX变形器
 */
export function isValidFBXDeformer (obj: unknown): obj is { attrType: string, [key: string]: unknown } {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'attrType' in obj &&
    typeof (obj as any).attrType === 'string'
  );
}

/**
 * 检查是否为有效的FBX几何体信息
 */
export function isValidGeometryInfo (obj: unknown): obj is {
  isPBR: boolean,
  isTextured: boolean,
  isUVMapped: boolean,
  polygons: number,
  quads: number,
  triangles: number,
  vertices: number,
} {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'isPBR' in obj &&
    'isTextured' in obj &&
    'isUVMapped' in obj &&
    'polygons' in obj &&
    'quads' in obj &&
    'triangles' in obj &&
    'vertices' in obj &&
    typeof (obj as any).isPBR === 'boolean' &&
    typeof (obj as any).isTextured === 'boolean' &&
    typeof (obj as any).isUVMapped === 'boolean' &&
    typeof (obj as any).polygons === 'number' &&
    typeof (obj as any).quads === 'number' &&
    typeof (obj as any).triangles === 'number' &&
    typeof (obj as any).vertices === 'number'
  );
}

/**
 * 检查是否为有效的FBX变换数据
 */
export function isValidUserDataTransform (obj: unknown): obj is {
  eulerOrder?: string,
  inheritType?: number,
  translation?: number[],
  rotation?: number[],
  scale?: number[],
  preRotation?: number[],
  postRotation?: number[],
  rotationOffset?: number[],
  rotationPivot?: number[],
  scalingOffset?: number[],
  scalingPivot?: number[],
  parentMatrix?: any,
  parentMatrixWorld?: any,
} {
  return !!(obj && typeof obj === 'object');
}

/**
 * 安全的字符串到数字转换
 */
export function safeParseNumber (value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);

    return isNaN(parsed) ? defaultValue : parsed;
  }

  return defaultValue;
}

/**
 * 安全的字符串到布尔值转换
 */
export function safeParseBoolean (value: unknown, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }

  return defaultValue;
}

/**
 * 安全的三维数组提取
 */
export function extractVector3Array (value: unknown): [number, number, number] | null {
  const array = extractNumberArray(value);

  if (array && array.length >= 3) {
    return [array[0], array[1], array[2]];
  }

  return null;
}

/**
 * 安全的四维数组提取
 */
export function extractVector4Array (value: unknown): [number, number, number, number] | null {
  const array = extractNumberArray(value);

  if (array && array.length >= 4) {
    return [array[0], array[1], array[2], array[3]];
  }

  return null;
}

/**
 * 检查对象是否有指定的属性
 */
export function hasProperty <K extends string> (obj: unknown, property: K): obj is Record<K, unknown> {
  return obj != null && typeof obj === 'object' && property in obj;
}

/**
 * 安全地获取对象属性
 */
export function safeGetProperty <T> (obj: unknown, property: string, defaultValue: T): T {
  if (hasProperty(obj, property)) {
    const value = (obj)[property];

    return (value as T) ?? defaultValue;
  }

  return defaultValue;
}

/**
 * 安全地为对象设置ID属性
 */
export function setObjectID <T> (obj: T, id: number): T & { ID: number } {

  (obj as T & { ID: number }).ID = id;

  return obj as T & { ID: number };
}

/**
 * 安全地检查对象是否有target属性
 */
export function hasTarget (obj: unknown): obj is { target: Object3D } {
  return obj != null && typeof obj === 'object' && 'target' in obj;
}