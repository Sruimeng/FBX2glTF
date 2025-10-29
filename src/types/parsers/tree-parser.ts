/**
 * FBX Tree Parser 类型定义
 * 为 FBXTreeParser 提供完整的类型支持
 */

import type {
  BufferGeometry,
  Group,
  AnimationClip,
  MeshStandardMaterial,
  Texture,
  Object3D,
  LoadingManager,
  TextureLoader,
  Vector3,
} from 'three';
import type {
  IParser,
} from '../core/parser';
import type {
  Deformers,
} from '../nodes';
import type {
  FBXSceneParserOptions,
} from './scene-parser';
import type { ModelInfo } from './type-guards';

/**
 * 具有ID的Three.js对象接口
 */
export interface Object3DWithID extends Object3D {
  ID: number,
}

/**
 * 具有目标的对象接口
 */
export interface ObjectWithTarget {
  target: Object3D,
}

/**
 * 具有位置的目标对象接口
 */
export interface TargetWithPosition {
  target: {
    position: Vector3,
  },
}

/**
 * 几何体组信息接口
 */
export interface GeometryGroup {
  count: number,
  materialIndex: number,
  start: number,
}

/**
 * 场景解析结果接口
 */
export interface SceneParseResult {
  animations: AnimationClip[],
  modelInfo: Record<string, ModelInfo>,
  scene: Group,
  sceneInfo: SceneInfo,
}

/**
 * FBXTree 解析器输入类型
 */
export interface FBXTreeParserInput {
  // 当前 FBXTreeParser 不使用输入参数，设为 null
  null: null,
}

/**
 * 场景信息统计类型
 */
export interface SceneInfo {
  isPBR: boolean,
  isTextured: boolean,
  isUVMapped: boolean,
  polygons: number,
  quads: number,
  topology: string,
  triangles: number,
  vertices: number,
}

/**
 * FBXTree 解析器输出类型
 */
export interface FBXTreeParserResult {
  animations: AnimationClip[],
  modelInfo: Record<string, ModelInfo>,
  scene: Group,
  sceneInfo: SceneInfo,
}

/**
 * 连接数据的原始类型定义
 */
export type RawConnection = [
  fromID: number,
  toID: number,
  relationship: string
];

/**
 * FBXTree 解析器接口
 */
export interface IFBXTreeParser extends IParser<FBXTreeParserInput, Promise<FBXTreeParserResult>> {
  textureLoader: TextureLoader,
  manager: LoadingManager,
  defaultMaterialIndex: number,
}

/**
 * 视频内容类型定义
 */
export type VideoContent = ArrayBuffer | string;

/**
 * 材质参数中的安全值类型
 */
export type SafeMaterialValue = string | number | number[] | boolean;

/**
 * 模型信息映射类型
 */
export type ModelInfoMap = Record<string, ModelInfo>;

/**
 * 几何体映射类型
 */
export type GeometryMap = Map<number, BufferGeometry>;

/**
 * 材质映射类型
 */
export type MaterialMap = Map<number, MeshStandardMaterial>;

/**
 * 图像映射类型
 */
export type ImageMap = Record<number, string>;

/**
 * 纹理映射类型
 */
export type TextureMap = Map<number, Texture>;

/**
 * 骨架信息类型
 */
export interface SkeletonInfo {
  bones: Object3D[],
  geometryID: number,
  ID: string,
  rawBones: any[],
}

/**
 * 姿态节点矩阵映射类型
 */
export type BindMatrixMap = Record<string, any>;

/**
 * 模型映射类型
 */
export type ModelMap = Map<number, Object3D>;

/**
 * 解析场景选项的完整类型
 */
export interface CompleteSceneParserOptions extends FBXSceneParserOptions {
  deformers: Deformers,
  geoInfoMap: Map<number, ModelInfo>,
  geometryMap: GeometryMap,
  materialMap: MaterialMap,
}