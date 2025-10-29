import { Vector3 } from 'three';
import { getData } from '../utils';
import { MathUtils } from './math-utils';
import type { GeoInfo, GeoBuffers, GenFaceBuffers, WeightEntry, GeoBufferInfo } from './types';

/**
 * 缓冲区构建器
 * 负责生成和管理几何体的各种缓冲区数据
 */
export class BufferBuilder {
  /**
   * 生成缓冲区数据
   */
  static genBuffers (geoInfo: GeoInfo): GeoBuffers {
    const buffers: GeoBuffers = {
      colors: [],
      materialIndex: [],
      normal: [],
      positionCount: 0,
      uvs: [],
      vertex: [],
      vertexWeights: [],
      weightsIndices: [],
    };

    let polygonIndex = 0;
    let faceLength = 0;
    let displayedWeightsWarning = false;

    // 这些将保存单个面的数据
    let facePositionIndexes: number[] = [];
    let faceNormals: number[] = [];
    let faceColors: number[] = [];
    let faceUVs: number[][] = [];
    let faceWeights: number[] = [];
    let faceWeightIndices: number[] = [];

    geoInfo.vertexIndices?.forEach((vertexIndex: number, polygonVertexIndex: number) => {
      let materialIndex: number | undefined;
      let endOfFace = false;

      // 面索引和顶点索引数组组合在一个数组中
      // 负数标记面的结束 - first face here is 0, 1, 3, -3
      // 要找到最后一个顶点的索引，移位索引：^ - 1
      if (vertexIndex < 0) {
        vertexIndex = vertexIndex ^ -1; // 相当于 ( x * -1 ) - 1
        endOfFace = true;
      }

      let weightIndices: number[] = [];
      let weights: number[] = [];

      facePositionIndexes.push(vertexIndex * 3, vertexIndex * 3 + 1, vertexIndex * 3 + 2);

      if (geoInfo.color) {
        const data = getData(polygonVertexIndex, polygonIndex, vertexIndex, geoInfo.color);

        faceColors.push(data[0], data[1], data[2]);
      }

      if (geoInfo.skeleton && geoInfo.weightTable) {
        if (geoInfo.weightTable[vertexIndex] !== undefined) {
          geoInfo.weightTable[vertexIndex].forEach(
            function (wt: WeightEntry) {
              weights.push(wt.weight);
              weightIndices.push(wt.id);
            },
          );
        }

        if (weights.length > 4) {
          if (!displayedWeightsWarning) {
            console.warn(
              'THREE.FBXLoader: Vertex has more than 4 skinning weights assigned to vertex. Deleting additional weights.',
            );
            displayedWeightsWarning = true;
          }

          const processedWeights = MathUtils.processSkinWeights(weights, weightIndices);

          weights = processedWeights.processedWeights;
          weightIndices = processedWeights.processedWeightIndices;
        }

        // 如果权重数组长度小于4，用0填充
        while (weights.length < 4) {
          weights.push(0);
          weightIndices.push(0);
        }

        for (let i = 0; i < 4; ++i) {
          faceWeights.push(weights[i]);
          faceWeightIndices.push(weightIndices[i]);
        }
      }

      if (geoInfo.normal) {
        const data = getData(polygonVertexIndex, polygonIndex, vertexIndex, geoInfo.normal);

        faceNormals.push(data[0], data[1], data[2]);
      }

      if (geoInfo.material && geoInfo.material.mappingType !== 'AllSame') {
        materialIndex = getData(
          polygonVertexIndex,
          polygonIndex,
          vertexIndex,
          geoInfo.material,
        )[0];

        if (materialIndex < 0) {
          materialIndex = 0; // 回退
        }
      }

      if (geoInfo.uv) {
        geoInfo.uv.forEach((uv, i) => {
          const data = getData(polygonVertexIndex, polygonIndex, vertexIndex, uv);

          if (faceUVs[i] === undefined) {
            faceUVs[i] = [];
          }

          faceUVs[i].push(data[0]);
          faceUVs[i].push(data[1]);
        });
      }

      faceLength++;

      if (endOfFace) {
        BufferBuilder.genFace(
          buffers,
          geoInfo,
          facePositionIndexes,
          materialIndex ?? 0,
          faceNormals,
          faceColors,
          faceUVs,
          faceWeights,
          faceWeightIndices,
          faceLength,
        );

        polygonIndex++;
        faceLength = 0;

        // 重置数组以准备下一个面
        facePositionIndexes = [];
        faceNormals = [];
        faceColors = [];
        faceUVs = [];
        faceWeights = [];
        faceWeightIndices = [];
      }
    });

    buffers.positionCount = (geoInfo.vertexPositions?.length ?? 0) / 3;

    return buffers;
  }

