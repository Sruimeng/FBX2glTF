/**
 * FBX 几何相关类型
 */

import type { BufferGeometry } from 'three';
import type { FBXSkeleton } from '../nodes';

export interface GeoBufferInfo {
  buffer: number[],
  dataSize: number,
  indices: number[],
  mappingType: string,
  referenceType: string,
}

export interface ModelInfo {
  isPBR: boolean,
  isTextured: boolean,
  isUVMapped: boolean,
  polygons: number,
  quads: number,
  triangles: number,
  vertices: number,
}

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

export interface GenFaceBuffers {
  colors: number[],
  materialIndex: number[],
  normal: number[],
  uvs: number[][],
  vertex: number[],
  vertexWeights: number[],
  weightsIndices: number[],
}

export interface WeightEntry {
  id: number,
  weight: number,
}

export type WeightTable = Record<number, WeightEntry[]>;

// 扩展 BufferGeometry 以支持 FBX 特定属性
export interface FBXBufferGeometry extends BufferGeometry {
  FBX_Deformer?: FBXSkeleton,
}

export interface GeoInfo {
  baseVertexPositions?: number[],
  color?: GeoBufferInfo,
  material?: GeoBufferInfo,
  normal?: GeoBufferInfo,
  skeleton?: {
    bones: import('three').Bone[],
    geometryID: number,
    ID: string,
    rawBones: {
      ID: number,
      indices: number[],
      transformLink: import('three').Matrix4,
      weights: number[],
    }[],
  },
  uv?: GeoBufferInfo[],
  vertexIndices?: number[],
  vertexPositions?: number[],
  weightTable?: WeightTable,
}