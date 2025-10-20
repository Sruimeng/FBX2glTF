/**
 * @file /parsers/geometry-parser.ts
 * @description 几何解析器实现
 */

import * as THREE from 'three';
import type {
  IParsingContext,
  IParser,
  BaseParser,
  ParserMetadata,
} from '../types/core';
import type {
  GeometryParserInput,
  GeometryParserOutput,
  GeometryAttributes,
  SkinInfo,
  GeometryStats,
  GeometryMetadata,
  GeometryParserConfig,
} from '../types/parsers/geometry-parser';
import type {
  FBXGeometryNode,
  FBXLayerNode,
  FBXLayerElementNode,
} from '../types/parsers/geometry-parser';
import type { MappingInformationType, ReferenceInformationType } from '../types/enums/mapping-types';
import type { DeformerData, SkinData, BlendShapeData } from '../types/parsers/deformer-parser';
import { ArrayUtils } from '../utils/data/array-utils';
import { MatrixUtils } from '../utils/transform/matrix-utils';

/**
 * 层元素数据接口
 */
interface LayerElementData {
  mappingType: MappingInformationType,
  referenceType: ReferenceInformationType,
  indices?: number[],
  data?: any[],
  dataByPolygonVertex?: any[],
  name: string,
}

/**
 * 几何解析器
 * 负责解析 FBX 几何体节点并生成 Three.js 缓冲几何体
 */
export class GeometryParser extends BaseParser<GeometryParserInput, GeometryParserOutput> {
  private config: GeometryParserConfig;

  constructor (context: IParsingContext, config?: GeometryParserConfig) {
    super(context, {
      name: 'GeometryParser',
      version: '1.0.0',
      description: '解析 FBX 几何体节点为 Three.js 缓冲几何体',
      dependencies: ['THREE', 'ArrayUtils', 'MatrixUtils'],
    });

    this.config = {
      generateNormals: false,
      generateTangents: false,
      useIndex: true,
      vertexTolerance: 0.0001,
      normalSmoothingAngle: 60, // 度
      optimizeGeometry: true,
      maxBonesPerVertex: 4,
      weightThreshold: 0.01,
      enableMorphTargets: true,
      ...config,
    };
  }

