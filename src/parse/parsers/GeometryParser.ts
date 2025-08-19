// 几何体解析器
import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
} from 'three';
import type {
  Deformers,
  FBXGeometryNode,
  FBXSkeleton,
} from '../../constants';
import type {
  GeoBufferInfo,
  GeoInfo,
  GeometryData,
  GeometryParseResult,
} from '../types';
import type { ParseContext } from '../types/common';

export class GeometryParser {
  private context: ParseContext;
  private negativeMaterialIndices: boolean;

  constructor (context: ParseContext) {
    this.context = context;
    this.negativeMaterialIndices = false;
  }

  // 解析几何体
  parse (deformers: Deformers): GeometryParseResult {
    const geometryMap = new Map<number, GeometryData>();
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;

    if (!fbxTree || !connections) {
      throw new Error('FBXTree or connections is not defined');
    }

    const objects = fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }

    const geometryNodes = objects.Geometry;

    if (geometryNodes) {
      for (const nodeID in geometryNodes) {
        const geometryNode = geometryNodes[nodeID];
        const geometryInfo = this.parseGeometryNode(geometryNode, deformers);

        if (geometryInfo) {
          const geometry = this.genGeometry(geometryInfo);

          geometryMap.set(parseInt(nodeID), {
            id: parseInt(nodeID),
            geometry,
            info: geometryInfo,
          });
        }
      }
    }

