/**
 * FBX 动画工具函数
 */

import type { EulerOrder } from 'three';
import { MathUtils, Euler, Quaternion } from 'three';
import type { AnimationCurve } from '../../types';
import { getEulerOrder } from '../utils';

/**
 * 获取所有轴的时间
 * @param curves 曲线
 * @returns 时间数组
 */
export function getTimesForAllAxes (curves: {
  morph?: AnimationCurve,
  x?: AnimationCurve,
  y?: AnimationCurve,
  z?: AnimationCurve,
}): number[] {
  let times: number[] = [];

  // first join together the times for each axis, if defined
  if (curves.x !== undefined) {
    times = times.concat(curves.x.times);
  }
  if (curves.y !== undefined) {
    times = times.concat(curves.y.times);
  }
  if (curves.z !== undefined) {
    times = times.concat(curves.z.times);
  }

  // then sort them
  times = times.sort(function (a, b) {
    return a - b;
  });

  // and remove duplicates
  if (times.length > 1) {
    let targetIndex = 1;
    let lastValue = times[0];

    for (let i = 1; i < times.length; i++) {
      const currentValue = times[i];

      if (currentValue !== lastValue) {
        times[targetIndex] = currentValue;
        lastValue = currentValue;
        targetIndex++;
      }
    }

    times = times.slice(0, targetIndex);
  }

  return times;
}

/**
 * 获取关键帧轨道值
 * @param times 时间数组
 * @param curves 曲线
 * @param initialValue 初始值
 * @returns 值数组
 */
export function getKeyframeTrackValues (
  times: number[],
  curves: {
    morph?: AnimationCurve,
    x: AnimationCurve,
    y: AnimationCurve,
    z: AnimationCurve,
  },
  initialValue: [number, number, number],
): (number | undefined)[] {
  const prevValue = initialValue;
  const values: (number | undefined)[] = [];

  let xIndex = -1;
  let yIndex = -1;
  let zIndex = -1;

  times.forEach(function (time) {
    if (curves.x) { xIndex = curves.x.times.indexOf(time); }
    if (curves.y) { yIndex = curves.y.times.indexOf(time); }
    if (curves.z) { zIndex = curves.z.times.indexOf(time); }

    // if there is an x value defined for this frame, use that
    if (xIndex !== -1) {
      const xValue = curves.x.values[xIndex];

      values.push(xValue);
      prevValue[0] = xValue;
    } else {
      // otherwise use the x value from the previous frame
      values.push(prevValue[0]);
    }

    if (yIndex !== -1) {
      const yValue = curves.y.values[yIndex];

      values.push(yValue);
      prevValue[1] = yValue;
    } else {
      values.push(prevValue[1]);
    }

    if (zIndex !== -1) {
      const zValue = curves.z.values[zIndex];

      values.push(zValue);
      prevValue[2] = zValue;
    } else {
      values.push(prevValue[2]);
    }
  });

  return values;
}

/**
 * 插值旋转
 * @param curvex X轴曲线
 * @param curvey Y轴曲线
 * @param curvez Z轴曲线
 * @param eulerOrder 欧拉角顺序
 * @returns [时间数组, 值数组]
 */
export function interpolateRotations (
  curvex: AnimationCurve,
  curvey: AnimationCurve,
  curvez: AnimationCurve,
  eulerOrder: EulerOrder,
): [number[], number[]] {
  const times: number[] = [];
  const values: number[] = [];

  // Add first frame
  times.push(curvex.times[0]);
  values.push(MathUtils.degToRad(curvex.values[0]));
  values.push(MathUtils.degToRad(curvey.values[0]));
  values.push(MathUtils.degToRad(curvez.values[0]));

  for (let i = 1; i < curvex.values.length; i++) {
    const initialValue: [number, number, number] = [
      curvex.values[i - 1],
      curvey.values[i - 1],
      curvez.values[i - 1],
    ];

    if (isNaN(initialValue[0]) || isNaN(initialValue[1]) || isNaN(initialValue[2])) {
      continue;
    }

    const initialValueRad = initialValue.map(MathUtils.degToRad);

    const currentValue: [number, number, number] = [
      curvex.values[i],
      curvey.values[i],
      curvez.values[i],
    ];

    if (isNaN(currentValue[0]) || isNaN(currentValue[1]) || isNaN(currentValue[2])) {
      continue;
    }

    const currentValueRad = currentValue.map(MathUtils.degToRad);

    const valuesSpan: [number, number, number] = [
      currentValue[0] - initialValue[0],
      currentValue[1] - initialValue[1],
      currentValue[2] - initialValue[2],
    ];

    const absoluteSpan: [number, number, number] = [
      Math.abs(valuesSpan[0]),
      Math.abs(valuesSpan[1]),
      Math.abs(valuesSpan[2]),
    ];

    if (absoluteSpan[0] >= 180 || absoluteSpan[1] >= 180 || absoluteSpan[2] >= 180) {
      const maxAbsSpan = Math.max(...absoluteSpan);
      const numSubIntervals = maxAbsSpan / 180;

      const E1 = new Euler(
        initialValueRad[0],
        initialValueRad[1],
        initialValueRad[2],
        eulerOrder,
      );
      const E2 = new Euler(
        currentValueRad[0],
        currentValueRad[1],
        currentValueRad[2],
        eulerOrder,
      );

      const Q1 = new Quaternion().setFromEuler(E1);
      const Q2 = new Quaternion().setFromEuler(E2);

      // Check unroll
      if (Q1.dot(Q2)) {
        Q2.set(-Q2.x, -Q2.y, -Q2.z, -Q2.w);
      }

      // Interpolate
      const initialTime = curvex.times[i - 1];
      const timeSpan = (curvex.times[i]) - initialTime;

      const Q = new Quaternion();
      const E = new Euler();

      for (let t = 0; t < 1; t += 1 / numSubIntervals) {
        Q.copy(Q1.clone().slerp(Q2.clone(), t));

        times.push(initialTime + t * timeSpan);
        E.setFromQuaternion(Q, eulerOrder);

        values.push(E.x);
        values.push(E.y);
        values.push(E.z);
      }
    } else {
      times.push(curvex.times[i]);
      values.push(MathUtils.degToRad(curvex.values[i]));
      values.push(MathUtils.degToRad(curvey.values[i]));
      values.push(MathUtils.degToRad(curvez.values[i]));
    }
  }

  return [times, values];
}

/**
 * 获取默认欧拉角顺序
 * @returns 欧拉角顺序
 */
export function getDefaultEulerOrder (): EulerOrder {
  const eulerOrderStr = getEulerOrder(0);

  return eulerOrderStr as EulerOrder;
}