  /**
   * 为几何体中的单个面生成数据。如果面是四边形，则将其拆分为2个三角形
   */
  private static genFace (
    buffers: GenFaceBuffers,
    geoInfo: GeoInfo,
    facePositionIndexes: number[],
    materialIndex: number,
    faceNormals: number[],
    faceColors: number[],
    faceUVs: number[][],
    faceWeights: number[],
    faceWeightIndices: number[],
    faceLength: number,
  ): void {
    let triangles: number[][];

    if (faceLength > 3) {
      // 使用 earcut 三角化 n-gon
      const vertices: Vector3[] = [];
      // 在变形场景中，vertexPositions 代表 morphPositions
      // 而 baseVertexPositions 代表原始几何体的位置
      const positions = geoInfo.baseVertexPositions || geoInfo.vertexPositions || [];

      for (let i = 0; i < facePositionIndexes.length; i += 3) {
        vertices.push(
          new Vector3(
            positions[facePositionIndexes[i]],
            positions[facePositionIndexes[i + 1]],
            positions[facePositionIndexes[i + 2]],
          ),
        );
      }

      triangles = MathUtils.triangulateFace(vertices);
    } else {
      // 普通三角形，跳过 earcut 三角化步骤
      triangles = [[0, 1, 2]];
    }

    if (geoInfo.vertexPositions === undefined) {
      throw new Error('vertexPositions is not defined in geoInfo');
    }

    for (const triangle of triangles) {
      const [i0 = -1, i1 = -1, i2 = -1] = triangle;

      // 添加位置数据
      BufferBuilder.addVertexPosition(buffers, geoInfo.vertexPositions, facePositionIndexes, i0, i1, i2);

      // 添加蒙皮权重数据
      if (geoInfo.skeleton) {
        BufferBuilder.addSkinWeights(buffers, faceWeights, faceWeightIndices, i0, i1, i2);
      }

      // 添加颜色数据
      if (geoInfo.color) {
        BufferBuilder.addVertexColors(buffers, faceColors, i0, i1, i2);
      }

      // 添加材质索引数据
      if (geoInfo.material && geoInfo.material.mappingType !== 'AllSame') {
        buffers.materialIndex.push(materialIndex, materialIndex, materialIndex);
      }

      // 添加法线数据
      if (geoInfo.normal) {
        BufferBuilder.addVertexNormals(buffers, faceNormals, i0, i1, i2);
      }

      // 添加UV数据
      if (geoInfo.uv) {
        BufferBuilder.addVertexUVs(buffers, geoInfo.uv, faceUVs, i0, i1, i2);
      }
    }
  }

  /**
   * 添加顶点位置数据
   */
  private static addVertexPosition (
    buffers: GenFaceBuffers,
    vertexPositions: number[],
    facePositionIndexes: number[],
    i0: number,
    i1: number,
    i2: number
  ): void {
    buffers.vertex.push(vertexPositions[facePositionIndexes[i0 * 3]]);
    buffers.vertex.push(vertexPositions[facePositionIndexes[i0 * 3 + 1]]);
    buffers.vertex.push(vertexPositions[facePositionIndexes[i0 * 3 + 2]]);

    buffers.vertex.push(vertexPositions[facePositionIndexes[i1 * 3]]);
    buffers.vertex.push(vertexPositions[facePositionIndexes[i1 * 3 + 1]]);
    buffers.vertex.push(vertexPositions[facePositionIndexes[i1 * 3 + 2]]);

    buffers.vertex.push(vertexPositions[facePositionIndexes[i2 * 3]]);
    buffers.vertex.push(vertexPositions[facePositionIndexes[i2 * 3 + 1]]);
    buffers.vertex.push(vertexPositions[facePositionIndexes[i2 * 3 + 2]]);
  }

