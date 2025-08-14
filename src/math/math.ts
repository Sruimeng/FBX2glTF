// 数学工具模块 - 基于@maxellabs/math的数学运算
import {
  Vector2,
  Vector3,
  Vector4,
  Matrix3,
  Matrix4,
  Quaternion,
  Euler,
  Color,
  degToRad,
  radToDeg,
  clamp,
  mapLinear,
  PI2,
  DEG2RAD,
  RAD2DEG,
  NumberEpsilon,
} from '@maxellabs/math';

import { FBXEulerOrder } from '../constants';

// 导出类型以便与现有代码兼容
export type {
  Vector2,
  Vector3,
  Vector4,
  Matrix3,
  Matrix4,
  Quaternion,
  Euler,
  Color,
} from '@maxellabs/math';

// FBX欧拉角顺序映射到@maxellabs/math的欧拉角顺序
const FBX_EULER_ORDER_MAP: Record<FBXEulerOrder, string> = {
  [FBXEulerOrder.ZYX]: 'ZYX',
  [FBXEulerOrder.YZX]: 'YZX',
  [FBXEulerOrder.XZY]: 'XZY',
  [FBXEulerOrder.ZXY]: 'ZXY',
  [FBXEulerOrder.YXZ]: 'YXZ',
  [FBXEulerOrder.XYZ]: 'XYZ',
  [FBXEulerOrder.SphericXYZ]: 'XYZ', // 不支持球面坐标，回退到XYZ
};

// 常量
export const MathConstants = {
  PI: Math.PI,
  PI2: PI2,
  DEG2RAD: DEG2RAD,
  RAD2DEG: RAD2DEG,
  EPSILON: NumberEpsilon,
};

// 角度转换
export function getEulerOrder (order: FBXEulerOrder): string {
  order = order || 0;

  if (order === FBXEulerOrder.SphericXYZ) {
    console.warn('FBX2glTF: unsupported Euler Order: Spherical XYZ. Animations and rotations may be incorrect.');

    return FBX_EULER_ORDER_MAP[FBXEulerOrder.XYZ];
  }

  return FBX_EULER_ORDER_MAP[order];
}

// FBX时间转换为秒
export function convertFBXTimeToSeconds (time: number): number {
  // Convert an FBX time value to seconds
  // An FBX time value is a 64-bit integer representing the number of 46186158000 Hz ticks
  return time / 46186158000;
}

// 获取数据（保持与原函数相同的接口）
export function getData (
  polygonVertexIndex: number,
  polygonIndex: number,
  vertexIndex: number,
  infoObject: any
): number {
  let index: number;

  switch (infoObject.mappingType) {
    case 'ByPolygonVertex':
      index = polygonVertexIndex;

      break;
    case 'ByPolygon':
      index = polygonIndex;

      break;
    case 'ByVertice':
      index = vertexIndex;

      break;
    case 'AllSame':
      index = infoObject.indices[0];

      break;
    default:
      console.warn('FBX2glTF: unknown attribute mapping type ' + infoObject.mappingType);
      index = 0;
  }

  if (infoObject.referenceType === 'IndexToDirect') {
    index = infoObject.indices[index];
  }

  return index;
}

// 向量创建函数
export function createVector2 (x: number = 0, y: number = 0): Vector2 {
  return new Vector2(x, y);
}

export function createVector3 (x: number = 0, y: number = 0, z: number = 0): Vector3 {
  return new Vector3(x, y, z);
}

export function createVector4 (x: number = 0, y: number = 0, z: number = 0, w: number = 0): Vector4 {
  return new Vector4(x, y, z, w);
}

// 矩阵创建函数
export function createMatrix3 (): Matrix3 {
  return new Matrix3();
}

export function createMatrix4 (): Matrix4 {
  return new Matrix4();
}

// 四元数创建函数
export function createQuaternion (x: number = 0, y: number = 0, z: number = 0, w: number = 1): Quaternion {
  return new Quaternion(x, y, z, w);
}

