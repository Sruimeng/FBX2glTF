import { Color, ColorManagement, SRGBColorSpace } from 'three';
import type {
  FBXLayerElementColor,
  FBXLayerElementNormal,
  FBXLayerElementUV,
  FBXMaterialNode,
} from '../../types';
import type { GeoBufferInfo } from './types';

/**
 * 层级元素解析器
 * 负责解析FBX几何体中的各种层级元素（UV、法线、颜色、材质）
 */
export class LayerParser {
  /**
   * 解析法线数据
   */
  static parseNormals (NormalNode: FBXLayerElementNormal): GeoBufferInfo {
    const mappingType = NormalNode.MappingInformationType;
    const referenceType = NormalNode.ReferenceInformationType;
    const buffer = NormalNode.Normals?.a || [];
    let indexBuffer: number[] = [];

    if (referenceType === 'IndexToDirect') {
      if ('NormalIndex' in NormalNode) {
        indexBuffer = NormalNode.NormalIndex?.a || [];
      } else if ('NormalsIndex' in NormalNode) {
        indexBuffer = NormalNode.NormalsIndex?.a || [];
      }
    }

    return {
      buffer: buffer,
      dataSize: 3,
      indices: indexBuffer,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }

  /**
   * 解析UV数据
   */
  static parseUVs (UVNode: FBXLayerElementUV): GeoBufferInfo {
    const mappingType = UVNode.MappingInformationType;
    const referenceType = UVNode.ReferenceInformationType;
    const bufferArray = UVNode.UV.a;
    const indexBufferArray = UVNode.UVIndex?.a;

    const buffer = Array.isArray(bufferArray) ? bufferArray : [];
    const indexBuffer = Array.isArray(indexBufferArray) ? indexBufferArray : [];

    return {
      buffer: buffer,
      dataSize: 2,
      indices: indexBuffer,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }

  /**
   * 解析顶点颜色数据
   */
  static parseVertexColors (ColorNode: FBXLayerElementColor): {
    buffer: number[],
    dataSize: number,
    indices: number[],
    mappingType: string,
    referenceType: string,
  } {
    const mappingType = ColorNode.MappingInformationType;
    const referenceType = ColorNode.ReferenceInformationType;
    const buffer = ColorNode.Colors.a;
    let indexBuffer: number[] = [];

    if (referenceType === 'IndexToDirect') {
      indexBuffer = ColorNode.ColorIndex.a;
    }

    // 转换颜色空间为工作空间
    for (let i = 0, c = new Color(); i < buffer.length; i += 4) {
      c.fromArray(buffer, i);
      ColorManagement.toWorkingColorSpace(c, SRGBColorSpace);
      c.toArray(buffer, i);
    }

    return {
      buffer: buffer,
      dataSize: 4,
      indices: indexBuffer,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }

  /**
   * 解析材质索引数据
   */
  static parseMaterialIndices (MaterialNode: FBXMaterialNode): GeoBufferInfo {
    const mappingType = MaterialNode.MappingInformationType;
    const referenceType = MaterialNode.ReferenceInformationType;

    if (mappingType === 'NoMappingInformation') {
      return {
        buffer: [0],
        dataSize: 1,
        indices: [0],
        mappingType: 'AllSame',
        referenceType: referenceType,
      };
    }

    const materialIndexBuffer = MaterialNode.Materials.a || [];

    // 由于材质存储为索引，FBX与我们期望的有些不匹配
    // 所以我们创建一个指向索引的中间缓冲区，以符合我们为其他数据编写的函数
    const materialIndices: number[] = [];

    for (let i = 0; i < (Array.isArray(materialIndexBuffer) ? materialIndexBuffer.length : 0); ++i) {
      materialIndices.push(i);
    }

    return {
      buffer: Array.isArray(materialIndexBuffer) ? materialIndexBuffer : [],
      dataSize: 1,
      indices: materialIndices,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }
}