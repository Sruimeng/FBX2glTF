// 数学适配器 - 桥接Three.js数学运算和@maxellabs/math
import {
  Vector2 as MaxellVector2,
  Vector3 as MaxellVector3,
  Vector4 as MaxellVector4,
  Matrix4 as MaxellMatrix4,
  Quaternion as MaxellQuaternion,
  Euler as MaxellEuler,
  Color as MaxellColor,
} from '@maxellabs/math';
import {
  Vector2 as ThreeVector2,
  Vector3 as ThreeVector3,
  Vector4 as ThreeVector4,
  Matrix4 as ThreeMatrix4,
  Quaternion as ThreeQuaternion,
  Euler as ThreeEuler,
  Color as ThreeColor,
} from 'three';

export class MathAdapter {
  // Vector2 适配器
  static vector2ToMaxell (vec: ThreeVector2): MaxellVector2 {
    return new MaxellVector2(vec.x, vec.y);
  }

  static vector2ToThree (vec: MaxellVector2): ThreeVector2 {
    return new ThreeVector2(vec.x, vec.y);
  }

  // Vector3 适配器
  static vector3ToMaxell (vec: ThreeVector3): MaxellVector3 {
    return new MaxellVector3(vec.x, vec.y, vec.z);
  }

  static vector3ToThree (vec: MaxellVector3): ThreeVector3 {
    return new ThreeVector3(vec.x, vec.y, vec.z);
  }

  // Vector4 适配器
  static vector4ToMaxell (vec: ThreeVector4): MaxellVector4 {
    return new MaxellVector4(vec.x, vec.y, vec.z, vec.w);
  }

  static vector4ToThree (vec: MaxellVector4): ThreeVector4 {
    return new ThreeVector4(vec.x, vec.y, vec.z, vec.w);
  }

  // Matrix4 适配器
  static matrix4ToMaxell (mat: ThreeMatrix4): MaxellMatrix4 {
    const result = new MaxellMatrix4();
    result.fill(mat.elements);
    return result;
  }

  static matrix4ToThree (mat: MaxellMatrix4): ThreeMatrix4 {
    const result = new ThreeMatrix4();

    result.fromArray(mat.toArray());

    return result;
  }

  // Quaternion 适配器
  static quaternionToMaxell (q: ThreeQuaternion): MaxellQuaternion {
    return new MaxellQuaternion(q.x, q.y, q.z, q.w);
  }

  static quaternionToThree (q: MaxellQuaternion): ThreeQuaternion {
    return new ThreeQuaternion(q.x, q.y, q.z, q.w);
  }

  // Euler 适配器
  static eulerToMaxell (euler: ThreeEuler): MaxellEuler {
    return new MaxellEuler(euler.x, euler.y, euler.z, euler.order as any);
  }

  static eulerToThree (euler: MaxellEuler): ThreeEuler {
    return new ThreeEuler(euler.x, euler.y, euler.z, euler.order as any);
  }

  // Color 适配器
  static colorToMaxell (color: ThreeColor): MaxellColor {
    return new MaxellColor(color.r, color.g, color.b);
  }

  static colorToThree (color: MaxellColor): ThreeColor {
    return new ThreeColor(color.r, color.g, color.b);
  }

