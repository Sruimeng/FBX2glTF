/**
 * @file /types/core/fbx-types.ts
 * @description 核心 FBX 类型定义
 */

/**
 * FBX 属性值节点，封装 flag/type/value 结构
 * @template T 属性值类型
 */
export interface FBXValue<T = unknown> {
  /** 标志位 */
  flag?: string,
  /** 主类型（如 KString、double、int、ColorRGB 等） */
  type?: string,
  /** 副类型（如 Url、Time、Color 等） */
  type2?: string,
  /** 实际数值 */
  value?: T,
  /** 数组数据（用于某些特殊情况） */
  a?: T extends (infer R)[] ? R[] : T,
  /** 兼容性访问器 */
  [key: string]: unknown,
}

/**
 * 所有 FBX 节点的基础接口
 */
export interface FBXNodeBase<T = unknown> {
  /** 节点名称 */
  name: string,
  /** 是否为单一属性节点 */
  singleProperty: boolean,
  /** 属性列表 */
  propertyList?: unknown[],
  /** 可扩展附加字段 */
  extra?: T,
}

/**
 * 泛型化的 FBX 节点类型
 * @template T 节点具体结构
 */
export type FBXNode<T extends object = {}> = FBXNodeBase<T>;

/**
 * 用于描述顶点、索引、法线等大数据数组的结构
 */
export interface FBXArrayData {
  a: number[],
}

/**
 * 用于描述FBX中的时间类型
 */
export interface FBXTimeData {
  a: bigint[], // FBX时间戳通常是64位整数
}

/**
 * FBX 解析过程中的树节点（用于二进制解析）
 */
export interface FBXTreeNode {
  /** 节点名称 */
  name?: string,
  /** 节点ID */
  id?: number,
  /** 属性名称 */
  attrName?: string,
  /** 属性类型 */
  attrType?: string,
  /** 是否为单一属性节点 */
  singleProperty?: boolean,
  /** 属性列表 */
  propertyList?: unknown[],
  /** 可扩展字段 */
  [key: string]: unknown,
}

/**
 * FBX 节点基础信息
 */
export interface BaseInfo {
  id: number,
  name: string,
  type?: string,
  polygons?: number,
  quads?: number,
  triangles?: number,
  vertices?: number,
}

/**
 * FBX 树结构接口
 */
export interface IFBXTree {
  /** 对象集合 */
  objects?: Record<string, unknown>,
  /** 连接信息 */
  connections?: {
    C: Array<[number, number, string]>,
  } | Record<string, unknown>,
  /** 全局设置 */
  settings?: Record<string, unknown>,
  /** 时间轴信息 */
  time?: Record<string, unknown>,
  /** 版本信息 */
  version?: number,
  /** 根节点 */
  root?: FBXTreeNode,
  /** FBX对象集合（与objects类似，但用于解析器） */
  Objects?: Record<string, Record<string, unknown>>,
  /** 设置全局设置的方法 */
  setGlobalSettings?(node: FBXTreeNode): void,
  /** 添加对象的方法 */
  addObject?(name: string, id: string, node: FBXTreeNode): void,
}

/**
 * FBX 连接节点
 */
export interface FBXConnectionNode {
  children: Array<{ ID: number, relationship?: string }>,
  parents: Array<{ ID: number, relationship?: string }>,
}

/**
 * FBX 材质属性接口
 */
export interface FBXMaterialProperties {
  /** 漫反射颜色 */
  DiffuseColor?: FBXValue<number[]> | { r: number, g: number, b: number },
  /** 高光颜色 */
  SpecularColor?: FBXValue<number[]> | { r: number, g: number, b: number },
  /** 高光强度 */
  Shininess?: FBXValue<number> | number,
  /** 自发光颜色 */
  EmissiveColor?: FBXValue<number[]> | { r: number, g: number, b: number },
  /** 透明度 */
  Transparency?: FBXValue<number> | number,
  /** 反射度 */
  Reflectivity?: FBXValue<number> | number,
  /** 粗糙度 */
  Roughness?: FBXValue<number> | number,
  /** 金属度 */
  Metallic?: FBXValue<number> | number,
}

