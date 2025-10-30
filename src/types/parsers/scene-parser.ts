/**
 * FBX 场景解析器选项类型
 */

import type { MeshStandardMaterialParameters, Texture, MeshPhongMaterial, BufferGeometry, MeshStandardMaterial, LineBasicMaterial } from 'three';
import type { Deformers } from '../nodes';
import type { ModelInfo } from './type-guards';

export interface FBXMeshStandardMaterialParameters extends MeshStandardMaterialParameters {
  reflectivity?: number,
  specularMap?: Texture,
}

export interface FBXSceneParserOptions {
  deformers: Deformers,
  geoInfoMap?: Map<number, ModelInfo>,
  geometryMap?: Map<number, BufferGeometry>,
  materialMap?: Map<number, MeshPhongMaterial | MeshStandardMaterial | LineBasicMaterial>,
}

export interface SimpleFBXSceneParserOptions {
  wireframe?: boolean,
  generateMipmaps?: boolean,
  flipY?: boolean,
  premultiplyAlpha?: boolean,
}
