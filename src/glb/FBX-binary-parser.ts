/**
 * FBX 二进制解析器主文件
 */

import type { IFBXTree, IParsingContext } from '../types';
import { FBXTree, BaseParser } from '../types';

// 导入二进制解析模块
import {
  BinaryReader,
  parseNode,
  endOfContent,
  FBX_MAGIC_LENGTH,
  isVersionSupported,
  getVersionErrorMessage,
} from './binary';

/**
 * FBX 二进制解析器
 * 将二进制 ArrayBuffer 解析为 FBXTree
 */
export class BinaryParser extends BaseParser<ArrayBuffer, IFBXTree> {
  /**
   * 解析二进制 FBX 文件
   * @param buffer ArrayBuffer 数据
   * @param context 解析上下文
   * @returns FBXTree
   */
  parse (buffer: ArrayBuffer, context: IParsingContext): IFBXTree {
    const reader = new BinaryReader(buffer);

    reader.skip(FBX_MAGIC_LENGTH); // skip magic bytes

    const version = reader.getUint32();

    if (!isVersionSupported(version)) {
      throw new Error(getVersionErrorMessage(version));
    }

    const allNodes = new FBXTree();

    while (!endOfContent(reader)) {
      const node = parseNode(reader, version);

      if (node !== null && node.name) {
        allNodes.add(node.name, node);
      }
    }

    // 验证返回值是否实现了 IFBXTree 接口
    if (typeof allNodes.add === 'function' && typeof allNodes.getProperty === 'function') {
      return allNodes;
    } else {
      throw new Error('FBXTree does not implement IFBXTree interface');
    }
  }
}
