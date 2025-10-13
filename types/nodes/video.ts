/**
 * @file /types/nodes/video.ts
 * @description Video 节点定义
 */

import { FBXNode, FBXValue } from '../shared';

export interface FBXVideoNode extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;

  Filename: string;
  RelativeFilename: string;
  Content?: ArrayBuffer;
  UseMipMap?: number;
}