  // 工具函数适配器
  static degToRad (degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static radToDeg (radians: number): number {
    return radians * (180 / Math.PI);
  }

  static clamp (value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static lerp (start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  static mapLinear (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
  }

  // 数学运算工具
  static multiplyMatrices (a: ThreeMatrix4, b: ThreeMatrix4): ThreeMatrix4 {
    const result = new ThreeMatrix4();

    result.multiplyMatrices(a, b);

    return result;
  }

  static multiplyVector3Matrix4 (vec: ThreeVector3, mat: ThreeMatrix4): ThreeVector3 {
    const result = new ThreeVector3();

    result.applyMatrix4(mat);

    return result;
  }

  static invertMatrix4 (mat: ThreeMatrix4): ThreeMatrix4 {
    const result = new ThreeMatrix4();

    result.copy(mat);
    result.invert();

    return result;
  }

  static transposeMatrix4 (mat: ThreeMatrix4): ThreeMatrix4 {
    const result = new ThreeMatrix4();

    result.copy(mat);
    result.transpose();

    return result;
  }

  // 向量运算
  static normalizeVector3 (vec: ThreeVector3): ThreeVector3 {
    const result = new ThreeVector3();

    result.copy(vec);
    result.normalize();

    return result;
  }

  static crossVector3 (a: ThreeVector3, b: ThreeVector3): ThreeVector3 {
    return new ThreeVector3().crossVectors(a, b);
  }

  static dotVector3 (a: ThreeVector3, b: ThreeVector3): number {
    return a.dot(b);
  }

  static distanceVector3 (a: ThreeVector3, b: ThreeVector3): number {
    return a.distanceTo(b);
  }

  static lengthVector3 (vec: ThreeVector3): number {
    return vec.length();
  }

  static lengthSquaredVector3 (vec: ThreeVector3): number {
    return vec.lengthSq();
  }

  // 四元数运算
  static multiplyQuaternions (a: ThreeQuaternion, b: ThreeQuaternion): ThreeQuaternion {
    const result = new ThreeQuaternion();

    result.multiplyQuaternions(a, b);

    return result;
  }

  static normalizeQuaternion (q: ThreeQuaternion): ThreeQuaternion {
    const result = new ThreeQuaternion();

    result.copy(q);
    result.normalize();

    return result;
  }

  static slerpQuaternions (a: ThreeQuaternion, b: ThreeQuaternion, t: number): ThreeQuaternion {
    const result = new ThreeQuaternion();

    result.slerpQuaternions(a, b, t);

    return result;
  }

  // 欧拉角转换
  static eulerToQuaternion (euler: ThreeEuler): ThreeQuaternion {
    return new ThreeQuaternion().setFromEuler(euler);
  }

  static quaternionToEuler (q: ThreeQuaternion, order: string = 'XYZ'): ThreeEuler {
    const euler = new ThreeEuler();
    euler.setFromQuaternion(q, order as any);
    return euler;
  }

  // 矩阵-向量转换
  static vector3ApplyMatrix4 (vec: ThreeVector3, mat: ThreeMatrix4): ThreeVector3 {
    const result = new ThreeVector3();

    result.copy(vec);
    result.applyMatrix4(mat);

    return result;
  }

  static vector3ApplyMatrix3 (vec: ThreeVector3, mat: any): ThreeVector3 {
    const result = new ThreeVector3();
    result.copy(vec);
    result.applyMatrix3(mat);
    return result;
  }

  // 变换矩阵操作
  static composeMatrix4 (position: ThreeVector3, quaternion: ThreeQuaternion, scale: ThreeVector3): ThreeMatrix4 {
    const result = new ThreeMatrix4();

    result.compose(position, quaternion, scale);

    return result;
  }

  static decomposeMatrix4 (mat: ThreeMatrix4): {
    position: ThreeVector3,
    quaternion: ThreeQuaternion,
    scale: ThreeVector3,
  } {
    const position = new ThreeVector3();
    const quaternion = new ThreeQuaternion();
    const scale = new ThreeVector3();

    mat.decompose(position, quaternion, scale);

    return { position, quaternion, scale };
  }

  // 创建单位矩阵
  static identityMatrix4 (): ThreeMatrix4 {
    return new ThreeMatrix4();
  }

  // 创建单位四元数
  static identityQuaternion (): ThreeQuaternion {
    return new ThreeQuaternion();
  }

  // 创建零向量
  static zeroVector3 (): ThreeVector3 {
    return new ThreeVector3();
  }

  static zeroVector2 (): ThreeVector2 {
    return new ThreeVector2();
  }

  // 创建单位向量
  static oneVector3 (): ThreeVector3 {
    return new ThreeVector3(1, 1, 1);
  }

  static oneVector2 (): ThreeVector2 {
    return new ThreeVector2(1, 1);
  }

  // 向量加法
  static addVector3 (a: ThreeVector3, b: ThreeVector3): ThreeVector3 {
    return new ThreeVector3().addVectors(a, b);
  }

  static addVector2 (a: ThreeVector2, b: ThreeVector2): ThreeVector2 {
    return new ThreeVector2().addVectors(a, b);
  }

  // 向量减法
  static subtractVector3 (a: ThreeVector3, b: ThreeVector3): ThreeVector3 {
    return new ThreeVector3().subVectors(a, b);
  }

  static subtractVector2 (a: ThreeVector2, b: ThreeVector2): ThreeVector2 {
    return new ThreeVector2().subVectors(a, b);
  }

  // 向量乘法（标量）
  static multiplyVector3 (vec: ThreeVector3, scalar: number): ThreeVector3 {
    return new ThreeVector3().multiplyScalar(scalar);
  }

  static multiplyVector2 (vec: ThreeVector2, scalar: number): ThreeVector2 {
    return new ThreeVector2().multiplyScalar(scalar);
  }

  // 向量除法（标量）
  static divideVector3 (vec: ThreeVector3, scalar: number): ThreeVector3 {
    return new ThreeVector3().divideScalar(scalar);
  }

  static divideVector2 (vec: ThreeVector2, scalar: number): ThreeVector2 {
    return new ThreeVector2().divideScalar(scalar);
  }

  // 向量插值
  static lerpVector3 (a: ThreeVector3, b: ThreeVector3, t: number): ThreeVector3 {
    return new ThreeVector3().lerpVectors(a, b, t);
  }

  static lerpVector2 (a: ThreeVector2, b: ThreeVector2, t: number): ThreeVector2 {
    return new ThreeVector2().lerpVectors(a, b, t);
  }

  // 向量反射
  static reflectVector3 (vec: ThreeVector3, normal: ThreeVector3): ThreeVector3 {
    return new ThreeVector3().reflect(normal);
  }

  // 向量投影
  static projectVector3 (vec: ThreeVector3, onto: ThreeVector3): ThreeVector3 {
    return new ThreeVector3().project(onto);
  }

  // 角度计算
  static angleToVector3 (a: ThreeVector3, b: ThreeVector3): number {
    return a.angleTo(b);
  }

  static angleToVector2 (a: ThreeVector2, b: ThreeVector2): number {
    return a.angle();
  }

  // 随机向量
  static randomVector3 (): ThreeVector3 {
    return new ThreeVector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
  }

  static randomVector2 (): ThreeVector2 {
    return new ThreeVector2(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
  }
}
