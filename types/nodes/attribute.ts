/**
 * @file /types/nodes/attribute.ts
 * @description Camera and Light attribute nodes definition
 */

import type { FBXNode, FBXValue } from '../shared';

/**
 * FBX Camera attribute node
 */
export interface FBXCameraNodeAttribute extends FBXNode {
  id: number,
  attrName: string,
  attrType: string,

  CameraProjectionType?: FBXValue<string>,
  NearPlane?: FBXValue<number>,
  FarPlane?: FBXValue<number>,
  AspectWidth?: FBXValue<number>,
  AspectHeight?: FBXValue<number>,
  FieldOfView?: FBXValue<number>,
  FocalLength?: FBXValue<number>,
}

// Light attributes are defined in light.ts to avoid conflicts