    return {
      geometries: geometryMap,
      skeletons: new Map(Object.entries(deformers.skeletons).map(([k, v]) => [parseInt(k), v])),
    };
  }

  // 解析几何体节点
  private parseGeometryNode (geometryNode: FBXGeometryNode, deformers: Deformers): GeoInfo | null {
    const geoInfo: GeoInfo = {};

    // 解析顶点位置
    if (geometryNode.Vertices) {
      geoInfo.vertexPositions = geometryNode.Vertices.a;
    }

    // 解析顶点索引
    if (geometryNode.PolygonVertexIndex) {
      geoInfo.vertexIndices = geometryNode.PolygonVertexIndex.a;
    }

    // 解析材质
    if (geometryNode.LayerElementMaterial) {
      geoInfo.material = this.parseMaterialElement(geometryNode.LayerElementMaterial);
    }

    // 解析法线
    if (geometryNode.LayerElementNormal) {
      geoInfo.normal = this.parseNormalElement(geometryNode.LayerElementNormal);
    }

    // 解析UV
    if (geometryNode.LayerElementUV) {
      geoInfo.uv = this.parseUVElement(geometryNode.LayerElementUV);
    }

    // 解析颜色
    if (geometryNode.LayerElementColor) {
      geoInfo.color = this.parseColorElement(geometryNode.LayerElementColor);
    }

    // 处理骨架和蒙皮
    const skeleton = deformers.skeletons[geometryNode.id];

    if (skeleton) {
      geoInfo.skeleton = skeleton;
      geoInfo.weightTable = this.buildWeightTable(skeleton);
    }

    return geoInfo;
  }

  // 解析材质元素
  private parseMaterialElement (materialElement: any): GeoBufferInfo {
    const materialInfo: GeoBufferInfo = {
      dataSize: 1,
      buffer: [],
      indices: [],
      mappingType: materialElement.MappingInformationType,
      referenceType: materialElement.ReferenceInformationType,
    };

    if (materialInfo.referenceType === 'IndexToDirect') {
      materialInfo.buffer = materialElement.Materials.a;
    } else {
      materialInfo.buffer = materialElement.a;
    }

    return materialInfo;
  }

  // 解析法线元素
  private parseNormalElement (normalElement: any): GeoBufferInfo {
    const normalInfo: GeoBufferInfo = {
      dataSize: 3,
      buffer: normalElement.Normals.a,
      indices: [],
      mappingType: normalElement.MappingInformationType,
      referenceType: normalElement.ReferenceInformationType,
    };

    if (normalElement.NormalIndex) {
      normalInfo.indices = normalElement.NormalIndex.a;
    } else if (normalElement.NormalsIndex) {
      normalInfo.indices = normalElement.NormalsIndex.a;
    }

    return normalInfo;
  }

  // 解析UV元素
  private parseUVElement (uvElement: any): GeoBufferInfo[] {
    const uvInfo: GeoBufferInfo[] = [];

    for (const id in uvElement) {
      const uvData = uvElement[id];
      const uv: GeoBufferInfo = {
        dataSize: 2,
        buffer: uvData.UV.a,
        indices: uvData.UVIndex.a,
        mappingType: uvData.MappingInformationType,
        referenceType: uvData.ReferenceInformationType,
      };

      uvInfo.push(uv);
    }

    return uvInfo;
  }

  // 解析颜色元素
  private parseColorElement (colorElement: any): GeoBufferInfo {
    const colorInfo: GeoBufferInfo = {
      dataSize: 4,
      buffer: colorElement.Colors.a,
      indices: colorElement.ColorIndex.a,
      mappingType: colorElement.MappingInformationType,
      referenceType: colorElement.ReferenceInformationType,
    };

    return colorInfo;
  }

  // 构建权重表
  private buildWeightTable (skeleton: FBXSkeleton): { [key: number]: Array<{ id: number, weight: number }> } {
    const weightTable: { [key: number]: Array<{ id: number, weight: number }> } = {};

    for (const bone of skeleton.rawBones) {
      bone.indices.forEach((index, i) => {
        if (!weightTable[index]) {
          weightTable[index] = [];
        }
        weightTable[index].push({
          id: bone.ID,
          weight: bone.weights[i],
        });
      });
    }

    return weightTable;
  }

  // 生成几何体
  private genGeometry (geoInfo: GeoInfo): BufferGeometry {
    const geometry = new BufferGeometry();

    // 处理顶点位置
    if (geoInfo.vertexPositions && geoInfo.vertexIndices) {
      const vertexPositions = geoInfo.vertexPositions;
      const vertexIndices = geoInfo.vertexIndices;

      // 处理多边形顶点索引（FBX使用负数表示多边形结束）
      const faceIndices = [];
      let currentPolygon = [];

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

      // 设置顶点位置
      const positions = new Float32Array(faceIndices.length * 3);

      for (let i = 0; i < faceIndices.length; i++) {
        const vertexIndex = faceIndices[i] * 3;

        positions[i * 3] = vertexPositions[vertexIndex];
        positions[i * 3 + 1] = vertexPositions[vertexIndex + 1];
        positions[i * 3 + 2] = vertexPositions[vertexIndex + 2];
      }
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

      // 设置索引
      const indices = new Uint16Array(faceIndices.length);

      for (let i = 0; i < faceIndices.length; i++) {
        indices[i] = i;
      }
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

  // 添加法线
  private addNormals (geometry: BufferGeometry, normalInfo: GeoBufferInfo): void {
    const normalData = normalInfo.buffer;
    const normals = new Float32Array(normalData.length);

    for (let i = 0; i < normalData.length; i++) {
      normals[i] = normalData[i];
    }

    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  }

  // 添加UV
  private addUVs (geometry: BufferGeometry, uvInfo: GeoBufferInfo[]): void {
    uvInfo.forEach((uvData, index) => {
      const uvArray = new Float32Array(uvData.buffer.length);

      for (let i = 0; i < uvData.buffer.length; i++) {
        uvArray[i] = uvData.buffer[i];
      }

      geometry.setAttribute(`uv${index}`, new Float32BufferAttribute(uvArray, 2));
    });
  }

  // 添加颜色
  private addColors (geometry: BufferGeometry, colorInfo: GeoBufferInfo): void {
    const colorData = colorInfo.buffer;
    const colors = new Float32Array(colorData.length);

    for (let i = 0; i < colorData.length; i++) {
      colors[i] = colorData[i];
    }

    geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  }

  // 添加蒙皮
  private addSkinning (
    geometry: BufferGeometry,
    skeleton: FBXSkeleton,
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
}