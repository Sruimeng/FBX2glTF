import type { Matrix4 } from 'three';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix3,
  Uint16BufferAttribute,
} from 'three';
import type {
  FBXGeometryNode,
  FBXSkeleton,
  IParsingContext,
  FBXMorphTarget,
  FBXRawTargets,
} from '../../types';
import { LayerParser } from './layer-parser';
import { BufferBuilder } from './buffer-builder';
import type {
  ModelInfo,
  GeoInfo,
  WeightTable,
  GeometryParseResult,
} from './types';

/**
 * 几何处理器
 * 负责处理几何体的复杂数据处理逻辑
 */
export class GeometryProcessor {
  private negativeMaterialIndices: boolean = false;
  private modelInfo: ModelInfo = {
    isPBR: true,
    isTextured: false,
    isUVMapped: false,
    polygons: 0,
    quads: 0,
    triangles: 0,
    vertices: 0,
  };

  constructor (private context: IParsingContext) {}

  /**
   * 生成几何体
   */
  genGeometry (
    geoNode: FBXGeometryNode,
    skeleton: FBXSkeleton | null,
    morphTargets: FBXMorphTarget[],
    preTransform: Matrix4,
  ): GeometryParseResult {
    const geometry = new BufferGeometry();

    if (geoNode.attrName) {
      geometry.name = geoNode.attrName;
    }
    const geoInfo = this.parseGeoNode(geoNode, skeleton);
    const buffers = BufferBuilder.genBuffers(geoInfo);

    this.modelInfo.vertices = buffers.positionCount;
    const modelInfo = { ...this.modelInfo };

    this.modelInfo = {
      isPBR: false,
      isTextured: false,
      isUVMapped: false,
      polygons: 0,
      quads: 0,
      triangles: 0,
      vertices: 0,
    };

    const positionAttribute = new Float32BufferAttribute(buffers.vertex, 3);

    positionAttribute.applyMatrix4(preTransform);
    geometry.setAttribute('position', positionAttribute);

    if (buffers.colors.length > 0) {
      geometry.setAttribute('color', new Float32BufferAttribute(buffers.colors, 3));
    }

    if (skeleton) {
      geometry.setAttribute('skinIndex', new Uint16BufferAttribute(buffers.weightsIndices, 4));
      geometry.setAttribute('skinWeight', new Float32BufferAttribute(buffers.vertexWeights, 4));
      this.setFBXDeformer(geometry, skeleton);
    }

    if (buffers.normal.length > 0) {
      const normalMatrix = new Matrix3().getNormalMatrix(preTransform);
      const normalAttribute = new Float32BufferAttribute(buffers.normal, 3);

      normalAttribute.applyNormalMatrix(normalMatrix);
      geometry.setAttribute('normal', normalAttribute);
    } else {
      geometry.computeVertexNormals();
    }

    buffers.uvs.forEach(function (uvArray, i) {
      const name = i === 0 ? 'uv' : `uv${i}`;

      if (Array.isArray(uvArray) && uvArray.length > 0) {
        geometry.setAttribute(name, new Float32BufferAttribute(uvArray, 2));
      }
    });

    if (geoInfo.material && geoInfo.material.mappingType !== 'AllSame') {
      this.setupMaterialGroups(geometry, buffers);
    }

    this.addMorphTargets(geometry, geoNode, morphTargets, preTransform);

    return { geometry, modelInfo };
  }

  /**
   * 解析几何节点
   */
  parseGeoNode (geoNode: FBXGeometryNode, skeleton: FBXSkeleton | null): GeoInfo {
    const geoInfo: GeoInfo = {};

    const vertices = geoNode.Vertices?.a;
    const indices = geoNode.PolygonVertexIndex?.a;

    geoInfo.vertexPositions = Array.isArray(vertices) ? vertices : [];
    geoInfo.vertexIndices = Array.isArray(indices) ? indices : [];

    if (geoNode.LayerElementColor) {
      geoInfo.color = LayerParser.parseVertexColors(geoNode.LayerElementColor[0]);
    }

    if (geoNode.LayerElementMaterial) {
      geoInfo.material = LayerParser.parseMaterialIndices(
        geoNode.LayerElementMaterial[0],
      );
    }

    if (geoNode.LayerElementNormal) {
      geoInfo.normal = LayerParser.parseNormals(geoNode.LayerElementNormal[0]);
    }

    if (geoNode.LayerElementUV) {
      geoInfo.uv = [];

      let i = 0;

      while (geoNode.LayerElementUV[i]) {
        if ((geoNode.LayerElementUV[i]).UV) {
          geoInfo.uv.push(LayerParser.parseUVs(geoNode.LayerElementUV[i]));
        }

        i++;
      }
    }

    geoInfo.weightTable = this.createWeightTable();

    if (skeleton !== null) {
      geoInfo.skeleton = skeleton;

      skeleton.rawBones.forEach(function (rawBone, i) {
        rawBone.indices.forEach(function (index, j) {
          if (geoInfo.weightTable![index] === undefined) {
            geoInfo.weightTable![index] = [];
          }

          if (geoInfo.weightTable) {
            geoInfo.weightTable[index].push({
              id: i,
              weight: rawBone.weights[j],
            });
          }
        });
      });
    }

    return geoInfo;
  }

