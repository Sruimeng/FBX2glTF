/**
 * @file /types/nodes/light.ts
 * @description Light 节点定义
 */

import type { FBXNode } from '../shared';

export interface FBXLightNodeAttribute extends FBXNode {
  id: number,
  attrName: string,
  attrType: string,

  LightType?: { value: number },
  Color?: { value: number[] },
  Intensity?: { value: number },
  CastLightOnObject?: { value: number },
  FarAttenuationEnd?: { value: number },
  EnableFarAttenuation?: { value: number },
  InnerAngle?: { value: number },
  OuterAngle?: { value: number },
  CastShadows?: { value: number },
}