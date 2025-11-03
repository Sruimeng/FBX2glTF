/**
 * FBX 动画轨道生成器
 */

import type { EulerOrder } from 'three';
import {
  AnimationClip,
  Euler,
  MathUtils,
  NumberKeyframeTrack,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from 'three';
import type { IParsingContext, AnimationCurve, AnimationCurveRelationship, AnimationNode } from '../../types';
import { getTimesForAllAxes, getKeyframeTrackValues, interpolateRotations } from './animation-utils';

/**
 * 生成动画片段
 * @param rawClip 原始动画片段
 * @param context 解析上下文
 * @returns Three.js 动画片段
 */
export function addClip (rawClip: AnimationNode[], context: IParsingContext): AnimationClip {
  const tracks: (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] = [];

  rawClip.forEach(rawTracks => {
    const generatedTracks = generateTracks(rawTracks, context);

    tracks.push(...generatedTracks);
  });

  // 使用第一个节点的模型名称作为动画片段名称
  const name = rawClip.length > 0 ? rawClip[0].modelName : 'Animation';

  return new AnimationClip(name, -1, tracks);
}

/**
 * 生成轨道
 * @param rawTracks 原始轨道数据
 * @param context 解析上下文
 * @returns 轨道数组
 */
export function generateTracks (
  rawTracks: AnimationNode,
  context: IParsingContext
): (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] {
  const tracks: (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] = [];

  let initialPosition: Vector3 | [number, number, number] = new Vector3();
  let initialScale: Vector3 | [number, number, number] = new Vector3();

  if (rawTracks.transform) {
    rawTracks.transform.decompose(initialPosition, new Quaternion(), initialScale);
  }

  initialPosition = initialPosition.toArray();
  initialScale = initialScale.toArray();

  if (rawTracks.T !== undefined && Object.keys(rawTracks.T.curves ?? {}).length > 0) {
    const positionTrack = generateVectorTrack(
      rawTracks.modelName,
      rawTracks.T.curves as AnimationCurveRelationship,
      initialPosition,
      'position',
    );

    if (positionTrack !== undefined) {
      tracks.push(positionTrack);
    }
  }

  if (rawTracks.R !== undefined && Object.keys(rawTracks.R.curves ?? {}).length > 0) {
    if (rawTracks.R.curves) {
      const rotationTrack = generateRotationTrack(
        rawTracks.modelName,
        rawTracks.R.curves,
        rawTracks.preRotation ?? [0, 0, 0],
        rawTracks.postRotation ?? [0, 0, 0],
        rawTracks.eulerOrder || 'ZYX',
      );

      if (rotationTrack !== undefined) {
        tracks.push(rotationTrack);
      }
    }
  }

  if (rawTracks.S !== undefined && Object.keys(rawTracks.S.curves ?? {}).length > 0) {
    if (rawTracks.S.curves) {
      const scaleTrack = generateVectorTrack(
        rawTracks.modelName,
        rawTracks.S.curves,
        initialScale,
        'scale',
      );

      if (scaleTrack !== undefined) {
        tracks.push(scaleTrack);
      }
    }
  }

  if (rawTracks.DeformPercent !== undefined) {
    const morphTrack = generateMorphTrack(rawTracks, context);

    if (morphTrack !== undefined) {
      tracks.push(morphTrack);
    }
  }

  return tracks;
}

/**
 * 生成向量轨道
 * @param modelName 模型名称
 * @param curves 曲线
 * @param initialValue 初始值
 * @param type 类型
 * @returns 向量轨道
 */
export function generateVectorTrack (
  modelName: string,
  curves: { x: AnimationCurve, y: AnimationCurve, z: AnimationCurve },
  initialValue: [number, number, number],
  type: string,
): VectorKeyframeTrack | undefined {
  // 确保所有必需的曲线都存在
  if (!curves.x || !curves.y || !curves.z) {
    return undefined;
  }

  const times = getTimesForAllAxes(curves);
  const values = getKeyframeTrackValues(times, curves, initialValue);
  const numberValues: number[] = values.map((v: any) => typeof v === 'number' ? v : Number(v));

  return new VectorKeyframeTrack(modelName + '.' + type, times, numberValues);
}

/**
 * 生成旋转轨道
 * @param modelName 模型名称
 * @param curves 曲线
 * @param preRotation 预旋转
 * @param postRotation 后旋转
 * @param eulerOrder 欧拉角顺序
 * @returns 旋转轨道
 */
export function generateRotationTrack (
  modelName: string,
  curves: { x?: AnimationCurve, y?: AnimationCurve, z?: AnimationCurve },
  preRotation: [number, number, number],
  postRotation: [number, number, number],
  eulerOrder: EulerOrder,
): QuaternionKeyframeTrack {
  let times;
  let values;
  let preRotationQuat: number[] | Euler | Quaternion = preRotation;
  let postRotationQuat: number[] | Euler | Quaternion = postRotation;

  if (curves.x !== undefined && curves.y !== undefined && curves.z !== undefined) {
    const result = interpolateRotations(curves.x, curves.y, curves.z, eulerOrder);

    times = result[0];
    values = result[1];
  }

  // For Maya models using "Joint Orient", Euler order only applies to rotation, not pre/post-rotations
  const defaultEulerOrder: EulerOrder = 'ZYX';

  if (preRotationQuat !== undefined) {
    preRotationQuat = preRotationQuat.map(MathUtils.degToRad);

    preRotationQuat = new Euler(
      preRotationQuat[0],
      preRotationQuat[1],
      preRotationQuat[2],
      defaultEulerOrder,
    );
    preRotationQuat = new Quaternion().setFromEuler(preRotationQuat);
  }

  if (postRotationQuat !== undefined) {
    postRotationQuat = postRotationQuat.map(MathUtils.degToRad);

    postRotationQuat = new Euler(
      postRotationQuat[0],
      postRotationQuat[1],
      postRotationQuat[2],
      defaultEulerOrder,
    );
    postRotationQuat = new Quaternion().setFromEuler(postRotationQuat).invert();
  }

  const quaternion = new Quaternion();
  const euler = new Euler();
  const quaternionValues: number[] = [];

  if (!values || !times) {
    return new QuaternionKeyframeTrack(modelName + '.quaternion', [0], [0]);
  }

  for (let i = 0; i < values.length; i += 3) {
    euler.set(values[i], values[i + 1], values[i + 2], eulerOrder);
    quaternion.setFromEuler(euler);

    if (preRotationQuat !== undefined) {
      quaternion.premultiply(preRotationQuat);
    }
    if (postRotationQuat !== undefined) {
      quaternion.multiply(postRotationQuat);
    }

    // Check unroll
    if (i > 2) {
      const prevQuat = new Quaternion().fromArray(quaternionValues, ((i - 3) / 3) * 4);

      if (prevQuat.dot(quaternion) < 0) {
        quaternion.set(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
      }
    }

    quaternion.toArray(quaternionValues, (i / 3) * 4);
  }

  return new QuaternionKeyframeTrack(modelName + '.quaternion', times, quaternionValues);
}

/**
 * 生成变形轨道
 * @param rawTracks 原始轨道数据
 * @param context 解析上下文
 * @returns 变形轨道
 */
export function generateMorphTrack (
  rawTracks: AnimationNode,
  context: IParsingContext
): NumberKeyframeTrack {
  const curves = rawTracks.DeformPercent?.curves?.morph;

  if (!curves) {
    throw new Error('curves is undefined');
  }

  const sceneGraph = context.sceneGraph;

  if (!sceneGraph) {
    throw new Error('sceneGraph is undefined');
  }

  const values = curves.values.map(val => val / 100) || [];
  const sceneObject = sceneGraph.getObjectByName(rawTracks.modelName);

  if (!sceneObject || !('morphTargetDictionary' in sceneObject)) {
    throw new Error(`Morph target dictionary not found for model: ${rawTracks.modelName}`);
  }

  const morphTargetDictionary = sceneObject.morphTargetDictionary as Record<string, number>;
  const morphNum = morphTargetDictionary[rawTracks.morphName ?? ''] ?? 0;

  return new NumberKeyframeTrack(
    rawTracks.modelName + '.morphTargetInfluences[' + morphNum + ']',
    curves.times,
    values,
  );
}