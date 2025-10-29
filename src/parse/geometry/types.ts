import type { BufferGeometry } from 'three';
import type {
  FBXSkeleton,
} from '../../types';

/**
 * 模型信息接口
 */
export interface ModelInfo {
  isPBR: boolean,
  isTextured: boolean,
  isUVMapped: boolean,
  polygons: number,
  quads: number,
  triangles: number,
  vertices: number,
}

/**
 * 几何缓冲区信息
 */
export interface GeoBufferInfo {
  buffer: number[],
  dataSize: number,
  indices: number[],
  mappingType: string,
  referenceType: string,
}

/**
 * 几何信息
 */
export interface GeoInfo {
  vertexPositions?: number[],
  baseVertexPositions?: number[],
  vertexIndices?: number[],
  color?: GeoBufferInfo,
  material?: GeoBufferInfo,
  normal?: GeoBufferInfo,
  uv?: GeoBufferInfo[],
  skeleton?: FBXSkeleton,
  weightTable?: WeightTable,
}

/**
 * 权重条目
 */
export interface WeightEntry {
  id: number,
  weight: number,
}

/**
 * 权重表
 */
export interface WeightTable {
  [vertexIndex: number]: WeightEntry[],
}

/**
 * 几何缓冲区
 */
export interface GeoBuffers {
  colors: number[],
  materialIndex: number[],
  normal: number[],
  positionCount: number,
  uvs: number[][],
  vertex: number[],
  vertexWeights: number[],
  weightsIndices: number[],
}

/**
 * 面缓冲区
 */
export interface GenFaceBuffers {
  colors: number[],
  materialIndex: number[],
  normal: number[],
  uvs: number[][],
  vertex: number[],
  vertexWeights: number[],
  weightsIndices: number[],
}

/**
 * 几何解析结果
 */
export interface GeometryParseResult {
  geometry: BufferGeometry,
  modelInfo: ModelInfo,
}