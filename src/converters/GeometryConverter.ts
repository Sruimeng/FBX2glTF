// 几何体转换器 - 将FBX几何体转换为glTF几何体
import type { Document, Primitive, Accessor } from '@gltf-transform/core';
// import { MathAdapter } from '../adapters/MathAdapter';
import {
  createVector3,
  createVector2,
  normalizeVector,
  calculateTriangleNormal,
} from '../math/math';

import type {
  GeoInfo,
  GeoBufferInfo,
  FBXSkeleton,
} from '../parse/types';
import type { Vector3 } from '@maxellabs/math';

export class GeometryConverter {
  private document: Document;

  constructor (document: Document) {
    this.document = document;
  }

  // 转换几何体信息到glTF图元
  convertGeometry (geoInfo: GeoInfo): {
    primitives: Primitive[],
    accessors: Map<string, Accessor>,
  } {
    const primitives: Primitive[] = [];
    const accessors = new Map<string, Accessor>();

    // 处理顶点位置和索引
    const { vertices, indices } = this.processVertices(geoInfo);

    if (vertices.length > 0) {
      const positionAccessor = this.document.createAccessor()
        .setArray(new Float32Array(vertices))
        .setType('VEC3');

      accessors.set('POSITION', positionAccessor);
    }

    if (indices.length > 0) {
      const indexAccessor = this.document.createAccessor()
        .setArray(new Uint32Array(indices))
        .setType('SCALAR');

      accessors.set('INDICES', indexAccessor);
    }

    // 处理法线
    if (geoInfo.normal) {
      const normals = this.processNormals(geoInfo.normal, vertices, indices);

      if (normals.length > 0) {
        const normalAccessor = this.document.createAccessor()
          .setArray(new Float32Array(normals))
          .setType('VEC3');

        accessors.set('NORMAL', normalAccessor);
      }
    }

    // 处理UV坐标
    if (geoInfo.uv) {
      geoInfo.uv.forEach((uvInfo, index) => {
        const uvs = this.processUVs(uvInfo, vertices.length);

        if (uvs.length > 0) {
          const uvAccessor = this.document.createAccessor()
            .setArray(new Float32Array(uvs))
            .setType('VEC2');

          accessors.set(`TEXCOORD_${index}`, uvAccessor);
        }
      });
    }

    // 处理颜色
    if (geoInfo.color) {
      const colors = this.processColors(geoInfo.color, vertices.length);

      if (colors.length > 0) {
        const colorAccessor = this.document.createAccessor()
          .setArray(new Float32Array(colors))
          .setType('VEC4');

        accessors.set('COLOR_0', colorAccessor);
      }
    }

    // 处理蒙皮数据
    if (geoInfo.skeleton && geoInfo.weightTable) {
      const { boneIndices, boneWeights } = this.processSkinning(geoInfo.skeleton, geoInfo.weightTable, vertices.length);

      if (boneIndices.length > 0) {
        const boneIndexAccessor = this.document.createAccessor()
          .setArray(new Uint16Array(boneIndices))
          .setType('VEC4');

        accessors.set('JOINTS_0', boneIndexAccessor);
      }

      if (boneWeights.length > 0) {
        const boneWeightAccessor = this.document.createAccessor()
          .setArray(new Float32Array(boneWeights))
          .setType('VEC4');

        accessors.set('WEIGHTS_0', boneWeightAccessor);
      }
    }

    // 创建图元
    const primitive = this.document.createPrimitive();

    if (accessors.has('POSITION')) {
      primitive.setAttribute('POSITION', accessors.get('POSITION')!);
    }

    if (accessors.has('NORMAL')) {
      primitive.setAttribute('NORMAL', accessors.get('NORMAL')!);
    }

    if (accessors.has('TEXCOORD_0')) {
      primitive.setAttribute('TEXCOORD_0', accessors.get('TEXCOORD_0')!);
    }

    if (accessors.has('COLOR_0')) {
      primitive.setAttribute('COLOR_0', accessors.get('COLOR_0')!);
    }

    if (accessors.has('JOINTS_0')) {
      primitive.setAttribute('JOINTS_0', accessors.get('JOINTS_0')!);
    }

    if (accessors.has('WEIGHTS_0')) {
      primitive.setAttribute('WEIGHTS_0', accessors.get('WEIGHTS_0')!);
    }

    if (accessors.has('INDICES')) {
      primitive.setIndices(accessors.get('INDICES')!);
    }

    primitives.push(primitive);

    return { primitives, accessors };
  }

