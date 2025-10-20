/**
 * @file /parsers/deformer-parser.ts
 * @description 变形器解析器实现
 */

import * as THREE from 'three';
import type {
  IParsingContext,
  IParser,
  ParserMetadata,
} from '../types/core';
import { BaseParser } from '../types/core';
import type {
  DeformerParserInput,
  DeformerParserOutput,
  DeformerData,
  SkinData,
  BlendShapeData,
  SkinWeightData,
  BlendShapeChannelData,
  DeformerMetadata,
  DeformerParserConfig,
} from '../types/parsers/deformer-parser';
import type {
  FBXDeformerNode,
  FBXClusterNode,
  FBXSkinNode,
  FBXBlendShapeNode,
  FBXBlendShapeChannelNode,
} from '../types/parsers/deformer-parser';
import { ArrayUtils } from '../utils/data/array-utils';

/**
 * FBX 变形器类型枚举
 */
enum FBXDeformerType {
  SKIN = 'Skin',
  BLEND_SHAPE = 'BlendShape',
  CACHE = 'Cache'
}

/**
 * 变形器解析器
 * 负责解析 FBX 变形器节点（皮肤、混合形状等）
 */
export class DeformerParser extends BaseParser<DeformerParserInput, DeformerParserOutput> {
  private config: DeformerParserConfig;

  constructor (context: IParsingContext, config?: DeformerParserConfig) {
    super(context, {
      name: 'DeformerParser',
      version: '1.0.0',
      description: '解析 FBX 变形器节点为 Three.js 变形数据',
      dependencies: ['THREE'],
    });

    this.config = {
      maxBonesPerVertex: 4,
      weightThreshold: 0.01,
      normalizeWeights: true,
      optimizeSkinWeights: true,
      blendShapePrecision: 1.0,
      enableBlendShapeCache: true,
      ...config,
    };
  }

