// 变换工具函数
import type { FBXTransformData } from '../../constants';
import type { EulerOrder } from 'three';
import { Matrix4, Euler, Vector3, MathUtils } from 'three';

const tempVec = new Vector3();

// 生成变换矩阵
export function generateTransform (transformData: FBXTransformData): Matrix4 {
  const lTranslationM = new Matrix4();
  const lPreRotationM = new Matrix4();
  const lRotationM = new Matrix4();
  const lPostRotationM = new Matrix4();
  const lScalingM = new Matrix4();
  const lScalingPivotM = new Matrix4();
  const lScalingOffsetM = new Matrix4();
  const lRotationOffsetM = new Matrix4();
  const lRotationPivotM = new Matrix4();
  // const lParentGX = new Matrix4(); // 未使用，注释掉
  // const lParentLX = new Matrix4(); // 未使用，注释掉
  const lGlobalT = new Matrix4();

  const inheritType = transformData.inheritType || 0;

  if (transformData.translation) {
    lTranslationM.setPosition(tempVec.fromArray(transformData.translation));
  }
  if (transformData.preRotation) {
    const preRotationEuler = new Euler(
      MathUtils.degToRad(transformData.preRotation[0]),
      MathUtils.degToRad(transformData.preRotation[1]),
      MathUtils.degToRad(transformData.preRotation[2]),
      'XYZ'
    );

    lPreRotationM.makeRotationFromEuler(preRotationEuler);
  }
  if (transformData.rotation) {
    const rotationEuler = new Euler(
      MathUtils.degToRad(transformData.rotation[0]),
      MathUtils.degToRad(transformData.rotation[1]),
      MathUtils.degToRad(transformData.rotation[2]),
      (transformData.eulerOrder as EulerOrder) || 'XYZ'
    );

    lRotationM.makeRotationFromEuler(rotationEuler);
  }
  if (transformData.postRotation) {
    const postRotationEuler = new Euler(
      MathUtils.degToRad(transformData.postRotation[0]),
      MathUtils.degToRad(transformData.postRotation[1]),
      MathUtils.degToRad(transformData.postRotation[2]),
      'XYZ'
    );

    lPostRotationM.makeRotationFromEuler(postRotationEuler).invert();
  }
  if (transformData.scale) {
    lScalingM.scale(tempVec.fromArray(transformData.scale));
  }

  // 矩阵组合
  const lGlobalRS = new Matrix4();

  if (inheritType === 0) {
    lGlobalRS.copy(lPreRotationM).multiply(lRotationM).multiply(lPostRotationM);
  } else if (inheritType === 1) {
    lGlobalRS.copy(lPreRotationM).multiply(lRotationM);
  } else {
    lGlobalRS.copy(lRotationM);
  }

  const lLegacyR = new Matrix4();

  if (transformData.rotationOffset) {
    lRotationOffsetM.setPosition(tempVec.fromArray(transformData.rotationOffset));
    lLegacyR.copy(lRotationOffsetM).multiply(lGlobalRS);
  } else {
    lLegacyR.copy(lGlobalRS);
  }

  if (transformData.rotationPivot) {
    lRotationPivotM.setPosition(tempVec.fromArray(transformData.rotationPivot));
    lLegacyR.multiply(lRotationPivotM);
  }

  if (transformData.scalingOffset) {
    lScalingOffsetM.setPosition(tempVec.fromArray(transformData.scalingOffset));
    lGlobalT.copy(lScalingOffsetM).multiply(lLegacyR);
  } else {
    lGlobalT.copy(lLegacyR);
  }

  if (transformData.scalingPivot) {
    lScalingPivotM.setPosition(tempVec.fromArray(transformData.scalingPivot));
    lGlobalT.multiply(lScalingPivotM).multiply(lScalingM).multiply(lScalingPivotM.invert());
  } else {
    lGlobalT.multiply(lScalingM);
  }

  lGlobalT.multiply(lTranslationM);

  return lGlobalT;
}