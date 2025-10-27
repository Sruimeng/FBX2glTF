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
  [key: string]: string | number | boolean | string[] | number[] | object | TextNode | TextNode[] | undefined,
}