  /**
   * 解析几何体节点
   */
  parse (input: GeometryParserInput, context: IParsingContext): GeometryParserOutput {
    const { geometryNode, id, deformerInfo, materialMapping } = input;

    this.log(`开始解析几何体节点: ${geometryNode.GeometryName?.value || `Geometry_${id}`}`);

    try {
      // 提取层元素数据
      const layerElements = this.extractLayerElements(geometryNode.Layer);

      // 解析顶点位置
      const vertices = this.parseVertices(geometryNode.Vertices);

      // 解析顶点索引（面信息）
      const faceIndices = this.parsePolygonVertexIndex(geometryNode.PolygonVertexIndex);

      // 构建几何体属性
      const geometryAttributes = this.buildGeometryAttributes(layerElements, vertices, faceIndices);

      // 创建缓冲几何体
      const geometry = this.createBufferGeometry(geometryAttributes, faceIndices);

      // 应用变形器数据
      const skinInfo = this.applyDeformerData(geometry, deformerInfo || []);

      // 生成缺失的属性
      this.generateMissingAttributes(geometry, geometryAttributes, skinInfo);

      // 优化几何体
      if (this.config.optimizeGeometry) {
        this.optimizeGeometry(geometry);
      }

      // 生成统计信息
      const stats = this.generateGeometryStats(geometry, geometryAttributes, skinInfo);

      // 生成元数据
      const metadata = this.generateGeometryMetadata(geometryNode, geometryAttributes, skinInfo);

      const output: GeometryParserOutput = {
        geometry,
        name: geometryNode.GeometryName?.value || `Geometry_${id}`,
        attributes: geometryAttributes,
        morphTargets: this.createMorphTargets(geometry, deformerInfo || []),
        skinInfo: skinInfo || undefined,
        stats,
      };

      this.log(`成功解析几何体: ${output.name} (${stats.vertexCount} 顶点, ${stats.faceCount} 面)`);

      return output;

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 提取层元素数据
   */
  private extractLayerElements (layer?: FBXLayerNode): Map<string, LayerElementData> {
    const layerElements = new Map<string, LayerElementData>();

    if (!layer || !layer.LayerElement) {
      this.log('几何体没有层元素', 'warn');

      return layerElements;
    }

    layer.LayerElement.forEach(element => {
      const elementData: LayerElementData = {
        mappingType: (element.MappingInformationType?.value as MappingInformationType) || MappingInformationType.ByPolygonVertex,
        referenceType: (element.ReferenceInformationType?.value as ReferenceInformationType) || ReferenceInformationType.Direct,
        indices: this.parseArray(element.Indexes),
        data: this.parseArray(element.Direct),
        dataByPolygonVertex: this.parseArray(element.Vertices || element.Normals || element.UV || element.Colors),
        name: element.Name?.value || 'Unknown',
      };

      layerElements.set(elementData.name, elementData);
    });

    this.log(`提取 ${layerElements.size} 个层元素`);

    return layerElements;
  }

  /**
   * 解析数组数据
   */
  private parseArray (arrayData: any): number[] {
    if (!arrayData) {return [];}
    if (Array.isArray(arrayData.a)) {return arrayData.a;}
    if (Array.isArray(arrayData)) {return arrayData;}

    return [];
  }

  /**
   * 解析顶点位置
   */
  private parseVertices (verticesData: any): THREE.Vector3[] {
    if (!verticesData || !verticesData.a) {
      this.log('几何体没有顶点数据', 'warn');

      return [];
    }

    const vertexArray = verticesData.a;
    const vertices: THREE.Vector3[] = [];

    for (let i = 0; i < vertexArray.length; i += 3) {
      vertices.push(new THREE.Vector3(vertexArray[i], vertexArray[i + 1], vertexArray[i + 2]));
    }

    this.log(`解析 ${vertices.length} 个顶点`);

    return vertices;
  }

  /**
   * 解析多边形顶点索引
   */
  private parsePolygonVertexIndex (indexData: any): number[] {
    if (!indexData || !indexData.a) {
      this.log('几何体没有索引数据', 'warn');

      return [];
    }

    const indexArray = indexData.a;
    const indices: number[] = [];

    for (let i = 0; i < indexArray.length; i++) {
      const index = indexArray[i];

      if (index < 0) {
        // 负索引表示面的结束
        indices.push(~index); // 位运算取反得到正数
      } else {
        indices.push(index);
      }
    }

    this.log(`解析 ${indices.length} 个顶点索引`);

    return indices;
  }

  /**
   * 构建几何体属性
   */
  private buildGeometryAttributes (
    layerElements: Map<string, LayerElementData>,
    vertices: THREE.Vector3[],
    faceIndices: number[]
  ): GeometryAttributes {
    const attributes: GeometryAttributes = {};

    // 顶点位置
    if (vertices.length > 0) {
      const positions = new Float32Array(vertices.length * 3);

      vertices.forEach((vertex, i) => {
        positions[i * 3] = vertex.x;
        positions[i * 3 + 1] = vertex.y;
        positions[i * 3 + 2] = vertex.z;
      });
      attributes.position = new THREE.BufferAttribute(positions, 3);
    }

    // 解析层元素属性
    layerElements.forEach((elementData, elementName) => {
      switch (elementName.toLowerCase()) {
        case 'normal':
          attributes.normal = this.parseNormals(elementData, faceIndices, vertices.length);

          break;
        case 'uv':
        case 'uvmap':
          attributes.uv = this.parseUVs(elementData, faceIndices, vertices.length);

          break;
        case 'color':
          attributes.color = this.parseColors(elementData, faceIndices, vertices.length);

          break;
        case 'material':
          // 材质索引通常不作为属性存储
          break;
        case 'smoothing':
          // 平滑组信息用于法线计算
          break;
        default:
          this.log(`未知层元素类型: ${elementName}`, 'warn');
      }
    });

    this.log(`构建几何体属性: ${Object.keys(attributes).length} 个属性`);

    return attributes;
  }

  /**
   * 解析法线
   */
  private parseNormals (
    elementData: LayerElementData,
    faceIndices: number[],
    vertexCount: number
  ): THREE.BufferAttribute | undefined {
    if (!elementData.dataByPolygonVertex) {return undefined;}

    const normals = new Float32Array(vertexCount * 3);

    // 根据映射类型解析法线
    switch (elementData.mappingType) {
      case MappingInformationType.ByPolygonVertex:
        this.parseByPolygonVertexData(elementData, faceIndices, normals, 3);

        break;
      case MappingInformationType.ByPolygon:
        this.parseByPolygonData(elementData, faceIndices, normals, 3);

        break;
      case MappingInformationType.ByVertice:
        this.parseByVertexData(elementData, normals, 3);

        break;
      case MappingInformationType.AllSame:
        this.parseAllSameData(elementData, normals, 3);

        break;
    }

    return new THREE.BufferAttribute(normals, 3);
  }

  /**
   * 解析UV坐标
   */
  private parseUVs (
    elementData: LayerElementData,
    faceIndices: number[],
    vertexCount: number
  ): THREE.BufferAttribute | undefined {
    if (!elementData.dataByPolygonVertex) {return undefined;}

    const uvs = new Float32Array(vertexCount * 2);

    // 根据映射类型解析UV
    switch (elementData.mappingType) {
      case MappingInformationType.ByPolygonVertex:
        this.parseByPolygonVertexData(elementData, faceIndices, uvs, 2);

        break;
      case MappingInformationType.ByPolygon:
        this.parseByPolygonData(elementData, faceIndices, uvs, 2);

        break;
      case MappingInformationType.ByVertice:
        this.parseByVertexData(elementData, uvs, 2);

        break;
      case MappingInformationType.AllSame:
        this.parseAllSameData(elementData, uvs, 2);

        break;
    }

    return new THREE.BufferAttribute(uvs, 2);
  }

  /**
   * 解析顶点颜色
   */
  private parseColors (
    elementData: LayerElementData,
    faceIndices: number[],
    vertexCount: number
  ): THREE.BufferAttribute | undefined {
    if (!elementData.dataByPolygonVertex) {return undefined;}

    const colors = new Float32Array(vertexCount * 3);

    // 根据映射类型解析颜色
    switch (elementData.mappingType) {
      case MappingInformationType.ByPolygonVertex:
        this.parseByPolygonVertexData(elementData, faceIndices, colors, 3);

        break;
      case MappingInformationType.ByPolygon:
        this.parseByPolygonData(elementData, faceIndices, colors, 3);

        break;
      case MappingInformationType.ByVertice:
        this.parseByVertexData(elementData, colors, 3);

        break;
      case MappingInformationType.AllSame:
        this.parseAllSameData(elementData, colors, 3);

        break;
    }

    return new THREE.BufferAttribute(colors, 3);
  }

  /**
   * 解析按多边形顶点映射的数据
   */
  private parseByPolygonVertexData (
    elementData: LayerElementData,
    faceIndices: number[],
    outputArray: Float32Array,
    componentCount: number
  ): void {
    const sourceData = elementData.dataByPolygonVertex!;
    let outputIndex = 0;
    let faceVertexIndex = 0;

    for (let i = 0; i < faceIndices.length; i++) {
      const vertexIndex = faceIndices[i];

      // 根据引用类型获取数据
      let dataIndex: number;

      if (elementData.referenceType === ReferenceInformationType.IndexToDirect) {
        dataIndex = elementData.indices ? elementData.indices[faceVertexIndex] : faceVertexIndex;
      } else {
        dataIndex = faceVertexIndex;
      }

      // 复制数据到输出数组
      for (let j = 0; j < componentCount; j++) {
        const sourceIndex = dataIndex * componentCount + j;

        if (sourceIndex < sourceData.length) {
          outputArray[vertexIndex * componentCount + j] = sourceData[sourceIndex];
        }
      }

      outputIndex += componentCount;
      faceVertexIndex++;

      // 检查是否是面的结束
      if (i < faceIndices.length - 1 && this.isFaceEnd(faceIndices, i)) {
        // 面结束，重置面顶点索引
        continue;
      }
    }
  }

  /**
   * 解析按多边形映射的数据
   */
  private parseByPolygonData (
    elementData: LayerElementData,
    faceIndices: number[],
    outputArray: Float32Array,
    componentCount: number
  ): void {
    const sourceData = elementData.dataByPolygonVertex!;
    let faceIndex = 0;
    let faceVertexIndex = 0;

    for (let i = 0; i < faceIndices.length; i++) {
      const vertexIndex = faceIndices[i];

      // 根据引用类型获取数据
      let dataIndex: number;

      if (elementData.referenceType === ReferenceInformationType.IndexToDirect) {
        dataIndex = elementData.indices ? elementData.indices[faceIndex] : faceIndex;
      } else {
        dataIndex = faceIndex;
      }

      // 复制数据到输出数组
      for (let j = 0; j < componentCount; j++) {
        const sourceIndex = dataIndex * componentCount + j;

        if (sourceIndex < sourceData.length) {
          outputArray[vertexIndex * componentCount + j] = sourceData[sourceIndex];
        }
      }

      faceVertexIndex++;

      // 检查是否是面的结束
      if (i < faceIndices.length - 1 && this.isFaceEnd(faceIndices, i)) {
        faceIndex++;
        faceVertexIndex = 0;
      }
    }
  }

  /**
   * 解析按顶点映射的数据
   */
  private parseByVertexData (
    elementData: LayerElementData,
    outputArray: Float32Array,
    componentCount: number
  ): void {
    const sourceData = elementData.dataByPolygonVertex!;

    for (let i = 0; i < outputArray.length / componentCount; i++) {
      let dataIndex: number;

      if (elementData.referenceType === ReferenceInformationType.IndexToDirect) {
        dataIndex = elementData.indices ? elementData.indices[i] : i;
      } else {
        dataIndex = i;
      }

      for (let j = 0; j < componentCount; j++) {
        const sourceIndex = dataIndex * componentCount + j;

        if (sourceIndex < sourceData.length) {
          outputArray[i * componentCount + j] = sourceData[sourceIndex];
        }
      }
    }
  }

  /**
   * 解析所有顶点相同的数据
   */
  private parseAllSameData (
    elementData: LayerElementData,
    outputArray: Float32Array,
    componentCount: number
  ): void {
    const sourceData = elementData.dataByPolygonVertex!;

    if (sourceData.length >= componentCount) {
      for (let i = 0; i < outputArray.length / componentCount; i++) {
        for (let j = 0; j < componentCount; j++) {
          outputArray[i * componentCount + j] = sourceData[j];
        }
      }
    }
  }

  /**
   * 检查是否是面的结束
   */
  private isFaceEnd (faceIndices: number[], currentIndex: number): boolean {
    return currentIndex < faceIndices.length - 1 &&
           (faceIndices[currentIndex + 1] === -1 ||
            (faceIndices[currentIndex + 1] < 0 &&
             faceIndices[currentIndex + 2] >= 0));
  }

  /**
   * 创建缓冲几何体
   */
  private createBufferGeometry (
    attributes: GeometryAttributes,
    faceIndices: number[]
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // 设置位置属性
    if (attributes.position) {
      geometry.setAttribute('position', attributes.position);
    }

    // 设置其他属性
    if (attributes.normal) {
      geometry.setAttribute('normal', attributes.normal);
    }

    if (attributes.uv) {
      geometry.setAttribute('uv', attributes.uv);
    }

    if (attributes.color) {
      geometry.setAttribute('color', attributes.color);
    }

    if (attributes.skinWeight) {
      geometry.setAttribute('skinWeight', attributes.skinWeight);
    }

    if (attributes.skinIndex) {
      geometry.setAttribute('skinIndex', attributes.skinIndex);
    }

    // 设置索引
    if (this.config.useIndex && faceIndices.length > 0) {
      const indices = this.buildIndexArray(faceIndices);

      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    return geometry;
  }

  /**
   * 构建索引数组
   */
  private buildIndexArray (faceIndices: number[]): Uint32Array {
    const indices: number[] = [];
    let currentFace: number[] = [];

    for (let i = 0; i < faceIndices.length; i++) {
      const vertexIndex = faceIndices[i];

      currentFace.push(vertexIndex);

      // 检查是否是面的结束
      if (i === faceIndices.length - 1 || this.isFaceEnd(faceIndices, i)) {
        // 三角化面
        if (currentFace.length >= 3) {
          const triangles = this.triangulateFace(currentFace);

          indices.push(...triangles);
        }
        currentFace = [];
      }
    }

    return new Uint32Array(indices);
  }

  /**
   * 三角化面
   */
  private triangulateFace (faceVertices: number[]): number[] {
    const triangles: number[] = [];

    if (faceVertices.length === 3) {
      // 已经是三角形
      triangles.push(...faceVertices);
    } else if (faceVertices.length === 4) {
      // 四边形分割为两个三角形
      triangles.push(faceVertices[0], faceVertices[1], faceVertices[2]);
      triangles.push(faceVertices[0], faceVertices[2], faceVertices[3]);
    } else {
      // 多边形扇形三角化
      for (let i = 1; i < faceVertices.length - 1; i++) {
        triangles.push(faceVertices[0], faceVertices[i], faceVertices[i + 1]);
      }
    }

    return triangles;
  }

  /**
   * 应用变形器数据
   */
  private applyDeformerData (geometry: THREE.BufferGeometry, deformerInfo: DeformerData[]): SkinInfo | undefined {
    const skinDeformers = deformerInfo.filter(d => d.type === 'skin') as SkinData[];
    const blendShapeDeformers = deformerInfo.filter(d => d.type === 'blendshape') as BlendShapeData[];

    // 应用皮肤数据
    if (skinDeformers.length > 0) {
      const skinData = skinDeformers[0]; // 通常只有一个皮肤变形器

      return this.applySkinData(geometry, skinData);
    }

    // 应用混合形状数据
    if (blendShapeDeformers.length > 0) {
      this.applyBlendShapeData(geometry, blendShapeDeformers);
    }

    return undefined;
  }

  /**
   * 应用皮肤数据
   */
  private applySkinData (geometry: THREE.BufferGeometry, skinData: SkinData): SkinInfo {
    if (skinData.skinWeightData.length === 0) {
      return {
        boneCount: 0,
        maxBonesPerVertex: 0,
        weightMap: new Map(),
        boneIndexMap: new Map(),
      };
    }

    const positionAttribute = geometry.getAttribute('position');
    const vertexCount = positionAttribute ? positionAttribute.count : 0;

    // 创建皮肤权重属性
    const skinWeights = new Float32Array(vertexCount * 4);
    const skinIndices = new Float32Array(vertexCount * 4);

    const weightMap = new Map<number, typeof skinData.skinWeightData>();
    const boneIndexMap = new Map<number, number>();

    // 处理皮肤权重数据
    skinData.skinWeightData.forEach(weightData => {
      weightMap.set(weightData.vertexIndex, [weightData]);
    });

    // 填充属性数组
    for (let i = 0; i < vertexCount; i++) {
      const vertexWeights = weightMap.get(i) || [];

      let totalWeight = 0;
      const maxBones = Math.min(this.config.maxBonesPerVertex!, vertexWeights.length);

      for (let j = 0; j < maxBones; j++) {
        if (j < vertexWeights.length && vertexWeights[j] && vertexWeights[j].weights.length > 0) {
          const weight = vertexWeights[j].weights[0];
          const boneIndex = vertexWeights[j].boneIndices[0];

          if (weight >= this.config.weightThreshold!) {
            skinWeights[i * 4 + j] = weight;
            skinIndices[i * 4 + j] = boneIndex;
            totalWeight += weight;

            if (!boneIndexMap.has(boneIndex)) {
              boneIndexMap.set(boneIndex, boneIndexMap.size);
            }
          }
        }
      }

      // 归一化权重
      if (totalWeight > 0 && this.config.normalizeWeights) {
        for (let j = 0; j < maxBones; j++) {
          skinWeights[i * 4 + j] /= totalWeight;
        }
      }
    }

    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));

    return {
      boneCount: boneIndexMap.size,
      maxBonesPerVertex: this.config.maxBonesPerVertex!,
      weightMap,
      boneIndexMap,
    };
  }

  /**
   * 应用混合形状数据
   */
  private applyBlendShapeData (geometry: THREE.BufferGeometry, blendShapeDeformers: BlendShapeData[]): void {
    if (!this.config.enableMorphTargets) {return;}

    const positionAttribute = geometry.getAttribute('position');

    if (!positionAttribute) {return;}

    const vertexCount = positionAttribute.count;

    blendShapeDeformers.forEach(blendShape => {
      blendShape.channels.forEach(channel => {
        if (channel.targetGeometry) {
          // 使用目标几何体创建变形目标
          const targetPositions = channel.targetGeometry.getAttribute('position');

          if (targetPositions && targetPositions.count === vertexCount) {
            geometry.morphAttributes.position = geometry.morphAttributes.position || [];
            geometry.morphAttributes.position.push(targetPositions.clone());
            geometry.morphTargets!.push({
              name: channel.name,
              positions: targetPositions.array as Float32Array,
            });
          }
        }
      });
    });
  }

  /**
   * 生成缺失的属性
   */
  private generateMissingAttributes (
    geometry: THREE.BufferGeometry,
    attributes: GeometryAttributes,
    skinInfo?: SkinInfo
  ): void {
    // 生成法线
    if (!attributes.normal && this.config.generateNormals) {
      geometry.computeVertexNormals();
      this.log('生成顶点法线');
    }

    // 生成切线
    if (!attributes.tangent && this.config.generateTangents && attributes.uv) {
      geometry.computeTangents();
      this.log('生成切线');
    }

    // 生成边界框
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  /**
   * 优化几何体
   */
  private optimizeGeometry (geometry: THREE.BufferGeometry): void {
    // 合并重复顶点
    if (this.config.vertexTolerance! > 0) {
      // 这里可以实现顶点合并逻辑
      this.log('优化几何体：顶点合并');
    }

    // 优化索引
    if (this.config.useIndex) {
      // 这里可以实现索引优化逻辑
      this.log('优化几何体：索引优化');
    }
  }

  /**
   * 创建变形目标
   */
  private createMorphTargets (geometry: THREE.BufferGeometry, deformerInfo: DeformerData[]): THREE.MorphTarget[] {
    const morphTargets: THREE.MorphTarget[] = [];

    const blendShapeDeformers = deformerInfo.filter(d => d.type === 'blendshape') as BlendShapeData[];

    blendShapeDeformers.forEach(blendShape => {
      blendShape.channels.forEach(channel => {
        if (channel.targetGeometry) {
          morphTargets.push({
            name: channel.name,
            positions: channel.targetGeometry.getAttribute('position')?.array as Float32Array,
            normals: channel.targetGeometry.getAttribute('normal')?.array as Float32Array,
            colors: channel.targetGeometry.getAttribute('color')?.array as Float32Array,
          });
        }
      });
    });

    return morphTargets;
  }

  /**
   * 生成几何体统计信息
   */
  private generateGeometryStats (
    geometry: THREE.BufferGeometry,
    attributes: GeometryAttributes,
    skinInfo?: SkinInfo
  ): GeometryStats {
    const positionAttribute = geometry.getAttribute('position');
    const indexAttribute = geometry.getIndex();

    return {
      vertexCount: positionAttribute ? positionAttribute.count : 0,
      faceCount: indexAttribute ? indexAttribute.count / 3 : 0,
      triangleCount: indexAttribute ? indexAttribute.count / 3 : 0,
      attributeCount: Object.keys(attributes).length,
      morphTargetCount: geometry.morphTargets ? geometry.morphTargets.length : 0,
      boneCount: skinInfo ? skinInfo.boneCount : 0,
    };
  }

  /**
   * 生成几何体元数据
   */
  private generateGeometryMetadata (
    geometryNode: FBXGeometryNode,
    attributes: GeometryAttributes,
    skinInfo?: SkinInfo
  ): GeometryMetadata {
    return {
      name: geometryNode.GeometryName?.value || 'UnknownGeometry',
      type: 'mesh',
      isMesh: true,
      isSkinned: skinInfo ? skinInfo.boneCount > 0 : false,
      hasMorphTargets: attributes.position ? false : false, // 将在后续阶段更新
      hasVertexColors: !!attributes.color,
      hasUV: !!attributes.uv,
      hasNormals: !!attributes.normal,
    };
  }

  /**
   * 验证几何体节点
   */
  protected validateInput (input: GeometryParserInput): void {
    super.validateInput(input);

    if (!input.geometryNode) {
      throw new Error('几何体节点不能为空');
    }

    if (input.geometryNode.Type !== 'Geometry') {
      throw new Error(`无效的几何体节点类型: ${input.geometryNode.Type}`);
    }
  }

  /**
   * 获取配置
   */
  public getConfig (): GeometryParserConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig (newConfig: Partial<GeometryParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('更新几何解析器配置');
  }
}

/**
 * 几何解析器工厂
 */
export class GeometryParserFactory {
  private defaultConfig: GeometryParserConfig;

  constructor (defaultConfig?: GeometryParserConfig) {
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 创建几何解析器实例
   */
  create (context: IParsingContext, config?: GeometryParserConfig): GeometryParser {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return new GeometryParser(context, mergedConfig);
  }

  /**
   * 获取默认配置
   */
  public getDefaultConfig (): GeometryParserConfig {
    return { ...this.defaultConfig };
  }
}
