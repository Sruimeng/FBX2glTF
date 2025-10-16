/**
 * @file /types/parsers/geometry-parser.ts
 * @description 几何解析器类型定义
 */

import type * as THREE from 'three';
import type { FBXNode, FBXValue, FBXGeometryData, FBXArrayData } from '../core/fbx-types';

/**
 * FBX 几何体节点接口
 */
export interface FBXGeometryNode extends FBXNode {
  /** 几何体类型 */
  Type: 'Geometry';
  /** 版本 */
  Version: number;
  /** 几何体名称 */
  GeometryName?: FBXValue<string>;
  /** 顶点位置 */
  Vertices?: FBXArrayData;
  /** 顶点索引 */
  PolygonVertexIndex?: FBXArrayData;
  /** 边信息 */
  Edges?: FBXArrayData;
  /** 层信息 */
  Layer?: FBXLayerNode;
  /** 几何体属性 */
  GeometryProperties?: Record<string, any>;
}

/**
 * FBX 层节点接口
 */
export interface FBXLayerNode extends FBXNode {
  /** 层类型 */
  Type: 'Layer';
  /** 版本 */
  Version: number;
  /** 层元素 */
  LayerElement?: FBXLayerElementNode[];
  /** 层ID */
  LayerID?: FBXValue<number>;
  /** 层名称 */
  Name?: FBXValue<string>;
}

/**
 * FBX 层元素节点接口
 */
export interface FBXLayerElementNode extends FBXNode {
  /** 层元素类型 */
  Type: string;
  /** 版本 */
  Version: number;
  /** 层元素名称 */
  Name?: FBXValue<string>;
  /** 映射信息类型 */
  MappingInformationType?: FBXValue<string>;
  /** 引用信息类型 */
  ReferenceInformationType?: FBXValue<string>;
  /** 索引数据 */
  Indexes?: FBXArrayData;
  /** 直接数据 */
  Direct?: FBXArrayData;
  /** 顶点位置 */
  Vertices?: FBXArrayData;
  /** 法线 */
  Normals?: FBXArrayData;
  /** UV 坐标 */
  UV?: FBXArrayData;
  /** UV 索引 */
  UVIndex?: FBXArrayData;
  /** 顶点颜色 */
  Colors?: FBXArrayData;
  /** 颜色索引 */
  ColorIndex?: FBXArrayData;
  /** 材质索引 */
  Materials?: FBXArrayData;
  /** 材质索引 */
  MaterialIndex?: FBXArrayData;
  /** 平滑组 */
  Smoothing?: FBXArrayData;
  /** 平滑组索引 */
  SmoothingIndex?: FBXArrayData;
  /** 用户数据 */
  UserData?: FBXArrayData;
  /** 用户数据索引 */
  UserDataIndex?: FBXArrayData;
  /** 可见性 */
  Visibility?: FBXArrayData;
  /** 可见性索引 */
  VisibilityIndex?: FBXArrayData;
}

/**
 * FBX 皮肤权重信息
 */
export interface FBXSkinWeightInfo {
  /** 骨骼索引 */
  boneIndices: number[];
  /** 权重值 */
  weights: number[];
  /** 顶点索引 */
  vertexIndex: number;
}

/**
 * FBX 变形目标信息
 */
export interface FBXMorphTargetInfo {
  /** 变形目标名称 */
  name: string;
  /** 权重 */
  weight?: number;
  /** 顶点位置偏移 */
  vertices?: FBXArrayData;
  /** 法线偏移 */
  normals?: FBXArrayData;
  /** 切线偏移 */
  tangents?: FBXArrayData;
}

/**
 * 几何解析器输入接口
 */
export interface GeometryParserInput {
  /** FBX 几何体节点 */
  geometryNode: FBXGeometryNode;
  /** 节点ID */
  id: number;
  /** 关联的变形器信息 */
  deformerInfo?: FBXDeformerInfo[];
  /** 材质索引映射 */
  materialMapping?: Map<number, number>;
}