// 欧拉角创建函数
export function createEuler (x: number = 0, y: number = 0, z: number = 0, order: string = 'XYZ'): Euler {
  return new Euler(x, y, z, order as any);
}

// 颜色创建函数
export function createColor (r: number = 1, g: number = 1, b: number = 1): Color {
  return new Color(r, g, b);
}

// 矩阵运算
export function multiplyMatrices (a: Matrix4, b: Matrix4): Matrix4 {
  const result = new Matrix4();
  return Matrix4.multiply(a, b, result);
}

export function invertMatrix4 (matrix: Matrix4): Matrix4 {
  const result = new Matrix4();
  result.copyFrom(matrix);
  result.invert();
  return result;
}

export function transposeMatrix4 (matrix: Matrix4): Matrix4 {
  const result = new Matrix4();
  result.copyFrom(matrix);
  result.transpose();
  return result;
}

export function determinantMatrix4 (matrix: Matrix4): number {
  return matrix.determinant();
}

// 变换组合
export function composeMatrix4 (
  position: Vector3,
  quaternion: Quaternion,
  scale: Vector3
): Matrix4 {
  const result = new Matrix4();

  result.compose(position, quaternion, scale);

  return result;
}

export function decomposeMatrix4 (matrix: Matrix4): {
  position: Vector3,
  quaternion: Quaternion,
  scale: Vector3,
} {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();

  matrix.decompose(position, quaternion, scale);

  return { position, quaternion, scale };
}

// 向量运算
export function normalizeVector (vec: Vector3): Vector3 {
  const result = new Vector3();

  result.copy(vec);
  result.normalize();

  return result;
}

export function crossVectors (a: Vector3, b: Vector3): Vector3 {
  return new Vector3().crossVectors(a, b);
}

export function dotVectors (a: Vector3, b: Vector3): number {
  return a.dot(b);
}

export function distanceBetween (a: Vector3, b: Vector3): number {
  return a.distanceTo(b);
}

export function lengthVector (vec: Vector3): number {
  return vec.length();
}

export function lengthSquaredVector (vec: Vector3): number {
  return vec.lengthSquared();
}

// 角度运算
export function angleBetween (a: Vector3, b: Vector3): number {
  return a.angleTo(b);
}

export function angleBetween2D (a: Vector2, b: Vector2): number {
  return a.angleTo(b);
}

