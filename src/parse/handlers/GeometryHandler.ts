// 几何体处理器
import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
} from 'three';
import type { GeoInfo } from '../types';

export class GeometryHandler {
  // 处理几何体数据
  static processGeometry (geoInfo: GeoInfo): BufferGeometry {
    const geometry = new BufferGeometry();

    // 处理顶点位置
    if (geoInfo.vertexPositions && geoInfo.vertexIndices) {
      const { positions, indices } = this.processVertices(geoInfo.vertexPositions, geoInfo.vertexIndices);

      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setIndex(new Uint16BufferAttribute(indices, 1));
    }

    // 处理法线
    if (geoInfo.normal) {
      this.addNormals(geometry, geoInfo.normal);
    }

    // 处理UV
    if (geoInfo.uv) {
      this.addUVs(geometry, geoInfo.uv);
    }

    // 处理颜色
    if (geoInfo.color) {
      this.addColors(geometry, geoInfo.color);
    }

    // 处理蒙皮
    if (geoInfo.skeleton && geoInfo.weightTable) {
      this.addSkinning(geometry, geoInfo.skeleton, geoInfo.weightTable);
    }

    return geometry;
  }

  // 处理顶点数据
  private static processVertices (vertexPositions: number[], vertexIndices: number[]): { positions: number[], indices: number[] } {
    const positions: number[] = [];
    const indices: number[] = [];
    let currentIndex = 0;
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
            const v1 = currentPolygon[0] * 3;
            const v2 = currentPolygon[j] * 3;
            const v3 = currentPolygon[j + 1] * 3;

            // 添加顶点位置
            positions.push(
              vertexPositions[v1], vertexPositions[v1 + 1], vertexPositions[v1 + 2],
              vertexPositions[v2], vertexPositions[v2 + 1], vertexPositions[v2 + 2],
              vertexPositions[v3], vertexPositions[v3 + 1], vertexPositions[v3 + 2]
            );

            // 添加索引
            indices.push(currentIndex, currentIndex + 1, currentIndex + 2);
            currentIndex += 3;
          }
        }

        currentPolygon = [];
      } else {
        currentPolygon.push(vertexIndex);
      }
    }

    return { positions, indices };
  }

  // 添加法线
  private static addNormals (geometry: BufferGeometry, normalInfo: any): void {
    const normalData = normalInfo.buffer;
    const normals = new Float32Array(normalData.length);

    for (let i = 0; i < normalData.length; i++) {
      normals[i] = normalData[i];
    }

    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  }

  // 添加UV
  private static addUVs (geometry: BufferGeometry, uvInfo: any[]): void {
    uvInfo.forEach((uvData, index) => {
      const uvArray = new Float32Array(uvData.buffer.length);

      for (let i = 0; i < uvData.buffer.length; i++) {
        uvArray[i] = uvData.buffer[i];
      }

      geometry.setAttribute(`uv${index}`, new Float32BufferAttribute(uvArray, 2));
    });
  }

  // 添加颜色
  private static addColors (geometry: BufferGeometry, colorInfo: any): void {
    const colorData = colorInfo.buffer;
    const colors = new Float32Array(colorData.length);

    for (let i = 0; i < colorData.length; i++) {
      colors[i] = colorData[i];
    }

    geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  }

  // 添加蒙皮
  private static addSkinning (
    geometry: BufferGeometry,
    skeleton: any,
    weightTable: { [key: number]: Array<{ id: number, weight: number }> }
  ): void {
    const vertexCount = geometry.attributes.position.count;
    const boneIndices = new Float32Array(vertexCount * 4);
    const boneWeights = new Float32Array(vertexCount * 4);

    for (let i = 0; i < vertexCount; i++) {
      const weights = weightTable[i] || [];

      // 最多支持4个骨骼影响
      for (let j = 0; j < Math.min(weights.length, 4); j++) {
        boneIndices[i * 4 + j] = weights[j].id;
        boneWeights[i * 4 + j] = weights[j].weight;
      }
    }

    geometry.setAttribute('skinIndex', new Float32BufferAttribute(boneIndices, 4));
    geometry.setAttribute('skinWeight', new Float32BufferAttribute(boneWeights, 4));
  }

  // 优化几何体
  static optimizeGeometry (geometry: BufferGeometry): BufferGeometry {
    // 合并顶点
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('color');
    geometry.deleteAttribute('skinIndex');
    geometry.deleteAttribute('skinWeight');

    geometry.computeVertexNormals();

    return geometry;
  }

  // 验证几何体
  static validateGeometry (geometry: BufferGeometry): boolean {
    if (!geometry.attributes.position) {
      console.warn('Geometry has no position attribute');

      return false;
    }

    if (geometry.attributes.position.count < 3) {
      console.warn('Geometry has less than 3 vertices');

      return false;
    }

    return true;
  }
}