  /**
   * 添加蒙皮权重数据
   */
  private static addSkinWeights (
    buffers: GenFaceBuffers,
    faceWeights: number[],
    faceWeightIndices: number[],
    i0: number,
    i1: number,
    i2: number
  ): void {
    // 顶点0的权重
    buffers.vertexWeights.push(faceWeights[i0 * 4], faceWeights[i0 * 4 + 1], faceWeights[i0 * 4 + 2], faceWeights[i0 * 4 + 3]);
    buffers.weightsIndices.push(faceWeightIndices[i0 * 4], faceWeightIndices[i0 * 4 + 1], faceWeightIndices[i0 * 4 + 2], faceWeightIndices[i0 * 4 + 3]);

    // 顶点1的权重
    buffers.vertexWeights.push(faceWeights[i1 * 4], faceWeights[i1 * 4 + 1], faceWeights[i1 * 4 + 2], faceWeights[i1 * 4 + 3]);
    buffers.weightsIndices.push(faceWeightIndices[i1 * 4], faceWeightIndices[i1 * 4 + 1], faceWeightIndices[i1 * 4 + 2], faceWeightIndices[i1 * 4 + 3]);

    // 顶点2的权重
    buffers.vertexWeights.push(faceWeights[i2 * 4], faceWeights[i2 * 4 + 1], faceWeights[i2 * 4 + 2], faceWeights[i2 * 4 + 3]);
    buffers.weightsIndices.push(faceWeightIndices[i2 * 4], faceWeightIndices[i2 * 4 + 1], faceWeightIndices[i2 * 4 + 2], faceWeightIndices[i2 * 4 + 3]);
  }

  /**
   * 添加顶点颜色数据
   */
  private static addVertexColors (
    buffers: GenFaceBuffers,
    faceColors: number[],
    i0: number,
    i1: number,
    i2: number
  ): void {
    buffers.colors.push(faceColors[i0 * 3], faceColors[i0 * 3 + 1], faceColors[i0 * 3 + 2]);
    buffers.colors.push(faceColors[i1 * 3], faceColors[i1 * 3 + 1], faceColors[i1 * 3 + 2]);
    buffers.colors.push(faceColors[i2 * 3], faceColors[i2 * 3 + 1], faceColors[i2 * 3 + 2]);
  }

  /**
   * 添加顶点法线数据
   */
  private static addVertexNormals (
    buffers: GenFaceBuffers,
    faceNormals: number[],
    i0: number,
    i1: number,
    i2: number
  ): void {
    buffers.normal.push(faceNormals[i0 * 3], faceNormals[i0 * 3 + 1], faceNormals[i0 * 3 + 2]);
    buffers.normal.push(faceNormals[i1 * 3], faceNormals[i1 * 3 + 1], faceNormals[i1 * 3 + 2]);
    buffers.normal.push(faceNormals[i2 * 3], faceNormals[i2 * 3 + 1], faceNormals[i2 * 3 + 2]);
  }

  /**
   * 添加顶点UV数据
   */
  private static addVertexUVs (
    buffers: GenFaceBuffers,
    uv: GeoBufferInfo[],
    faceUVs: number[][],
    i0: number,
    i1: number,
    i2: number
  ): void {
    for (let j = 0; j < uv.length; j++) {
      if (buffers.uvs[j] === undefined) {
        buffers.uvs[j] = [];
      }

      buffers.uvs[j].push(faceUVs[j][i0 * 2], faceUVs[j][i0 * 2 + 1]);
      buffers.uvs[j].push(faceUVs[j][i1 * 2], faceUVs[j][i1 * 2 + 1]);
      buffers.uvs[j].push(faceUVs[j][i2 * 2], faceUVs[j][i2 * 2 + 1]);
    }
  }
}