  /**
   * 添加变形目标
   */
  addMorphTargets (
    parentGeo: BufferGeometry,
    parentGeoNode: FBXGeometryNode,
    morphTargets: FBXMorphTarget[],
    preTransform: Matrix4,
  ): void {
    if (morphTargets.length === 0) {
      return;
    }

    parentGeo.morphTargetsRelative = true;
    parentGeo.morphAttributes.position = [];

    const fbxTree = this.context.fbxTree;
    const fbxGeometry = fbxTree.Objects?.Geometry;

    if (!fbxGeometry) {
      throw new Error('Objects.Geometry is not defined in FBXTree');
    }

    morphTargets.forEach(morphTarget => {
      const rawTargets = morphTarget.rawTargets;

      if (!rawTargets) {
        return;
      }
      rawTargets.forEach((rawTarget: FBXRawTargets) => {
        const morphGeoNode = fbxGeometry[(rawTarget.geoID ?? 0).toString()];

        if (morphGeoNode !== undefined) {
          this.genMorphGeometry(
            parentGeo,
            parentGeoNode,
            morphGeoNode,
            preTransform,
            rawTarget.name ?? '',
          );
        }
      });
    });
  }

  /**
   * 生成变形几何体
   */
  genMorphGeometry (
    parentGeo: BufferGeometry,
    parentGeoNode: FBXGeometryNode,
    morphGeoNode: FBXGeometryNode,
    preTransform: Matrix4,
    name: string,
  ): void {
    const basePositionsArray = parentGeoNode.Vertices?.a;
    const baseIndicesArray = parentGeoNode.PolygonVertexIndex?.a;

    const basePositions = Array.isArray(basePositionsArray) ? basePositionsArray : [];
    const baseIndices = Array.isArray(baseIndicesArray) ? baseIndicesArray : [];

    const morphPositionsSparseArray = morphGeoNode.Vertices?.a;
    const morphIndicesArray = morphGeoNode.Indexes?.a;

    const morphPositionsSparse = Array.isArray(morphPositionsSparseArray) ? morphPositionsSparseArray : [];
    const morphIndices = Array.isArray(morphIndicesArray) ? morphIndicesArray : [];

    const length = (parentGeo.attributes.position?.count) * 3;
    const morphPositions = new Float32Array(length);

    for (let i = 0; i < morphIndices.length; i++) {
      const morphIndex = (morphIndices[i]) * 3;

      morphPositions[morphIndex] = morphPositionsSparse[i * 3];
      morphPositions[morphIndex + 1] = morphPositionsSparse[i * 3 + 1];
      morphPositions[morphIndex + 2] = morphPositionsSparse[i * 3 + 2];
    }

    const morphGeoInfo: GeoInfo = {
      baseVertexPositions: Array.isArray(basePositions) ? basePositions : [],
      vertexIndices: Array.isArray(baseIndices) ? baseIndices : [],
      vertexPositions: Array.from(morphPositions),
    };

    const morphBuffers = BufferBuilder.genBuffers(morphGeoInfo);
    const positionAttribute = new Float32BufferAttribute(morphBuffers.vertex, 3);

    positionAttribute.name = name || morphGeoNode.attrName;
    positionAttribute.applyMatrix4(preTransform);

    parentGeo.morphAttributes.position.push(positionAttribute);
  }

  /**
   * 设置材质组
   */
  private setupMaterialGroups (geometry: BufferGeometry, buffers: { materialIndex: number[] }): void {
    let prevMaterialIndex = buffers.materialIndex[0];
    let startIndex = 0;

    buffers.materialIndex.forEach(function (currentIndex: number, i: number) {
      if (currentIndex !== prevMaterialIndex) {
        geometry.addGroup(startIndex, i - startIndex, prevMaterialIndex);
        prevMaterialIndex = currentIndex;
        startIndex = i;
      }
    });

    if (geometry.groups.length > 0) {
      const lastGroup = geometry.groups[geometry.groups.length - 1];
      const lastIndex = lastGroup.start + lastGroup.count;

      if (lastIndex !== buffers.materialIndex.length) {
        geometry.addGroup(lastIndex, buffers.materialIndex.length - lastIndex, prevMaterialIndex);
      }
    }

    if (geometry.groups.length === 0) {
      geometry.addGroup(0, buffers.materialIndex.length, buffers.materialIndex[0]);
    }
  }

  /**
   * 安全地设置 FBX Deformer
   */
  private setFBXDeformer (geometry: BufferGeometry, skeleton: FBXSkeleton): void {
    Object.defineProperty(geometry, 'FBX_Deformer', {
      value: skeleton,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  /**
   * 创建权重表
   */
  private createWeightTable (): WeightTable {
    return {};
  }

  /**
   * 获取负材质索引警告状态
   */
  getNegativeMaterialIndices (): boolean {
    return this.negativeMaterialIndices;
  }

  /**
   * 获取模型信息
   */
  getModelInfo (): ModelInfo {
    return this.modelInfo;
  }

  /**
   * 重置模型信息
   */
  resetModelInfo (): void {
    this.modelInfo = {
      isPBR: false,
      isTextured: false,
      isUVMapped: false,
      polygons: 0,
      quads: 0,
      triangles: 0,
      vertices: 0,
    };
  }
}