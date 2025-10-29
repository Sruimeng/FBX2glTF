/**
 * FBX 纹理相关类型
 */

import type { VideoContent } from '../parsers';
import type { FBXTypedProperty } from './base-property';

export interface FBXTextureNode {
  attrName: string,
  attrType: string,
  FileName: string,
  id: number,
  Media: string,
  name: string,
  propertyList: Array<number | string>,
  RelativeFilename: string,
  Scaling: FBXTypedProperty,
  singleProperty: boolean,
  TextureName: string,
  Translation: FBXTypedProperty,
  Type: string,
  UseMaterial: {
    flag: string,
    type: string,
    type2: string,
    value: number,
  },
  Version: number,
  WrapModeU: {
    value: number,
  },
  WrapModeV: {
    value: number,
  },
}

export interface FBXVideoNode {
  attrName: string,
  attrType: string,
  Content: VideoContent,
  Filename: string,
  flag: string,
  id: number,
  name: string,
  Path: string,
  propertyList: Array<string | number>,
  RelativeFilename: string,
  singleProperty: boolean,
  Type: string,
  type: string,
  type2: string,
  UseMipMap: number,
  value: string,
}