/**
 * FBX 文档结构类型
 */

import type { FBXTypedProperty } from './base-property';
import type { FBXConnectionNode, FBXConnectionDocment } from './connection';
import type { Group } from 'three';
import type { FBXGeometryNode } from './geometry';
import type { FBXMaterialNode } from './material';
import type { FBXTextureNode } from './texture';
import type { FBXVideoNode } from './texture';
import type { FBXModelNode } from './model-animation';
import type { FBXNodeAttribute } from './model-animation';
import type { FBXPoseNode } from './model-animation';
import type { FBXAnimationCurveNode } from './model-animation';
import type { FBXDeformer } from './model-animation';

export interface FBXTimeStamp {
  Day: number,
  Hour: number,
  Millisecond: number,
  Minute: number,
  Month: number,
  name: string,
  propertyList: (string | number)[],
  Second: number,
  singleProperty: boolean,
  Version: number,
  Year: number,
}

export interface FBXMetaData {
  Author: string,
  Comment: string,
  Keywords: string,
  name: string,
  propertyList: (string | number)[],
  Revision: string,
  singleProperty: boolean,
  Subject: string,
  Title: string,
  Version: number,
}

export interface FBXSceneInfo {
  attrName: string,
  DocumentUrl: FBXTypedProperty,
  LastSaved: FBXTypedProperty,
  MetaData: FBXMetaData,
  name: string,
  Original: FBXTypedProperty,
  propertyList: string[],
  singleProperty: boolean,
  SrcDocumentUrl: FBXTypedProperty,
  Type: string,
  Version: number,
}

export interface FBXHeaderExtension {
  CreationTimeStamp: FBXTimeStamp,
  Creator: string,
  EncryptionType: number,
  FBXHeaderVersion: number,
  FBXVersion: number,
  name: string,
  propertyList: (string | number)[],
  SceneInfo: FBXSceneInfo,
  singleProperty: boolean,
}

export interface FBXGlobalSettings {
  AmbientColor: FBXTypedProperty,
  CoordAxis: FBXTypedProperty,
  CoordAxisSign: FBXTypedProperty,
  CurrentTimeMarker: FBXTypedProperty,
  CustomFrameRate: FBXTypedProperty,
  DefaultCamera: FBXTypedProperty,
  FrontAxis: FBXTypedProperty,
  FrontAxisSign: FBXTypedProperty,
  name: string,
  OriginalUnitScaleFactor: FBXTypedProperty,
  OriginalUpAxis: FBXTypedProperty,
  OriginalUpAxisSign: FBXTypedProperty,
  propertyList: (string | number)[],
  singleProperty: boolean,
  SnapOnFrameMode: FBXTypedProperty,
  TimeMarker: FBXTypedProperty,
  TimeMode: FBXTypedProperty,
  TimeProtocol: FBXTypedProperty,
  TimeSpanStart: FBXTypedProperty,
  TimeSpanStop: FBXTypedProperty,
  UnitScaleFactor: FBXTypedProperty,
  UpAxis: FBXTypedProperty,
  UpAxisSign: FBXTypedProperty,
  Version: number,
}

export interface FBXDocuments {
  Count: number,
  Document: Record<string, FBXDocument>,
  name: string,
  propertyList: (string | number)[],
  singleProperty: boolean,
}

export interface FBXAnimationLayer {
  name: string,
  propertyList: (string | number)[],
  singleProperty: boolean,
  attrType: string,
  id: number,
}

export interface FBXAnimationStack {
  name: string,
  propertyList: (string | number)[],
  singleProperty: boolean,
  attrType: string,
  id: number,
  Description?: FBXTypedProperty,
}

export interface FBXDocument {
  ActiveAnimStackName: FBXTypedProperty,
  attrType: string,
  id: number,
  name: string,
  propertyList: (string | number)[],
  RootNode: number,
  singleProperty: boolean,
  SourceObject: FBXTypedProperty,
}

export interface FBXDefinitions {
  Count: number,
  name: string,
  ObjectType: Record<string, FBXObjectType>,
  propertyList: string[],
  singleProperty: boolean,
  Version: number,
}

