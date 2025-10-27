/**
 * @file /types/parsers/deformer-parser.ts
 * @description 变形器解析器类型定义
 */

import type * as THREE from 'three';
import type { FBXNode, FBXValue, FBXArrayData } from '../core/fbx-types';

/**
 * FBX 变形器节点接口
 */
export interface FBXDeformerNode extends FBXNode {
  /** 变形器类型 */
  Type: 'Deformer',
  /** 版本 */
  Version: number,
  /** 变形器名称 */
  DeformerName?: FBXValue<string>,
  /** 变形器类型 */
  SubType?: FBXValue<string>,
  /** 索引 */
  Indexes?: FBXArrayData,
  /** 权重 */
  Weights?: FBXArrayData,
  /** 变形方法 */
  Method?: FBXValue<string>,
  /** 变形精度 */
  Precision?: FBXValue<number>,
}

/**
 * FBX 集群节点接口
 */
export interface FBXClusterNode extends FBXNode {
  /** 集群类型 */
  Type: 'Cluster',
  /** 版本 */
  Version: number,
  /** 集群名称 */
  Name?: FBXValue<string>,
  /** 骨骼索引 */
  Indices?: FBXArrayData,
  /** 权重 */
  Weights?: FBXArrayData,
  /** 变换矩阵 */
  Transform?: FBXArrayData,
  /** 变换链接矩阵 */
  TransformLink?: FBXArrayData,
  /** 父集群索引 */
  ParentIndex?: FBXValue<number>,
}

/**
 * FBX 皮肤节点接口
 */
export interface FBXSkinNode extends FBXNode {
  /** 皮肤类型 */
  Type: 'Skin',
  /** 版本 */
  Version: number,
  /** 皮肤名称 */
  SkinName?: FBXValue<string>,
  /** 骨骼数量 */
  BoneCount?: FBXValue<number>,
  /** 变形精度 */
  DeformPrecision?: FBXValue<number>,
  /** 变形方法 */
  DeformMethod?: FBXValue<string>,
}

/**
 * FBX 混合形状节点接口
 */
export interface FBXBlendShapeNode extends FBXNode {
  /** 混合形状类型 */
  Type: 'BlendShape',
  /** 版本 */
  Version: number,
  /** 混合形状名称 */
  BlendShapeName?: FBXValue<string>,
  /** 混合形状通道 */
  BlendShapeChannels?: FBXBlendShapeChannelNode[],
}

/**
 * FBX 混合形状通道节点接口
 */
export interface FBXBlendShapeChannelNode extends FBXNode {
  /** 通道类型 */
  Type: 'BlendShapeChannel',
  /** 版本 */
  Version: number,
  /** 通道名称 */
  ChannelName?: FBXValue<string>,
  /** 完整形状 */
  FullWeights?: FBXArrayData,
  /** 目标几何体ID */
  TargetShapeId?: FBXValue<number>,
  /** 混合形状权重 */
  DefaultWeights?: FBXArrayData,
}

/**
 * 变形器解析器输入接口
 */
export interface DeformerParserInput {
  /** FBX 变形器节点 */
  deformerNode: FBXDeformerNode,
  /** 节点ID */
  id: number,
  /** 子变形器节点 */
  childDeformers?: FBXDeformerNode[],
  /** 关联的几何体ID */
  geometryId?: number,
  /** 关联的骨骼节点 */
  boneNodes?: Map<number, THREE.Bone>,
}

/**
 * 变形器解析器输出接口
 */
export interface DeformerParserOutput {
  /** 变形器数据 */
  deformerData: DeformerData,
  /** 变形器元数据 */
  metadata: DeformerMetadata,
}

/**
 * 皮肤数据接口
 */
export interface SkinData {
  /** 骨骼数组 */
  bones: THREE.Bone[],
  /** 骨骼逆矩阵 */
  boneInverses: THREE.Matrix4[],
  /** 骨骼矩阵 */
  bindMatrix?: THREE.Matrix4,
  /** 骨骼矩阵世界 */
  bindMatrixWorld?: THREE.Matrix4,
  /** 皮肤权重 */
  skinWeights?: SkinWeightData[],
}

/**
 * 皮肤权重数据接口
 */
export interface SkinWeightData {
  /** 顶点索引 */
  vertexIndex: number,
  /** 骨骼索引数组 */
  boneIndices: number[],
  /** 权重数组 */
  weights: number[],
}

/**
 * 混合形状数据接口
 */
export interface BlendShapeData {
  /** 混合形状名称 */
  name: string,
  /** 混合形状通道 */
  channels: BlendShapeChannelData[],
  /** 影响的几何体ID */
  targetGeometryId?: number,
}

/**
 * 混合形状通道数据接口
 */
export interface BlendShapeChannelData {
  /** 通道名称 */
  name: string,
  /** 目标几何体 */
  targetGeometry?: THREE.BufferGeometry,
  /** 权重 */
  weight: number,
  /** 完整权重 */
  fullWeights?: number[],
  /** 默认权重 */
  defaultWeights?: number[],
}

/**
 * 变形器数据联合类型
 */
export type DeformerData = SkinData | BlendShapeData | CacheDeformerData;

/**
 * 缓存变形器数据接口
 */
export interface CacheDeformerData {
  /** 缓存类型 */
  type: 'cache',
  /** 缓存数据 */
  cacheData: Float32Array,
  /** 缓存时间 */
  cacheTime: number,
  /** 缓存精度 */
  precision: number,
}

/**
 * 变形器元数据接口
 */
export interface DeformerMetadata {
  /** 变形器名称 */
  name: string,
  /** 变形器类型 */
  type: 'skin' | 'blendshape' | 'cache',
  /** 影响的顶点数量 */
  vertexCount: number,
  /** 权重总和 */
  totalWeight: number,
  /** 是否有效 */
  isValid: boolean,
}

/**
 * 变形器解析器配置
 */
export interface DeformerParserConfig {
  /** 最大骨骼影响数 */
  maxBonesPerVertex?: number,
  /** 权重阈值 */
  weightThreshold?: number,
  /** 是否归一化权重 */
  normalizeWeights?: boolean,
  /** 是否优化皮肤权重 */
  optimizeSkinWeights?: boolean,
  /** 混合形状精度 */
  blendShapePrecision?: number,
  /** 是否启用混合形状缓存 */
  enableBlendShapeCache?: boolean,
}
