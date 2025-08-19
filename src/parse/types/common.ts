// 通用类型定义
import type { Group, TextureLoader, LoadingManager } from 'three';
import { FBXConnectionNode, IFBXTree } from './fbx-structure';

export interface ParserOptions {
  textureLoader: TextureLoader,
  manager: LoadingManager,
}

export interface ParseContext {
  fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
  sceneGraph: Group,
}

export interface ParserResult {
  scene: Group,
  animations: any[],
  geometries: Map<number, any>,
  materials: Map<number, any>,
  textures: Map<number, any>,
}

export interface ValidationError {
  code: string,
  message: string,
  details?: any,
}
