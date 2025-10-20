/**
 * @file /utils/transform/matrix-utils.ts
 * @description 矩阵相关工具函数
 */

import * as THREE from 'three';

/**
 * 矩阵工具命名空间
 */
export namespace MatrixUtils {
  /**
   * 分解矩阵为位置、旋转、缩放
   * @param matrix 输入矩阵
   * @returns 包含位置、旋转、缩放的对象
   */
  export function decomposeMatrix (matrix: THREE.Matrix4): {
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3,
  } {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    matrix.decompose(position, quaternion, scale);

    // Convert quaternion to Euler
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);

    return { position, rotation, scale };
  }

  /**
   * 从位置、旋转、缩放组合矩阵
   * @param position 位置向量
   * @param rotation 旋转四元数或欧拉角
   * @param scale 缩放向量
   * @param order 旋转顺序（可选）
   * @returns 组合后的矩阵
   */
  export function composeMatrix (
    position: THREE.Vector3,
    rotation: THREE.Quaternion | THREE.Euler,
    scale?: THREE.Vector3,
    order?: string
  ): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();

    let finalRotation: THREE.Quaternion;

    if (rotation instanceof THREE.Euler) {
      if (order) {
        rotation.order = order as THREE.EulerOrder;
      }
      finalRotation = new THREE.Quaternion().setFromEuler(rotation);
    } else {
      finalRotation = rotation;
    }

    matrix.compose(position, finalRotation, scale || new THREE.Vector3(1, 1, 1));

    return matrix;
  }

  /**
   * 矩阵转置
   * @param matrix 输入矩阵
   * @returns 转置后的矩阵
   */
  export function transposeMatrix (matrix: THREE.Matrix4): THREE.Matrix4 {
    return new THREE.Matrix4().copy(matrix).transpose();
  }

  /**
   * 计算矩阵的逆矩阵
   * @param matrix 输入矩阵
   * @returns 逆矩阵
   */
  export function invertMatrix (matrix: THREE.Matrix4): THREE.Matrix4 | null {
    const result = new THREE.Matrix4().copy(matrix);

    if (!result.invert()) {
      return null;
    }

    return result;
  }

  /**
   * 矩阵乘法
   * @param a 矩阵A
   * @param b 矩阵B
   * @returns 乘积矩阵
   */
  export function multiplyMatrices (a: THREE.Matrix4, b: THREE.Matrix4): THREE.Matrix4 {
    return new THREE.Matrix4().multiplyMatrices(b, a);
  }

  /**
   * 创建单位矩阵
   * @returns 单位矩阵
   */
  export function createIdentityMatrix (): THREE.Matrix4 {
    return new THREE.Matrix4();
  }

  /**
   * 创建平移矩阵
   * @param x X轴平移量
   * @param y Y轴平移量
   * @param z Z轴平移量
   * @returns 平移矩阵
   */
  export function createTranslationMatrix (x: number, y: number, z: number): THREE.Matrix4 {
    return new THREE.Matrix4().makeTranslation(x, y, z);
  }

  /**
   * 创建旋转矩阵（绕轴旋转）
   * @param axis 旋转轴
   * @param angle 旋转角度（弧度）
   * @returns 旋转矩阵
   */
  export function createRotationMatrix (axis: THREE.Vector3, angle: number): THREE.Matrix4 {
    return new THREE.Matrix4().makeRotationAxis(axis, angle);
  }

  /**
   * 创建缩放矩阵
   * @param x X轴缩放因子
   * @param y Y轴缩放因子
   * @param z Z轴缩放因子
   * @returns 缩放矩阵
   */
  export function createScaleMatrix (x: number, y: number, z: number): THREE.Matrix4 {
    return new THREE.Matrix4().makeScale(x, y, z);
  }

  /**
   * 判断矩阵是否为单位矩阵
   * @param matrix 输入矩阵
   * @param tolerance 容差值
   * @returns 是否为单位矩阵
   */
  export function isIdentityMatrix (matrix: THREE.Matrix4, tolerance: number = 1e-6): boolean {
    const elements = matrix.elements;
    const identityElements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];

    return elements.every((value, index) => Math.abs(value - identityElements[index]) < tolerance);
  }

  /**
   * 比较两个矩阵是否相等
   * @param a 矩阵A
   * @param b 矩阵B
   * @param tolerance 容差值
   * @returns 是否相等
   */
  export function matricesEqual (
    a: THREE.Matrix4,
    b: THREE.Matrix4,
    tolerance: number = 1e-6
  ): boolean {
    const elementsA = a.elements;
    const elementsB = b.elements;

    return elementsA.every((value, index) => Math.abs(value - elementsB[index]) < tolerance);
  }
}