// 插值函数
export function lerpNumber (start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function lerpVectors (a: Vector3, b: Vector3, t: number): Vector3 {
  return new Vector3().lerpVectors(a, b, t);
}

export function lerpVectors2D (a: Vector2, b: Vector2, t: number): Vector2 {
  return new Vector2().lerpVectors(a, b, t);
}

export function slerpQuaternions (a: Quaternion, b: Quaternion, t: number): Quaternion {
  return new Quaternion().slerpQuaternions(a, b, t);
}

// 投影和反射
export function reflectVector (vec: Vector3, normal: Vector3): Vector3 {
  return new Vector3().reflect(normal);
}

export function projectVector (vec: Vector3, onto: Vector3): Vector3 {
  return new Vector3().project(onto);
}

// 随机函数
export function randomVector3 (): Vector3 {
  return new Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
}

export function randomVector2 (): Vector2 {
  return new Vector2(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
}

export function randomFloat (min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 数学工具函数
export function clampNumber (value: number, min: number, max: number): number {
  return clamp(value, min, max);
}

export function mapNumber (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return mapLinear(value, inMin, inMax, outMin, outMax);
}

export function smoothstep (edge0: number, edge1: number, x: number): number {
  const t = clampNumber((x - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

export function smootherstep (edge0: number, edge1: number, x: number): number {
  const t = clampNumber((x - edge0) / (edge1 - edge0), 0, 1);

  return t * t * t * (t * (t * 6 - 15) + 10);
}

// 坐标转换
export function degreesToRadians (degrees: number): number {
  return degToRad(degrees);
}

export function radiansToDegrees (radians: number): number {
  return radToDeg(radians);
}

// 欧拉角和四元数转换
export function eulerToQuaternionFunc (euler: Euler): Quaternion {
  return new Quaternion().setFromEuler(euler);
}

export function quaternionToEulerFunc (quaternion: Quaternion, order: string = 'XYZ'): Euler {
  const euler = new Euler();

  euler.setFromQuaternion(quaternion, order);

  return euler;
}

// 矩阵-向量变换
export function transformVector3 (vector: Vector3, matrix: Matrix4): Vector3 {
  const result = new Vector3();

  result.copy(vector);
  result.applyMatrix4(matrix);

  return result;
}

export function transformDirection (vector: Vector3, matrix: Matrix4): Vector3 {
  const result = new Vector3();

  result.copy(vector);
  result.transformDirection(matrix);

  return result;
}

export function transformNormal (normal: Vector3, matrix: Matrix4): Vector3 {
  const normalMatrix = new Matrix3().getNormalMatrix(matrix);
  const result = new Vector3();

  result.copy(normal);
  result.applyMatrix3(normalMatrix);

  return result;
}

// 向量数组操作
export function createVector3Array (length: number): Vector3[] {
  return Array(length).fill(null).map(() => new Vector3());
}

export function createVector2Array (length: number): Vector2[] {
  return Array(length).fill(null).map(() => new Vector2());
}

export function createMatrix4Array (length: number): Matrix4[] {
  return Array(length).fill(null).map(() => new Matrix4());
}

export function createQuaternionArray (length: number): Quaternion[] {
  return Array(length).fill(null).map(() => new Quaternion());
}

// 数组操作
export function flattenVector3Array (vectors: Vector3[]): Float32Array {
  const result = new Float32Array(vectors.length * 3);

  vectors.forEach((vec, i) => {
    result[i * 3] = vec.x;
    result[i * 3 + 1] = vec.y;
    result[i * 3 + 2] = vec.z;
  });

  return result;
}

export function flattenVector2Array (vectors: Vector2[]): Float32Array {
  const result = new Float32Array(vectors.length * 2);

  vectors.forEach((vec, i) => {
    result[i * 2] = vec.x;
    result[i * 2 + 1] = vec.y;
  });

  return result;
}

export function flattenMatrix4Array (matrices: Matrix4[]): Float32Array {
  const result = new Float32Array(matrices.length * 16);

  matrices.forEach((mat, i) => {
    const elements = mat.toArray();

    for (let j = 0; j < 16; j++) {
      result[i * 16 + j] = elements[j];
    }
  });

  return result;
}

// 几何体工具
export function calculateTriangleNormal (a: Vector3, b: Vector3, c: Vector3): Vector3 {
  const ab = subtractVectors(b, a);
  const ac = subtractVectors(c, a);

  return normalizeVector(crossVectors(ab, ac));
}

export function calculateTriangleArea (a: Vector3, b: Vector3, c: Vector3): number {
  const ab = subtractVectors(b, a);
  const ac = subtractVectors(c, a);
  const cross = crossVectors(ab, ac);

  return lengthVector(cross) * 0.5;
}

export function calculateBoundingBox (vectors: Vector3[]): { min: Vector3, max: Vector3 } {
  if (vectors.length === 0) {
    return {
      min: new Vector3(Infinity, Infinity, Infinity),
      max: new Vector3(-Infinity, -Infinity, -Infinity),
    };
  }

  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);

  vectors.forEach(vec => {
    min.x = Math.min(min.x, vec.x);
    min.y = Math.min(min.y, vec.y);
    min.z = Math.min(min.z, vec.z);
    max.x = Math.max(max.x, vec.x);
    max.y = Math.max(max.y, vec.y);
    max.z = Math.max(max.z, vec.z);
  });

  return { min, max };
}

export function calculateBoundingSphere (vectors: Vector3[]): { center: Vector3, radius: number } {
  const { min, max } = calculateBoundingBox(vectors);
  const center = addVectors(min, max).multiplyScalar(0.5);

  let maxDistance = 0;

  vectors.forEach(vec => {
    const distance = distanceBetween(vec, center);

    maxDistance = Math.max(maxDistance, distance);
  });

  return { center, radius: maxDistance };
}

// 动画工具
export function easeInOutCubic (t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInOutQuad (t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeInOutSine (t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// 颜色工具
export function rgbToHsl (r: number, g: number, b: number): { h: number, s: number, l: number } {
  const color = new Color(r, g, b);

  return color.getHSL({ h: 0, s: 0, l: 0 });
}

export function hslToRgb (h: number, s: number, l: number): { r: number, g: number, b: number } {
  const color = new Color();

  color.setHSL(h, s, l);

  return { r: color.r, g: color.g, b: color.b };
}

export function hexToRgb (hex: string): { r: number, g: number, b: number } {
  const color = new Color(hex);

  return { r: color.r, g: color.g, b: color.b };
}

export function rgbToHex (r: number, g: number, b: number): string {
  const color = new Color(r, g, b);

  return color.getHexString();
}

// 数值比较
export function approximatelyEqual (a: number, b: number, epsilon: number = NumberEpsilon): boolean {
  return Math.abs(a - b) < epsilon;
}

export function isZero (value: number, epsilon: number = NumberEpsilon): boolean {
  return Math.abs(value) < epsilon;
}

export function isPowerOfTwo (value: number): boolean {
  return (value & (value - 1)) === 0;
}

export function nearestPowerOfTwo (value: number): number {
  return Math.pow(2, Math.round(Math.log(value) / Math.log(2)));
}

// 内存工具
export function disposeVector3 (vectors: Vector3[]): void {
  vectors.forEach(vec => {
    // @maxellabs/math的Vector3可能没有dispose方法
    // 这里预留接口
  });
}

export function disposeMatrix4 (matrices: Matrix4[]): void {
  matrices.forEach(mat => {
    // @maxellabs/math的Matrix4可能没有dispose方法
    // 这里预留接口
  });
}

export function disposeQuaternion (quaternions: Quaternion[]): void {
  quaternions.forEach(q => {
    // @maxellabs/math的Quaternion可能没有dispose方法
    // 这里预留接口
  });
}

// 调试工具
export function vector3ToString (vec: Vector3): string {
  return `Vector3(${vec.x.toFixed(3)}, ${vec.y.toFixed(3)}, ${vec.z.toFixed(3)})`;
}

export function matrix4ToString (mat: Matrix4): string {
  const elements = mat.toArray();

  return `Matrix4([
    ${elements[0].toFixed(3)}, ${elements[1].toFixed(3)}, ${elements[2].toFixed(3)}, ${elements[3].toFixed(3)},
    ${elements[4].toFixed(3)}, ${elements[5].toFixed(3)}, ${elements[6].toFixed(3)}, ${elements[7].toFixed(3)},
    ${elements[8].toFixed(3)}, ${elements[9].toFixed(3)}, ${elements[10].toFixed(3)}, ${elements[11].toFixed(3)},
    ${elements[12].toFixed(3)}, ${elements[13].toFixed(3)}, ${elements[14].toFixed(3)}, ${elements[15].toFixed(3)}
  ])`;
}

export function quaternionToString (q: Quaternion): string {
  return `Quaternion(${q.x.toFixed(3)}, ${q.y.toFixed(3)}, ${q.z.toFixed(3)}, ${q.w.toFixed(3)})`;
}

// 性能工具
export function createVector3Pool (size: number = 100): Vector3[] {
  const pool: Vector3[] = [];

  for (let i = 0; i < size; i++) {
    pool.push(new Vector3());
  }

  return pool;
}

export function getVector3FromPool (pool: Vector3[]): Vector3 {
  if (pool.length === 0) {
    return new Vector3();
  }

  return pool.pop()!;
}

export function returnVector3ToPool (pool: Vector3[], vector: Vector3): void {
  vector.set(0, 0, 0);
  pool.push(vector);
}