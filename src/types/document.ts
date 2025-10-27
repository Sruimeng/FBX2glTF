/**
 * FBX 文档结构类型
 */

import type { FBXTypedProperty } from './base-property';
import type { FBXConnectionNode } from './connection';
import type { Group } from 'three';

export interface FBXTimeStamp {
  Day: number,
  Hour: number,
  Millisecond: number,
  Minute: number,
  Month: number,
  name: string,
  propertyList: unknown[],
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
  propertyList: unknown[],
  Revision: string,
  singleProperty: boolean,
  Subject: string,
  Title: string,
  Version: number,
}

export interface FBXSceneInfo {
  [key: string]: unknown,
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
  propertyList: unknown[],
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
  propertyList: unknown[],
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
  Document: {
    [id: string]: FBXDocument,
  },
  name: string,
  propertyList: unknown[],
  singleProperty: boolean,
}

export interface FBXDocument {
  ActiveAnimStackName: FBXTypedProperty,
  attrType: string,
  id: number,
  name: string,
  propertyList: unknown[],
  RootNode: number,
  singleProperty: boolean,
  SourceObject: FBXTypedProperty,
}

export interface FBXDefinitions {
  Count: number,
  name: string,
  ObjectType: {
    [key: string]: FBXObjectType,
  },
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
  [key: string]: unknown,
  AnimationCurve?: Record<string, any>,
  AnimationCurveNode?: Record<string, any>,
  Deformer?: Record<string, any>,
  Geometry?: Record<string, any>,
  LayeredTexture?: Record<string, any>,
  Material?: Record<string, any>,
  Model?: Record<string, any>,
  name: string,
  NodeAttribute?: Record<string, any>,
  Pose?: Record<string, any>,
  propertyList: unknown[],
  singleProperty: boolean,
  Texture?: Record<string, any>,
  Video?: Record<string, any>,
}

export interface IFBXTree {
  [key: string]: unknown,
  Connections?: any,
  CreationTime?: any,
  Creator?: any,
  Definitions?: FBXDefinitions,
  Documents?: FBXDocuments,
  FBXHeaderExtension?: FBXHeaderExtension,
  FileId?: any,
  GlobalSettings?: FBXGlobalSettings,
  Objects?: FBXObjects,
  References?: any,
}

export class FBXTree implements IFBXTree {
  FBXHeaderExtension?: FBXHeaderExtension;
  FileId?: any;
  CreationTime?: any;
  Creator?: any;
  GlobalSettings?: FBXGlobalSettings;
  Documents?: FBXDocuments;
  References?: any;
  Definitions?: FBXDefinitions;
  Objects?: FBXObjects;
  Connections?: any;
  [key: string]: unknown;
  connections?: FBXConnectionNode[];

  add (key: string, val: unknown) {
    this[key] = val;
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