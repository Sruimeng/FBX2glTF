/**
 * @file /types/nodes/texture.ts
 * @description Texture 节点定义
 */

import { FBXNode, FBXValue } from '../shared';

export interface FBXTextureNode extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;

  FileName: string;
  RelativeFilename: string;
  TextureName: string;
  Type: string;
  Version: number;
  Translation?: FBXValue<number[]>;
  Scaling?: FBXValue<number[]>;
}