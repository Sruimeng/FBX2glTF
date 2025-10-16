/**
 * @file /types/nodes/material.ts
 * @description Material 节点定义
 */

import type { FBXNode, FBXValue } from '../shared';

export interface FBXMaterialNode extends FBXNode {
  id: number,
  attrName: string,
  attrType: string,

  Version: number,
  ShadingModel: FBXValue<string>,
  MultiLayer: FBXValue<number>,
  Properties70: {
    DiffuseColor: FBXValue<number[]>,
    SpecularColor: FBXValue<number[]>,
    AmbientColor: FBXValue<number[]>,
    EmissiveColor: FBXValue<number[]>,
    ReflectionColor: FBXValue<number[]>,
    TransparentColor: FBXValue<number[]>,
    Shininess: FBXValue<number>,
    Opacity: FBXValue<number>,
    Reflectivity: FBXValue<number>, // ReflectionFactor in older versions
    // ... 其他PBR等材质属性
  },
  // Additional properties for backward compatibility
  BumpFactor?: FBXValue<number>,
  DisplacementFactor?: FBXValue<number>,
  Emissive?: FBXValue<number[]>,
  EmissiveColor?: FBXValue<number[]>,
  EmissiveFactor?: FBXValue<number>,
  TransparencyFactor?: FBXValue<number>,
  Opacity?: FBXValue<number>,
  TransparentColor?: FBXValue<number[]>,
  ReflectionFactor?: FBXValue<number>,
  Shininess?: FBXValue<number>,
  Specular?: FBXValue<number[]>,
  SpecularColor?: FBXValue<number[]>,
}