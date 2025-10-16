/**
 * @file /utils/data/array-utils.ts
 * @description 数组数据处理工具函数
 */

import * as THREE from 'three';

/**
 * 数组工具命名空间
 */
export namespace ArrayUtils {
  /**
   * 扁平化数组为三维向量数组
   * @param data 输入数据数组
   * @param stride 步长，默认为3（x,y,z）
   * @returns 三维向量数组
   */
  export function flattenVectorArray(data: number[], stride: number = 3): THREE.Vector3[] {
    const vectors: THREE.Vector3[] = [];
    for (let i = 0; i < data.length; i += stride) {
      const components = data.slice(i, i + stride);
      vectors.push(new THREE.Vector3(...components));
    }
    return vectors;
  }

  /**
   * 扁平化数组为二维向量数组
   * @param data 输入数据数组
   * @returns 二维向量数组
   */
  export function flattenVector2Array(data: number[]): THREE.Vector2[] {
    const vectors: THREE.Vector2[] = [];
    for (let i = 0; i < data.length; i += 2) {
      vectors.push(new THREE.Vector2(data[i], data[i + 1]));
    }
    return vectors;
  }

  /**
   * 扁平化数组为四维向量数组
   * @param data 输入数据数组
   * @returns 四维向量数组
   */
  export function flattenVector4Array(data: number[]): THREE.Vector4[] {
    const vectors: THREE.Vector4[] = [];
    for (let i = 0; i < data.length; i += 4) {
      vectors.push(new THREE.Vector4(data[i], data[i + 1], data[i + 2], data[i + 3]));
    }
    return vectors;
  }

  /**
   * 三维向量数组展平为数值数组
   * @param vectors 三维向量数组
   * @returns 数值数组
   */
  export function flattenVectorsToArrays(vectors: THREE.Vector3[]): number[] {
    const data: number[] = [];
    vectors.forEach(vector => {
      data.push(vector.x, vector.y, vector.z);
    });
    return data;
  }

  /**
   * 二维向量数组展平为数值数组
   * @param vectors 二维向量数组
   * @returns 数值数组
   */
  export function flattenVector2sToArrays(vectors: THREE.Vector2[]): number[] {
    const data: number[] = [];
    vectors.forEach(vector => {
      data.push(vector.x, vector.y);
    });
    return data;
  }

  /**
   * 四维向量数组展平为数值数组
   * @param vectors 四维向量数组
   * @returns 数值数组
   */
  export function flattenVector4sToArrays(vectors: THREE.Vector4[]): number[] {
    const data: number[] = [];
    vectors.forEach(vector => {
      data.push(vector.x, vector.y, vector.z, vector.w);
    });
    return data;
  }

  /**
   * 重塑数组
   * @param input 输入数组
   * @param shape 目标形状 [rows, columns, ...]
   * @returns 重塑后的数组
   */
  export function reshapeArray(input: number[], shape: number[]): number[] {
    if (shape.length === 0) return [];

    let inputIndex = 0;

    // 对于二维数组
    if (shape.length === 2) {
      const result: number[][] = [];
      for (let i = 0; i < shape[0]; i++) {
        result[i] = [];
        for (let j = 0; j < shape[1]; j++) {
          if (inputIndex < input.length) {
            result[i][j] = input[inputIndex++];
          }
        }
      }
      return result.flat();
    }

    // 对于一维数组
    if (shape.length === 1) {
      const result: number[] = [];
      for (let i = 0; i < shape[0] && inputIndex < input.length; i++) {
        result[i] = input[inputIndex++];
      }
      return result;
    }

    // 对于更高维度，递归处理
    const result: any[] = [];
    for (let i = 0; i < shape[0]; i++) {
      const subArray = reshapeArray(input.slice(inputIndex), shape.slice(1));
      result[i] = subArray;
      inputIndex += subArray.length;
    }

    return result.flat();
  }

  /**
   * 数组去重
   * @param array 输入数组
   * @returns 去重后的数组
   */
  export function uniqueArray<T>(array: T[]): T[] {
    return Array.from(new Set(array));
  }

  /**
   * 数组分块
   * @param array 输入数组
   * @param chunkSize 块大小
   * @returns 分块后的二维数组
   */
  export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 计算数组的平均值
   * @param array 输入数组
   * @returns 平均值
   */
  export function average(array: number[]): number {
    if (array.length === 0) return 0;
    return array.reduce((sum, value) => sum + value, 0) / array.length;
  }

  /**
   * 计算数组的和
   * @param array 输入数组
   * @returns 数组和
   */
  export function sum(array: number[]): number {
    return array.reduce((sum, value) => sum + value, 0);
  }

  /**
   * 查找数组中的最大值
   * @param array 输入数组
   * @returns 最大值
   */
  export function max(array: number[]): number {
    return Math.max(...array);
  }

  /**
   * 查找数组中的最小值
   * @param array 输入数组
   * @returns 最小值
   */
  export function min(array: number[]): number {
    return Math.min(...array);
  }

  /**
   * 检查数组是否包含指定值
   * @param array 输入数组
   * @param value 要查找的值
   * @returns 是否包含
   */
  export function contains<T>(array: T[], value: T): boolean {
    return array.includes(value);
  }

  /**
   * 交集运算
   * @param array1 数组A
   * @param array2 数组B
   * @returns 交集数组
   */
  export function intersection<T>(array1: T[], array2: T[]): T[] {
    return array1.filter(item => array2.includes(item));
  }

  /**
   * 差集运算
   * @param array1 数组A
   * @param array2 数组B
   * @returns 差集数组
   */
  export function difference<T>(array1: T[], array2: T[]): T[] {
    return array1.filter(item => !array2.includes(item));
  }

  /**
   * 并集运算
   * @param array1 数组A
   * @param array2 数组B
   * @returns 并集数组
   */
  export function union<T>(array1: T[], array2: T[]): T[] {
    return uniqueArray([...array1, ...array2]);
  }
}