  /**
   * 解析变形器节点
   */
  parse (input: DeformerParserInput, context: IParsingContext): DeformerParserOutput {
    const { deformerNode, id, childDeformers, geometryId, boneNodes } = input;

    this.log(`开始解析变形器节点: ${deformerNode.DeformerName?.value || `Deformer_${id}`}`);

    try {
      // 确定变形器类型
      const deformerType = this.detectDeformerType(deformerNode);

      let deformerData: DeformerData;

      switch (deformerType) {
        case FBXDeformerType.SKIN:
          deformerData = this.parseSkinDeformer(input, childDeformers || [], boneNodes || new Map());

          break;
        case FBXDeformerType.BLEND_SHAPE:
          deformerData = this.parseBlendShapeDeformer(input, childDeformers || []);

          break;
        case FBXDeformerType.CACHE:
          deformerData = this.parseCacheDeformer(input);

          break;
        default:
          throw new Error(`不支持的变形器类型: ${deformerType}`);
      }

      // 生成元数据
      const metadata = this.generateDeformerMetadata(deformerNode, deformerData);

      const output: DeformerParserOutput = {
        deformerData,
        metadata,
      };

      this.log(`成功解析变形器: ${output.metadata.name} (${output.metadata.type})`);

      return output;

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 检测变形器类型
   */
  private detectDeformerType (deformerNode: FBXDeformerNode): FBXDeformerType {
    const subType = deformerNode.SubType?.value?.toLowerCase();

    if (subType?.includes('skin')) {
      return FBXDeformerType.SKIN;
    }

    if (subType?.includes('blend') || subType?.includes('morph')) {
      return FBXDeformerType.BLEND_SHAPE;
    }

    if (subType?.includes('cache')) {
      return FBXDeformerType.CACHE;
    }

    // 默认根据节点名称判断
    const nodeName = deformerNode.DeformerName?.value?.toLowerCase() || '';

    if (nodeName.includes('skin') || nodeName.includes('cluster')) {
      return FBXDeformerType.SKIN;
    }

    return FBXDeformerType.BLEND_SHAPE;
  }

  /**
   * 解析皮肤变形器
   */
  private parseSkinDeformer (
    input: DeformerParserInput,
    childDeformers: FBXDeformerNode[],
    boneNodes: Map<number, THREE.Bone>
  ): SkinData {
    this.log('解析皮肤变形器');

    // 处理子变形器（集群）
    const clusters = childDeformers.filter(d => d.SubType?.value === 'Cluster');

    if (clusters.length === 0) {
      this.log('皮肤变形器没有集群，创建空皮肤数据', 'warn');

      return this.createEmptySkinData();
    }

    // 解析集群数据
    const skinWeights = this.parseClusters(clusters, boneNodes);

    // 创建骨骼数组
    const bones = this.createBonesArray(skinWeights, boneNodes);

    // 创建骨骼逆矩阵数组
    const boneInverses = this.createBoneInverseMatrices(skinWeights, boneNodes);

    return {
      bones,
      boneInverses,
      skinWeights,
    };
  }

  /**
   * 解析集群节点
   */
  private parseClusters (
    clusters: FBXDeformerNode[],
    boneNodes: Map<number, THREE.Bone>
  ): SkinWeightData[] {
    const allSkinWeights: SkinWeightData[] = [];

    clusters.forEach((cluster, index) => {
      this.log(`解析集群 ${index + 1}/${clusters.length}`);

      // 获取关联的骨骼
      const associatedBone = this.findAssociatedBone(cluster, boneNodes);

      if (!associatedBone) {
        this.log(`集群 ${index} 没有关联的骨骼`, 'warn');

        return;
      }

      // 解析索引和权重
      const indices = this.parseIndexData(cluster.Indexes);
      const weights = this.parseWeightData(cluster.Weights);

      if (indices.length !== weights.length) {
        this.log(`集群 ${index} 索引和权重数量不匹配: ${indices.length} vs ${weights.length}`, 'warn');

        return;
      }

      // 创建皮肤权重数据
      for (let i = 0; i < indices.length; i++) {
        const vertexIndex = indices[i];
        const weight = weights[i];

        // 过滤低权重
        if (weight < this.config.weightThreshold!) {
          continue;
        }

        allSkinWeights.push({
          vertexIndex,
          boneIndices: [associatedBone.id],
          weights: [weight],
        });
      }
    });

    // 合并和优化权重数据
    return this.optimizeSkinWeights(allSkinWeights);
  }

  /**
   * 解析索引数据
   */
  private parseIndexData (indexData: any): number[] {
    if (!indexData) {return [];}

    if (Array.isArray(indexData)) {
      return indexData.map(idx => typeof idx === 'number' ? idx : parseInt(idx, 10));
    }

    if (indexData.a && Array.isArray(indexData.a)) {
      return indexData.a.map((idx: any) => typeof idx === 'number' ? idx : parseInt(idx, 10));
    }

    this.log(`无法解析索引数据: ${JSON.stringify(indexData)}`, 'warn');

    return [];
  }

  /**
   * 解析权重数据
   */
  private parseWeightData (weightData: any): number[] {
    if (!weightData) {return [];}

    if (Array.isArray(weightData)) {
      return weightData.map(w => typeof w === 'number' ? w : parseFloat(w));
    }

    if (weightData.a && Array.isArray(weightData.a)) {
      return weightData.a.map((w: any) => typeof w === 'number' ? w : parseFloat(w));
    }

    this.log(`无法解析权重数据: ${JSON.stringify(weightData)}`, 'warn');

    return [];
  }

  /**
   * 查找关联的骨骼
   */
  private findAssociatedBone (cluster: FBXDeformerNode, boneNodes: Map<number, THREE.Bone>): THREE.Bone | undefined {
    // 根据集群名称查找关联的骨骼
    const clusterName = cluster.DeformerName?.value;

    if (clusterName) {
      for (const [id, bone] of boneNodes) {
        if (bone.name === clusterName) {
          return bone;
        }
      }
    }

    // 如果找不到，返回第一个骨骼
    if (boneNodes.size > 0) {
      return boneNodes.values().next().value;
    }

    return undefined;
  }

  /**
   * 优化皮肤权重数据
   */
  private optimizeSkinWeights (skinWeights: SkinWeightData[]): SkinWeightData[] {
    if (!this.config.optimizeSkinWeights) {
      return skinWeights;
    }

    // 按顶点索引分组
    const vertexWeights = new Map<number, SkinWeightData>();

    skinWeights.forEach(skinWeight => {
      const existing = vertexWeights.get(skinWeight.vertexIndex);

      if (existing) {
        // 合并权重数据
        existing.boneIndices.push(...skinWeight.boneIndices);
        existing.weights.push(...skinWeight.weights);
      } else {
        vertexWeights.set(skinWeight.vertexIndex, {
          vertexIndex: skinWeight.vertexIndex,
          boneIndices: [...skinWeight.boneIndices],
          weights: [...skinWeight.weights],
        });
      }
    });

    // 限制每顶点的骨骼数量
    const optimizedWeights: SkinWeightData[] = [];

    for (const [vertexIndex, weightData] of vertexWeights) {
      if (weightData.boneIndices.length > this.config.maxBonesPerVertex!) {
        // 排序并截取最重要的权重
        const sortedIndices = this.sortWeightsByImportance(weightData.weights);
        const selectedIndices = sortedIndices.slice(0, this.config.maxBonesPerVertex);

        const selectedBoneIndices = selectedIndices.map(i => weightData.boneIndices[i]);
        const selectedWeights = selectedIndices.map(i => weightData.weights[i]);

        // 归一化权重
        const totalWeight = selectedWeights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = selectedWeights.map(w => w / totalWeight);

        optimizedWeights.push({
          vertexIndex,
          boneIndices: selectedBoneIndices,
          weights: normalizedWeights,
        });
      } else {
        optimizedWeights.push(weightData);
      }
    }

    this.log(`优化皮肤权重: ${skinWeights.length} -> ${optimizedWeights.length}`);

    return optimizedWeights;
  }

  /**
   * 根据重要性排序权重索引
   */
  private sortWeightsByImportance (weights: number[]): number[] {
    return weights
      .map((weight, index) => ({ weight, index }))
      .sort((a, b) => b.weight - a.weight)
      .map(item => item.index);
  }

  /**
   * 创建骨骼数组
   */
  private createBonesArray (
    skinWeights: SkinWeightData[],
    boneNodes: Map<number, THREE.Bone>
  ): THREE.Bone[] {
    const boneIds = new Set<number>();

    skinWeights.forEach(weightData => {
      weightData.boneIndices.forEach(boneId => boneIds.add(boneId));
    });

    const bones: THREE.Bone[] = [];

    boneIds.forEach(boneId => {
      const bone = boneNodes.get(boneId);

      if (bone) {
        bones.push(bone);
      }
    });

    return bones;
  }

  /**
   * 创建骨骼逆矩阵数组
   */
  private createBoneInverseMatrices (
    skinWeights: SkinWeightData[],
    boneNodes: Map<number, THREE.Bone>
  ): THREE.Matrix4[] {
    const boneIds = new Set<number>();

    skinWeights.forEach(weightData => {
      weightData.boneIndices.forEach(boneId => boneIds.add(boneId));
    });

    const boneInverses: THREE.Matrix4[] = [];

    boneIds.forEach(boneId => {
      const bone = boneNodes.get(boneId);

      if (bone) {
        // 创建逆绑定矩阵
        const inverseMatrix = new THREE.Matrix4().copy(bone.matrixWorld).invert();

        boneInverses.push(inverseMatrix);
      }
    });

    return boneInverses;
  }

  /**
   * 创建空皮肤数据
   */
  private createEmptySkinData (): SkinData {
    return {
      bones: [],
      boneInverses: [],
      skinWeights: [],
    };
  }

  /**
   * 解析混合形状变形器
   */
  private parseBlendShapeDeformer (
    input: DeformerParserInput,
    childDeformers: FBXDeformerNode[]
  ): BlendShapeData {
    this.log('解析混合形状变形器');

    const channels = childDeformers.filter(d => d.SubType?.value === 'BlendShapeChannel');

    const blendShapeChannels: BlendShapeChannelData[] = channels.map((channel, index) => {
      const channelName = channel.DeformerName?.value || `BlendShape_${index}`;
      const fullWeights = this.parseWeightData((channel as any).FullWeights);
      const defaultWeights = this.parseWeightData((channel as any).DefaultWeights);

      return {
        name: channelName,
        targetGeometry: undefined, // 将在几何解析阶段设置
        weight: defaultWeights.length > 0 ? defaultWeights[0] : 0.0,
        fullWeights,
        defaultWeights,
      };
    });

    return {
      name: input.deformerNode.DeformerName?.value || 'UnknownBlendShape',
      channels: blendShapeChannels,
      targetGeometryId: input.geometryId,
    };
  }

  /**
   * 解析缓存变形器
   */
  private parseCacheDeformer (input: DeformerParserInput): DeformerData {
    this.log('解析缓存变形器', 'warn');

    return {
      type: 'cache',
      cacheData: new Float32Array(0), // 占位符
      cacheTime: 0,
      precision: this.config.blendShapePrecision!,
    };
  }

  /**
   * 生成变形器元数据
   */
  private generateDeformerMetadata (
    deformerNode: FBXDeformerNode,
    deformerData: DeformerData
  ): DeformerMetadata {
    const type = (deformerData as any).type === 'skin' ? 'skin' :
      (deformerData as any).type === 'blendshape' ? 'blendshape' : 'cache';

    let vertexCount = 0;
    let totalWeight = 0;
    let isValid = true;

    if ((deformerData as any).type === 'skin') {
      const skinData = deformerData as SkinData;

      vertexCount = skinData.skinWeights?.length || 0;
      totalWeight = (skinData.skinWeights || []).reduce(
        (sum, weightData) => sum + weightData.weights.reduce((s, w) => s + w, 0), 0
      );
      isValid = skinData.bones.length > 0 && vertexCount > 0;
    } else if ((deformerData as any).type === 'blendshape') {
      const blendData = deformerData as BlendShapeData;

      vertexCount = 0; // 将在几何解析阶段确定
      totalWeight = blendData.channels.reduce((sum, channel) => sum + channel.weight, 0);
      isValid = blendData.channels.length > 0;
    }

    return {
      name: deformerNode.DeformerName?.value || 'UnknownDeformer',
      type,
      vertexCount,
      totalWeight,
      isValid,
    };
  }

  /**
   * 验证变形器节点
   */
  protected validateInput (input: DeformerParserInput): void {
    super.validateInput(input);

    if (!input.deformerNode) {
      throw new Error('变形器节点不能为空');
    }

    if (input.deformerNode.Type !== 'Deformer') {
      throw new Error(`无效的变形器节点类型: ${input.deformerNode.Type}`);
    }
  }

  /**
   * 获取配置
   */
  public getConfig (): DeformerParserConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig (newConfig: Partial<DeformerParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('更新变形器解析器配置');
  }
}

/**
 * 变形器解析器工厂
 */
export class DeformerParserFactory {
  private defaultConfig: DeformerParserConfig;

  constructor (defaultConfig?: DeformerParserConfig) {
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 创建变形器解析器实例
   */
  create (context: IParsingContext, config?: DeformerParserConfig): DeformerParser {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return new DeformerParser(context, mergedConfig);
  }

  /**
   * 获取默认配置
   */
  public getDefaultConfig (): DeformerParserConfig {
    return { ...this.defaultConfig };
  }
}