/**
 * 几何解析器输出接口
 */
export interface GeometryParserOutput {
  /** Three.js 缓冲几何体 */
  geometry: THREE.BufferGeometry;
  /** 几何体名称 */
  name: string;
  /** 几何体属性 */
  attributes: GeometryAttributes;
  /** 变形目标 */
  morphTargets?: THREE.MorphTarget[];
  /** 皮肤信息 */
  skinInfo?: SkinInfo;
  /** 几何体统计信息 */
  stats: GeometryStats;
}

/**
 * 几何体属性接口
 */
export interface GeometryAttributes {
  /** 顶点位置 */
  position?: THREE.BufferAttribute;
  /** 顶点索引 */
  index?: THREE.BufferAttribute;
  /** 法线 */
  normal?: THREE.BufferAttribute;
  /** UV 坐标 */
  uv?: THREE.BufferAttribute;
  /** UV2 坐标 */
  uv2?: THREE.BufferAttribute;
  /** 顶点颜色 */
  color?: THREE.BufferAttribute;
  /** 切线 */
  tangent?: THREE.BufferAttribute;
  /** 皮肤权重 */
  skinWeight?: THREE.BufferAttribute;
  /** 皮肤索引 */
  skinIndex?: THREE.BufferAttribute;
}

/**
 * 皮肤信息接口
 */
export interface SkinInfo {
  /** 骨骼数量 */
  boneCount: number;
  /** 每个顶点影响的最大骨骼数 */
  maxBonesPerVertex: number;
  /** 皮肤权重映射 */
  weightMap: Map<number, FBXSkinWeightInfo[]>;
  /** 骨骼索引映射 */
  boneIndexMap: Map<number, number>;
}

/**
 * 几何体统计信息接口
 */
export interface GeometryStats {
  /** 顶点数量 */
  vertexCount: number;
  /** 面数量 */
  faceCount: number;
  /** 三角形数量 */
  triangleCount: number;
  /** 属性数量 */
  attributeCount: number;
  /** 变形目标数量 */
  morphTargetCount: number;
  /** 骨骼数量 */
  boneCount: number;
}

/**
 * 几何体元数据
 */
export interface GeometryMetadata {
  /** 几何体名称 */
  name: string;
  /** 几何体类型 */
  type: string;
  /** 是否为网格几何体 */
  isMesh: boolean;
  /** 是否为蒙皮几何体 */
  isSkinned: boolean;
  /** 是否有变形目标 */
  hasMorphTargets: boolean;
  /** 是否有顶点颜色 */
  hasVertexColors: boolean;
  /** 是否有UV坐标 */
  hasUV: boolean;
  /** 是否有法线 */
  hasNormals: boolean;
}

/**
 * 几何解析器配置
 */
export interface GeometryParserConfig {
  /** 是否生成法线 */
  generateNormals?: boolean;
  /** 是否生成切线 */
  generateTangents?: boolean;
  /** 是否使用索引 */
  useIndex?: boolean;
  /** 顶点合并容差 */
  vertexTolerance?: number;
  /** 法线平滑角度 */
  normalSmoothingAngle?: number;
  /** 是否优化几何体 */
  optimizeGeometry?: boolean;
  /** 最大骨骼影响数 */
  maxBonesPerVertex?: number;
  /** 权重阈值 */
  weightThreshold?: number;
  /** 是否支持变形目标 */
  enableMorphTargets?: boolean;
}

/**
 * FBX 变形器信息接口 (用于几何解析)
 */
interface FBXDeformerInfo {
  /** 变形器类型 */
  type: 'skin' | 'blendshape' | 'cache';
  /** 索引 */
  indices?: FBXArrayData;
  /** 权重 */
  weights?: FBXArrayData;
  /** 变形目标 */
  blendShapes?: Array<{
    name: string;
    geometry: FBXGeometryData;
  }>;
}