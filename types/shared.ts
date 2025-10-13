/**
 * @file /types/shared.ts
 * @description 共享基础类型定义
 */

/**
 * FBX 属性值节点，封装 flag/type/value 结构
 * @template T 属性值类型
 */
export interface FBXValue<T = any> {
  /** 标志位 */
  flag?: string;
  /** 主类型（如 KString、double、int、ColorRGB 等） */
  type?: string;
  /** 副类型（如 Url、Time、Color 等） */
  type2?: string;
  /** 实际数值 */
  value?: T;
}

/**
 * 所有 FBX 节点的基础接口
 */
export interface FBXNodeBase<T = unknown> {
  /** 节点名称 */
  name: string;
  /** 是否为单一属性节点 */
  singleProperty: boolean;
  /** 属性列表 */
  propertyList?: unknown[];
  /** 可扩展附加字段 */
  extra?: T;
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
  a: number[];
}

/**
 * 用于描述FBX中的时间类型
 */
export interface FBXTimeData {
  a: bigint[]; // FBX时间戳通常是64位整数
}

/**
 * FBX 解析过程中的树节点（用于二进制解析）
 */
export interface FBXTreeNode {
  /** 节点名称 */
  name?: string;
  /** 节点ID */
  id?: number;
  /** 属性名称 */
  attrName?: string;
  /** 属性类型 */
  attrType?: string;
  /** 是否为单一属性节点 */
  singleProperty?: boolean;
  /** 属性列表 */
  propertyList?: unknown[];
  /** 可扩展字段 */
  [key: string]: any;
}