  // 处理顶点位置和索引
  private processVertices (geoInfo: GeoInfo): {
    vertices: number[],
    indices: number[],
  } {
    const vertices: number[] = [];
    const indices: number[] = [];

    if (!geoInfo.vertexPositions || !geoInfo.vertexIndices) {
      return { vertices, indices };
    }

    const vertexPositions = geoInfo.vertexPositions;
    const vertexIndices = geoInfo.vertexIndices;

    // 处理多边形顶点索引（FBX使用负数表示多边形结束）
    const faceIndices: number[] = [];
    let currentPolygon: number[] = [];

    for (let i = 0; i < vertexIndices.length; i++) {
      const vertexIndex = vertexIndices[i];

      if (vertexIndex < 0) {
        // 多边形结束
        const polygonVertexIndex = ~vertexIndex;

        currentPolygon.push(polygonVertexIndex);

        // 三角化多边形
        if (currentPolygon.length > 2) {
          for (let j = 1; j < currentPolygon.length - 1; j++) {
            faceIndices.push(currentPolygon[0], currentPolygon[j], currentPolygon[j + 1]);
          }
        }

        currentPolygon = [];
      } else {
        currentPolygon.push(vertexIndex);
      }
    }

    // 生成顶点位置数组
    for (let i = 0; i < faceIndices.length; i++) {
      const vertexIndex = faceIndices[i] * 3;

      vertices.push(
        vertexPositions[vertexIndex],
        vertexPositions[vertexIndex + 1],
        vertexPositions[vertexIndex + 2]
      );
    }

    // 生成索引数组
    for (let i = 0; i < faceIndices.length; i++) {
      indices.push(i);
    }

    return { vertices, indices };
  }

  // 处理法线
  private processNormals (normalInfo: GeoBufferInfo, vertices: number[], indices: number[]): number[] {
    const normals: number[] = [];
    const normalData = normalInfo.buffer;

    if (normalInfo.mappingType === 'ByPolygonVertex') {
      // 直接使用法线数据
      for (let i = 0; i < normalData.length; i++) {
        normals.push(normalData[i]);
      }
    } else if (normalInfo.mappingType === 'ByPolygon') {
      // 按多边形复制法线
      for (let i = 0; i < vertices.length / 3; i++) {
        const normalIndex = Math.floor(i / 3) * 3;

        normals.push(
          normalData[normalIndex],
          normalData[normalIndex + 1],
          normalData[normalIndex + 2]
        );
      }
    } else {
      // 计算法线
      return this.calculateNormals(vertices, indices);
    }

    return normals;
  }

