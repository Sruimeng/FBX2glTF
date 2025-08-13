// 几何体相关类型定义
import type { BufferGeometry, Matrix4 } from 'three';
import type { FBXSkeleton } from '../../constants';

export interface GeoBufferInfo {
  dataSize: number,
  buffer: number[],
  indices: number[],
  mappingType: string,
  referenceType: string,
}

export interface GeoInfo {
  material?: GeoBufferInfo,
  vertexPositions?: number[],
  vertexIndices?: any[],
  baseVertexPositions?: number[],
  color?: GeoBufferInfo,
  normal?: GeoBufferInfo,
  uv?: {
    dataSize: number,
    buffer: any[],
    indices: any[],
    mappingType: string,
    referenceType: string,
  }[],
  weightTable?: {
    [key: number]: Array<{ id: number, weight: number }>,
  },
  skeleton?: FBXSkeleton,
}

export interface GeometryData {
  id: number,
  geometry: BufferGeometry,
  info: GeoInfo,
}

export interface GeometryParseResult {
  geometries: Map<number, GeometryData>,
  skeletons: Map<number, FBXSkeleton>,
}