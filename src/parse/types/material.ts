// 材质相关类型定义
import type { Texture, MeshStandardMaterialParameters } from 'three';
import type { FBXMaterialNode, FBXTextureNode } from '../../constants';

export interface MaterialData {
  id: number,
  material: FBXMaterialNode,
  threeMaterial?: any,
  textures: Map<string, Texture>,
}

export interface TextureData {
  id: number,
  texture: FBXTextureNode,
  image?: HTMLImageElement | ArrayBuffer,
  threeTexture?: Texture,
}

export interface MaterialParseResult {
  materials: Map<number, MaterialData>,
  textures: Map<number, TextureData>,
}

export interface FBXMeshStandardMaterialParameters extends MeshStandardMaterialParameters {
  reflectivity?: number,
  specularMap?: Texture,
}