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
  // 不允许动态类型，只允许具体属性
  userData?: Record<string, string | number | boolean | string[] | number[] | object>,
  attrValues?: Record<string, string | number | boolean | string[] | number[] | object>,
}

// 为 TextNodeWithIndex 添加辅助方法
export interface TextNodeWithMethods extends TextNodeWithIndex {
  setAttribute (key: string, value: string | number | boolean | string[] | number[] | object): void,
  getAttribute (key: string): string | number | boolean | string[] | number[] | object | undefined,
  hasAttribute (key: string): boolean,
}