/**
 * FBX 节点解析器
 * 负责递归解析 FBX 二进制文件中的节点结构
 */

import type { FBXTreeNode } from '../../types';
import type { BinaryReader } from './binary-reader';
import type { FBXPropertyValue } from './property-parser';
import { parseProperty } from './property-parser';
import { parseSubNode } from './subnode-handler';

/**
 * 检查是否到达内容末尾
 * @param reader 二进制读取器
 * @returns 是否到达末尾
 */
export function endOfContent (reader: BinaryReader): boolean {
  // footer size: 160bytes + 16-byte alignment padding
  // - 16bytes: magic
  // - padding til 16-byte alignment (at least 1byte?)
  // (seems like some exporters embed fixed 15 or 16bytes?)
  // - 4bytes: magic
  // - 4bytes: version
  // - 120bytes: zero
  // - 16bytes: magic
  if (reader.size() % 16 === 0) {
    return ((reader.getOffset() + 160 + 16) & ~0xf) >= reader.size();
  } else {
    return reader.getOffset() + 160 + 16 >= reader.size();
  }
}

/**
 * 递归解析节点
 * @param reader 二进制读取器
 * @param version FBX 版本
 * @returns 解析后的节点
 */
export function parseNode (reader: BinaryReader, version: number): FBXTreeNode | null {
  const node: FBXTreeNode = {};

  // The first three data sizes depends on version.
  const endOffset = version >= 7500 ? reader.getUint64() : reader.getUint32();
  const numProperties = version >= 7500 ? reader.getUint64() : reader.getUint32();

  if (version >= 7500) {
    reader.getUint64();
  } else {
    reader.getUint32();
  }

  const nameLen = reader.getUint8();
  const name = reader.getString(nameLen);

  // Regards this node as NULL-record if endOffset is zero
  if (endOffset === 0) {
    return null;
  }

  const propertyList: FBXPropertyValue[] = [];

  for (let i = 0; i < numProperties; i++) {
    propertyList.push(parseProperty(reader));
  }

  // Regards the first three elements in propertyList as id, attrName, and attrType
  const id = propertyList.length > 0 ? propertyList[0] : '';
  const attrName = propertyList.length > 1 ? propertyList[1] : '';
  const attrType = propertyList.length > 2 ? propertyList[2] : '';

  // check if this node represents just a single property
  // like (name, 0) set or (name2, [0, 1, 2]) set of {name: 0, name2: [0, 1, 2]}
  node.singleProperty = numProperties === 1 && reader.getOffset() === endOffset ? true : false;

  while (endOffset > reader.getOffset()) {
    const subNode = parseNode(reader, version);

    if (subNode !== null) {
      parseSubNode(name, node, subNode);
    }
  }

  // Use Object.defineProperty to set propertyList without type assertion
  Object.defineProperty(node, 'propertyList', {
    value: propertyList,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  if (typeof id === 'number') {
    node.id = id;
  }
  if (attrName !== '') {
    Object.defineProperty(node, 'attrName', {
      value: attrName,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  if (attrType !== '') {
    Object.defineProperty(node, 'attrType', {
      value: attrType,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  if (name !== '') {
    node.name = name;
  }

  return node;
}