export interface FBXObjectType {
  Count: number,
  name: string,
  propertyList: string[],
  PropertyTemplate?: FBXPropertyTemplate,
  singleProperty: boolean,
  undefined?: FBXObjectType,
}

export interface FBXPropertyTemplate {
  Description: FBXTypedProperty,
  LocalStart: FBXTypedProperty,
  LocalStop: FBXTypedProperty,
  name: string,
  propertyList: string[],
  ReferenceStart: FBXTypedProperty,
  ReferenceStop: FBXTypedProperty,
  singleProperty: boolean,
}

export interface FBXObjects {
  AnimationCurve?: Record<string, FBXAnimationCurveNode>,
  AnimationCurveNode?: Record<string, FBXAnimationCurveNode>,
  AnimationLayer?: Record<string, FBXAnimationLayer>,
  AnimationStack?: Record<string, FBXAnimationStack>,
  Deformer?: Record<string, FBXDeformer>,
  Geometry?: Record<string, FBXGeometryNode>,
  LayeredTexture?: Record<string, FBXTypedProperty>,
  Material?: Record<string, FBXMaterialNode>,
  Model?: Record<string, FBXModelNode>,
  name: string,
  NodeAttribute?: Record<string, FBXNodeAttribute>,
  Pose?: Record<string, FBXPoseNode>,
  propertyList: (string | number)[],
  singleProperty: boolean,
  Texture?: Record<string, FBXTextureNode>,
  Video?: Record<string, FBXVideoNode>,
}

export interface FBXObjectsWithIndex extends FBXObjects {
  [key: number]: FBXAnimationCurveNode | FBXAnimationLayer | FBXAnimationStack | FBXDeformer | FBXGeometryNode | FBXTypedProperty | FBXMaterialNode | FBXModelNode | FBXNodeAttribute | FBXPoseNode | FBXTextureNode | FBXVideoNode,
}

export interface IFBXTree {
  Connections?: FBXConnectionDocment,
  CreationTime?: FBXTypedProperty,
  Creator?: FBXTypedProperty,
  Definitions?: FBXDefinitions,
  Documents?: FBXDocuments,
  FBXHeaderExtension?: FBXHeaderExtension,
  FileId?: FBXTypedProperty,
  GlobalSettings?: FBXGlobalSettings,
  Objects?: FBXObjects,
  PoseNode?: Record<string, FBXPoseNode>,
  References?: FBXTypedProperty,
}

export interface IFBXTreeWithIndex extends IFBXTree {
  [key: string]: FBXConnectionDocment | FBXTypedProperty | FBXDefinitions | FBXDocuments | FBXHeaderExtension | FBXObjects | Record<string, FBXPoseNode> | string | number | boolean | object | undefined,
}

export class FBXTree implements IFBXTreeWithIndex {
  FBXHeaderExtension?: FBXHeaderExtension;
  FileId?: FBXTypedProperty;
  CreationTime?: FBXTypedProperty;
  Creator?: FBXTypedProperty;
  GlobalSettings?: FBXGlobalSettings;
  Documents?: FBXDocuments;
  References?: FBXTypedProperty;
  Definitions?: FBXDefinitions;
  Objects?: FBXObjects;
  Connections?: FBXConnectionDocment;
  PoseNode?: Record<string, FBXPoseNode>;
  connections?: FBXConnectionNode[];

  [key: string]: FBXConnectionDocment | FBXTypedProperty | FBXDefinitions | FBXDocuments | FBXHeaderExtension | FBXObjects | Record<string, FBXPoseNode> | string | number | boolean | object | undefined;

  add (key: string, val: string | number | boolean | object) {
    (this as any)[key] = val;
  }
}

export interface FBXDocumentOptions {
  fbxConnections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree,
  sceneGraph?: Group,
}

export interface FBXHeaderInfo {
  title?: string,
  subject?: string,
  author?: string,
  keywords?: string,
  revision?: string,
  comment?: string,
}

export interface Global {
  connections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree,
  sceneGraph: Group,
  wireframe?: boolean,
}