/**
 * FBX 几何相关类型
 */

export interface GeoBufferInfo {
  buffer: number[],
  dataSize: number,
  indices: number[],
  mappingType: string,
  referenceType: string,
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
  uv?: {
    buffer: number[],
    dataSize: number,
    indices: number[],
    mappingType: string,
    referenceType: string,
  }[],
  vertexIndices?: number[],
  vertexPositions?: number[],
  weightTable?: Record<number, Array<{ id: number, weight: number }>>,
}