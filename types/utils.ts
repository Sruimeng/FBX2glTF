/**
 * @file /types/utils.ts
 * @description 辅助类型与工具函数声明
 */

import { FBXEulerOrder } from './enums';

import { EulerOrder } from 'three';

/**
 * 将 FBX Euler Order 转换为 three.js EulerOrder
 */
export function toThreeEulerOrder(fbxOrder: FBXEulerOrder): EulerOrder {
  const map: Record<FBXEulerOrder, EulerOrder> = {
    [FBXEulerOrder.XYZ]: 'XYZ',
    [FBXEulerOrder.YXZ]: 'YXZ',
    [FBXEulerOrder.ZXY]: 'ZXY',
    [FBXEulerOrder.XZY]: 'XZY',
    [FBXEulerOrder.YZX]: 'YZX',
    [FBXEulerOrder.ZYX]: 'ZYX',
    [FBXEulerOrder.SphericXYZ]: 'XYZ', // fallback
  };
  return map[fbxOrder] || 'XYZ';
}