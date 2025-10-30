/**
 * FBX 文本解析相关类型
 */

export interface TextNode {
  name: string,
  id?: number,
  type?: string,
  properties: (string | number)[],
  children: TextNode[],
  attrName?: string,
  attrType?: string,
  PoseNode?: TextNode[],
  a?: string | number | boolean | string[] | number[] | object,
}

export interface TextNodeWithIndex extends TextNode {
  // 动态属性（特殊允许）- 用于FBX解析的动态节点属性
  [key: string]: string | number | boolean | string[] | number[] | object | TextNodeWithIndex | TextNodeWithIndex[] | undefined,
  userData?: Record<string, string | number | boolean | string[] | number[] | object>,
  attrValues?: Record<string, string | number | boolean | string[] | number[] | object>,
}

// 为 TextNodeWithIndex 添加辅助方法
export interface TextNodeWithMethods extends TextNodeWithIndex {
  setAttribute (key: string, value: string | number | boolean | string[] | number[] | object): void,
  getAttribute (key: string): string | number | boolean | string[] | number[] | object | undefined,
  hasAttribute (key: string): boolean,
}

// 新增类型定义
export type PropertyArray = string | number[] | number | string[] | TextNodeWithIndex;

export interface NodeAttributeValue {
  flag?: string,
  type?: string,
  type2?: string,
  value?: string | number | number[],
}

export interface ConnectionArray {
  from: number,
  to: number,
  properties?: string[],
}

export interface SpecialPropertyValue {
  flag: string,
  type: string,
  type2: string,
  value: string | number | number[],
}
