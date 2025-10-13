/**
 * @file /types/nodes/material.ts
 * @description Material 节点定义
 */

import { FBXNode, FBXValue } from '../shared';

export interface FBXMaterialNode extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;

  Version: number;
  ShadingModel: FBXValue<string>;
  MultiLayer: FBXValue<number>;
  Properties70: {
    DiffuseColor: FBXValue<number[]>;
    SpecularColor: FBXValue<number[]>;
    AmbientColor: FBXValue<number[]>;
    EmissiveColor: FBXValue<number[]>;
    ReflectionColor: FBXValue<number[]>;
    TransparentColor: FBXValue<number[]>;
    Shininess: FBXValue<number>;
    Opacity: FBXValue<number>;
    Reflectivity: FBXValue<number>; // ReflectionFactor in older versions
    // ... 其他PBR等材质属性
  };
}