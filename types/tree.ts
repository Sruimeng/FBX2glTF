/**
 * @file /types/tree.ts
 * @description FBX 文件顶层树结构
 */

import { FBXNode, FBXValue } from './shared';
import { FBXModelNode } from './nodes/model';
import { FBXGeometryNode } from './nodes/geometry';
import { FBXMaterialNode } from './nodes/material';
import { FBXTextureNode } from './nodes/texture';
import { FBXVideoNode } from './nodes/video';
import {
  FBXAnimationCurve,
  FBXAnimationCurveNode,
  FBXAnimationLayer,
  FBXAnimationStack,
  FBXDeformer
} from './nodes/animation';

/**
 * FBX 文件头信息
 */
export interface FBXHeaderExtension extends FBXNode {
  FBXHeaderVersion?: number;
  FBXVersion?: number;
  EncryptionType?: number;
  CreationTimeStamp?: FBXNode<{
    Version: number;
    Year: number;
    Month: number;
    Day: number;
    Hour: number;
    Minute: number;
    Second: number;
    Millisecond: number;
  }>;
  Creator?: string;
  SceneInfo?: FBXSceneInfo;
}

/**
 * 场景元信息（SceneInfo）
 */
export interface FBXSceneInfo extends FBXNode {
  Type: string;
  Version: number;
  MetaData: FBXNode<{
    Author: string;
    Title: string;
    Subject: string;
    Keywords: string;
    Revision: string;
    Comment: string;
  }>;
  DocumentUrl: FBXValue<string>;
  SrcDocumentUrl: FBXValue<string>;
}

/**
 * 全局设置
 */
export interface FBXGlobalSettings extends FBXNode {
  Version?: number;
  UpAxis?: FBXValue<number>;
  UpAxisSign?: FBXValue<number>;
  FrontAxis?: FBXValue<number>;
  FrontAxisSign?: FBXValue<number>;
  CoordAxis?: FBXValue<number>;
  CoordAxisSign?: FBXValue<number>;
  UnitScaleFactor?: FBXValue<number>;
  DefaultCamera?: FBXValue<string>;
  TimeMode?: FBXValue<number>;
  CustomFrameRate?: FBXValue<number>;
  AmbientColor?: FBXValue<number[]>;
}

/**
 * 文档定义
 */
export interface FBXDocument extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;
  RootNode: number;
}

export interface FBXDocuments extends FBXNode {
  Count: number;
  Document: Record<string, FBXDocument>;
}

/**
 * 对象定义
 */
export interface FBXDefinitions extends FBXNode {
  Version: number;
  Count: number;
  ObjectType: Record<string, FBXObjectType>;
}

export interface FBXObjectType extends FBXNode {
  Count: number;
  PropertyTemplate?: FBXNode<Record<string, FBXValue>>;
}

/**
 * 对象实例容器
 */
export interface FBXObjects extends FBXNode {
  Geometry?: Record<string, FBXGeometryNode>;
  Model?: Record<string, FBXModelNode>;
  Material?: Record<string, FBXMaterialNode>;
  Texture?: Record<string, FBXTextureNode>;
  Video?: Record<string, FBXVideoNode>;
  NodeAttribute?: Record<string, FBXNodeAttribute>;
  AnimationCurve?: Record<string, FBXAnimationCurve>;
  AnimationCurveNode?: Record<string, FBXAnimationCurveNode>;
  AnimationLayer?: Record<string, FBXAnimationLayer>;
  AnimationStack?: Record<string, FBXAnimationStack>;
  Deformer?: Record<string, FBXDeformer>;
  // 添加索引签名以支持动态属性
  [key: string]: unknown;
}

/**
 * 节点属性（例如 Null / Camera / Light）
 */
export interface FBXNodeAttribute extends FBXNode {
  id: number;
  attrName: string;
  attrType: string;
  TypeFlags?: string;
}

/**
 * FBX 文件解析后的根级树接口
 */
export interface IFBXTree {
  FBXHeaderExtension: FBXHeaderExtension;
  FileId: FBXNode;
  CreationTime: FBXNode;
  Creator: FBXNode;
  GlobalSettings: FBXGlobalSettings;
  Documents: FBXDocuments;
  Definitions: FBXDefinitions;
  Objects: FBXObjects;
}
