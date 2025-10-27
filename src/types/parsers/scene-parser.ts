/**
 * FBX 场景解析器选项类型
 */

import type { MeshStandardMaterialParameters, Texture, MeshPhongMaterial, BufferGeometry, MeshStandardMaterial, LineBasicMaterial } from 'three';
import type { FBXMorphTarget, FBXSkeleton } from '../nodes';

export interface FBXMeshStandardMaterialParameters extends MeshStandardMaterialParameters {
  reflectivity?: number,
  specularMap?: Texture,
}

export interface FBXSceneParserOptions {
  deformers: {
    morphTargets: Record<string, FBXMorphTarget>,
    skeletons: Record<string, FBXSkeleton>,
  },
  geoInfoMap?: Map<number, unknown>,
  geometryMap?: Map<number, BufferGeometry>,
  materialMap?: Map<number, MeshPhongMaterial | MeshStandardMaterial | LineBasicMaterial>,
}

export interface SimpleFBXSceneParserOptions {
  wireframe?: boolean,
  generateMipmaps?: boolean,
  flipY?: boolean,
  premultiplyAlpha?: boolean,
}