/**
 * FBX 几何体数据接口
 */
export interface FBXGeometryData {
  /** 顶点位置 */
  vertices?: FBXArrayData,
  /** 顶点索引 */
  indices?: FBXArrayData,
  /** 法线 */
  normals?: FBXArrayData,
  /** UV 坐标 */
  uvs?: FBXArrayData,
  /** 顶点颜色 */
  colors?: FBXArrayData,
  /** 皮肤权重 */
  skinWeights?: FBXArrayData,
  /** 变形目标 */
  morphTargets?: Array<{
    name: string,
    vertices?: FBXArrayData,
    normals?: FBXArrayData,
  }>,
}

/**
 * FBX 动画关键帧
 */
export interface FBXKeyframe {
  /** 时间 */
  time: number,
  /** 值 */
  value: number | number[],
  /** 切线类型 */
  tangentType?: string,
  /** 切线输入 */
  tangentIn?: number | number[],
  /** 切线输出 */
  tangentOut?: number | number[],
}

/**
 * FBX 动画曲线
 */
export interface FBXAnimationCurve {
  /** 关键帧列表 */
  keys: FBXKeyframe[],
  /** 插值类型 */
  interpolationType?: string,
  /** 曲线类型 */
  curveType?: 'position' | 'rotation' | 'scale' | 'other',
}

/**
 * FBX 纹理信息
 */
export interface FBXTextureInfo {
  /** 文件路径 */
  filename?: string,
  /** 相对路径 */
  relativeFilename?: string,
  /** 纹理类型 */
  type?: string,
  /** 纹理坐标 */
  uvSet?: string,
  /** 纹理变换 */
  transform?: {
    translation: number[],
    rotation: number,
    scaling: number[],
  },
}

/**
 * FBX 变形器信息
 */
export interface FBXDeformerInfo {
  /** 变形器类型 */
  type: 'skin' | 'blendshape' | 'cache',
  /** 索引 */
  indices?: FBXArrayData,
  /** 权重 */
  weights?: FBXArrayData,
  /** 变形目标 */
  blendShapes?: Array<{
    name: string,
    geometry: FBXGeometryData,
  }>,
}

/**
 * FBX 解析上下文
 */
export interface ParseContext {
  connections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree,
  [key: string]: any,
}

/**
 * 模型加载结果
 */
export interface ModelLoaderResult {
  scene: any,
  animations: any[],
  modelInfo: any,
}

/**
 * 加载器选项
 */
export interface LoaderOptions {
  [key: string]: any,
}

/**
 * FBX 连接节点（增强版，支持relationship）
 */
export interface FBXConnectionNodeEnhanced {
  children: Array<{ ID: number, relationship?: string }>,
  parents: Array<{ ID: number, relationship?: string }>,
}

/**
 * FBX 轻节点属性
 */
export interface FBXLightNodeAttribute {
  [key: string]: any,
}

/**
 * FBX 视频节点
 */
export interface FBXVideoNode {
  [key: string]: any,
}

/**
 * FBX 相机节点属性
 */
export interface FBXCameraNodeAttribute {
  [key: string]: any,
}

/**
 * FBX 模型节点
 */
export interface FBXModelNode {
  /** 节点名称 */
  attrName?: string,
  /** 节点类型 */
  attrType?: string,
  /** 变换信息 */
  properties?: {
    Lcl_Translation?: FBXValue<number[]>,
    Lcl_Rotation?: FBXValue<number[]>,
    Lcl_Scaling?: FBXValue<number[]>,
  },
  /** 子节点 */
  children?: FBXModelNode[],
  /** 其他属性 */
  [key: string]: any,
}

/**
 * FBX 连接类型
 */
export type FBXConnectionType = string;