  // 计算法线
  private calculateNormals (vertices: number[], indices: number[]): number[] {
    const normals = new Array(vertices.length).fill(0);
    const vertexCount = vertices.length / 3;

    // 计算每个三角形的法线
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1 = createVector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
      const v2 = createVector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);
      const v3 = createVector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);

      const normal = calculateTriangleNormal(v1, v2, v3);

      // 累加法线到顶点
      normals[i1] += normal.x;
      normals[i1 + 1] += normal.y;
      normals[i1 + 2] += normal.z;

      normals[i2] += normal.x;
      normals[i2 + 1] += normal.y;
      normals[i2 + 2] += normal.z;

      normals[i3] += normal.x;
      normals[i3 + 1] += normal.y;
      normals[i3 + 2] += normal.z;
    }

    // 归一化法线
    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;
      const normal = createVector3(normals[i3], normals[i3 + 1], normals[i3 + 2]);
      const normalized = normalizeVector(normal);

      normals[i3] = normalized.x;
      normals[i3 + 1] = normalized.y;
      normals[i3 + 2] = normalized.z;
    }

    return normals;
  }

  // 处理UV坐标
  private processUVs (uvInfo: GeoBufferInfo, vertexCount: number): number[] {
    const uvs: number[] = [];
    const uvData = uvInfo.buffer;

    if (uvInfo.mappingType === 'ByPolygonVertex') {
      // 直接使用UV数据
      for (let i = 0; i < uvData.length; i++) {
        uvs.push(uvData[i]);
      }
    } else if (uvInfo.mappingType === 'ByPolygon') {
      // 按多边形复制UV
      for (let i = 0; i < vertexCount; i++) {
        const uvIndex = Math.floor(i / 3) * 2;

        uvs.push(uvData[uvIndex], uvData[uvIndex + 1]);
      }
    } else {
      // 默认UV坐标
      for (let i = 0; i < vertexCount; i++) {
        uvs.push(0, 0);
      }
    }

    return uvs;
  }

  // 处理颜色
  private processColors (colorInfo: GeoBufferInfo, vertexCount: number): number[] {
    const colors: number[] = [];
    const colorData = colorInfo.buffer;

    if (colorInfo.mappingType === 'ByPolygonVertex') {
      // 直接使用颜色数据
      for (let i = 0; i < colorData.length; i++) {
        colors.push(colorData[i]);
      }
    } else if (colorInfo.mappingType === 'ByPolygon') {
      // 按多边形复制颜色
      for (let i = 0; i < vertexCount; i++) {
        const colorIndex = Math.floor(i / 3) * 4;

        colors.push(
          colorData[colorIndex],
          colorData[colorIndex + 1],
          colorData[colorIndex + 2],
          colorData[colorIndex + 3]
        );
      }
    } else {
      // 默认颜色（白色）
      for (let i = 0; i < vertexCount; i++) {
        colors.push(1, 1, 1, 1);
      }
    }

    return colors;
  }

  // 处理蒙皮数据
  private processSkinning (
    skeleton: FBXSkeleton,
    weightTable: { [key: number]: Array<{ id: number, weight: number }> },
    vertexCount: number
  ): {
      boneIndices: number[],
      boneWeights: number[],
    } {
    const boneIndices = new Array(vertexCount * 4).fill(0);
    const boneWeights = new Array(vertexCount * 4).fill(0);

    for (let i = 0; i < vertexCount; i++) {
      const weights = weightTable[i] || [];

      // 最多支持4个骨骼影响
      for (let j = 0; j < Math.min(weights.length, 4); j++) {
        boneIndices[i * 4 + j] = weights[j].id;
        boneWeights[i * 4 + j] = weights[j].weight;
      }

      // 归一化权重
      const totalWeight = boneWeights.slice(i * 4, i * 4 + 4).reduce((sum, weight) => sum + weight, 0);

      if (totalWeight > 0) {
        for (let j = 0; j < 4; j++) {
          boneWeights[i * 4 + j] /= totalWeight;
        }
      }
    }

    return { boneIndices, boneWeights };
  }

  // 创建变形目标
  createMorphTargets (
    baseVertices: number[],
    morphTargets: Array<{ name: string, vertices: number[], weights: number[] }>
  ): {
      targets: Array<{ positions: Accessor, name: string }>,
      accessors: Accessor[],
    } {
    const targets: Array<{ positions: Accessor, name: string }> = [];
    const accessors: Accessor[] = [];

    morphTargets.forEach(target => {
      const positions = this.document.createAccessor()
        .setArray(new Float32Array(target.vertices))
        .setType('VEC3');

      accessors.push(positions);
      targets.push({
        positions,
        name: target.name,
      });
    });

    return { targets, accessors };
  }

  // 创建边界框
  createBoundingBox (vertices: number[]): {
    min: number[],
    max: number[],
    center: number[],
    size: number[],
  } {
    if (vertices.length === 0) {
      return {
        min: [0, 0, 0],
        max: [0, 0, 0],
        center: [0, 0, 0],
        size: [0, 0, 0],
      };
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < vertices.length; i += 3) {
      min[0] = Math.min(min[0], vertices[i]);
      min[1] = Math.min(min[1], vertices[i + 1]);
      min[2] = Math.min(min[2], vertices[i + 2]);

      max[0] = Math.max(max[0], vertices[i]);
      max[1] = Math.max(max[1], vertices[i + 1]);
      max[2] = Math.max(max[2], vertices[i + 2]);
    }

    const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];

    const size = [
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2],
    ];

    return { min, max, center, size };
  }

  // 优化几何体
  optimizeGeometry (vertices: number[], indices: number[]): {
    optimizedVertices: number[],
    optimizedIndices: number[],
    vertexMap: number[],
  } {
    const vertexMap: number[] = [];
    const optimizedVertices: number[] = [];
    const optimizedIndices: number[] = [];

    const vertexMapKey = new Map<string, number>();

    for (let i = 0; i < indices.length; i++) {
      const originalIndex = indices[i];
      const vertexIndex = originalIndex * 3;

      const key = `${vertices[vertexIndex]},${vertices[vertexIndex + 1]},${vertices[vertexIndex + 2]}`;

      let newIndex: number;

      if (vertexMapKey.has(key)) {
        newIndex = vertexMapKey.get(key)!;
      } else {
        newIndex = optimizedVertices.length / 3;
        vertexMapKey.set(key, newIndex);

        optimizedVertices.push(
          vertices[vertexIndex],
          vertices[vertexIndex + 1],
          vertices[vertexIndex + 2]
        );
      }

      optimizedIndices.push(newIndex);
      vertexMap.push(newIndex);
    }

    return { optimizedVertices, optimizedIndices, vertexMap };
  }

  // 计算切线
  calculateTangents (
    vertices: number[],
    normals: number[],
    uvs: number[],
    indices: number[]
  ): number[] {
    const tangents = new Array(vertices.length).fill(0);
    const bitangents = new Array(vertices.length).fill(0);

    // 计算每个三角形的切线和双切线
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const uv1 = indices[i] * 2;
      const uv2 = indices[i + 1] * 2;
      const uv3 = indices[i + 2] * 2;

      const v1 = createVector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
      const v2 = createVector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);
      const v3 = createVector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);

      const w1 = createVector2(uvs[uv1], uvs[uv1 + 1]);
      const w2 = createVector2(uvs[uv2], uvs[uv2 + 1]);
      const w3 = createVector2(uvs[uv3], uvs[uv3 + 1]);

      const edge1 = createVector3(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
      const edge2 = createVector3(v3.x - v1.x, v3.y - v1.y, v3.z - v1.z);

      const deltaUV1 = createVector2(w2.x - w1.x, w2.y - w1.y);
      const deltaUV2 = createVector2(w3.x - w1.x, w3.y - w1.y);

      const f = 1.0 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);

      const tangent = createVector3(
        f * (deltaUV2.y * edge1.x - deltaUV1.y * edge2.x),
        f * (deltaUV2.y * edge1.y - deltaUV1.y * edge2.y),
        f * (deltaUV2.y * edge1.z - deltaUV1.y * edge2.z)
      );

      const bitangent = createVector3(
        f * (-deltaUV2.x * edge1.x + deltaUV1.x * edge2.x),
        f * (-deltaUV2.x * edge1.y + deltaUV1.x * edge2.y),
        f * (-deltaUV2.x * edge1.z + deltaUV1.x * edge2.z)
      );

      // 累加切线和双切线
      tangents[i1] += tangent.x;
      tangents[i1 + 1] += tangent.y;
      tangents[i1 + 2] += tangent.z;

      tangents[i2] += tangent.x;
      tangents[i2 + 1] += tangent.y;
      tangents[i2 + 2] += tangent.z;

      tangents[i3] += tangent.x;
      tangents[i3 + 1] += tangent.y;
      tangents[i3 + 2] += tangent.z;

      bitangents[i1] += bitangent.x;
      bitangents[i1 + 1] += bitangent.y;
      bitangents[i1 + 2] += bitangent.z;

      bitangents[i2] += bitangent.x;
      bitangents[i2 + 1] += bitangent.y;
      bitangents[i2 + 2] += bitangent.z;

      bitangents[i3] += bitangent.x;
      bitangents[i3 + 1] += bitangent.y;
      bitangents[i3 + 2] += bitangent.z;
    }

    // 格拉姆-施密特正交化
    const finalTangents: number[] = [];

    for (let i = 0; i < vertices.length; i += 3) {
      const normal = createVector3(normals[i], normals[i + 1], normals[i + 2]);
      const tangent = createVector3(tangents[i], tangents[i + 1], tangents[i + 2]);
      const bitangent = createVector3(bitangents[i], bitangents[i + 1], bitangents[i + 2]);

      // 正交化切线
      const orthogonalTangent = normalizeVector(
        createVector3(
          tangent.x - normal.x * dotVectors(normal, tangent),
          tangent.y - normal.y * dotVectors(normal, tangent),
          tangent.z - normal.z * dotVectors(normal, tangent)
        )
      );

      // 计算手性
      const cross = crossVectors(normal, tangent);
      const handedness = dotVectors(cross, bitangent) < 0 ? -1 : 1;

      finalTangents.push(
        orthogonalTangent.x,
        orthogonalTangent.y,
        orthogonalTangent.z,
        handedness
      );
    }

    return finalTangents;
  }

  // 辅助函数：点积
  private dotVectors (a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  // 辅助函数：叉积
  private crossVectors (a: Vector3, b: Vector3): Vector3 {
    return createVector3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }
}