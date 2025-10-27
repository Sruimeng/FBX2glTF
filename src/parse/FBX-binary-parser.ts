/**
 * @file parse/FBX-binary-parser.ts
 * @description FBX二进制格式解析器 - 基于Three.js FBXLoader源码
 */

import type { IFBXTree, FBXTreeNode } from '../types/core/fbx-types';

/**
 * FBX连接类型
 */
export type FBXConnectionType = string;

/**
 * FBX二进制解析器
 */
export class BinaryParser {
  private factory: IFBXTree;
  private connections: Array<Array<number | string>>;

  constructor () {
    this.factory = {} as IFBXTree;
    this.connections = [];
  }

  /**
   * 解析二进制FBX数据
   */
  parse (buffer: ArrayBuffer): IFBXTree {
    const reader = new BinaryReader(buffer);

    reader.skip(23); // 跳过magic 23字节

    const version = reader.getUint32();

    if (version < 6400) {
      throw new Error(`FBX版本不支持，FileVersion: ${version}`);
    }

    const allNodes = new FBXTree();

    while (!this.endOfContent(reader)) {
      const node = this.parseNode(reader, version);

      if (node !== null && node.name) {
        allNodes.add(node.name, node);
        this.processNode(node);
      }
    }

    allNodes.addConnections(this.connections);

    return allNodes.build();
  }

  /**
   * 处理节点
   */
  private processNode = (node: FBXTreeNode): void => {
    switch (node.name) {
      case 'GlobalSettings':
        this.factory.setGlobalSettings?.(node);

        break;
      case 'Documents':
        // 处理文档信息
        break;
      case 'References':
        // 处理引用信息
        break;
      case 'Definitions':
        // 处理定义信息
        break;
      case 'Objects':
        // 对象节点 - 这个节点包含所有的FBX对象
        break;
      case 'Connections':
        // 连接关系
        if (node.propertyList && node.propertyList.length >= 3) {
          this.connections.push([
            node.propertyList[0] as string,
            node.propertyList[1] as number,
            node.propertyList[2] as number,
          ]);
        }

        break;
      default:
        // 添加到Objects或其他父节点
        if (node.id !== undefined && node.name) {
          this.factory.addObject?.(node.name, String(node.id), node);
        }

        break;
    }
  };

  /**
   * 检查是否到达内容末尾
   */
  endOfContent (reader: BinaryReader): boolean {
    // footer size: 160bytes + 16-byte alignment padding
    if (reader.size() % 16 === 0) {
      return ((reader.getOffset() + 160 + 16) & ~0xf) >= reader.size();
    } else {
      return reader.getOffset() + 160 + 16 >= reader.size();
    }
  }

  /**
   * 递归解析节点直到文件末尾
   */
  parseNode (reader: BinaryReader, version: number): FBXTreeNode | null {
    const node: Partial<FBXTreeNode> = {};

    // 前三个数据大小依赖于版本
    const endOffset = (version >= 7500) ? reader.getUint64() : reader.getUint32();
    const numProperties = (version >= 7500) ? reader.getUint64() : reader.getUint32();

    (version >= 7500) ? reader.getUint64() : reader.getUint32(); // propertyListLen未使用

    const nameLen = reader.getUint8();
    const name = reader.getString(nameLen);

    // 如果endOffset为零，将此节点视为NULL记录
    if (endOffset === 0) {return null;}

    const propertyList: unknown[] = [];

    for (let i = 0; i < numProperties; i++) {
      propertyList.push(this.parseProperty(reader));
    }

    // 将propertyList中的前三个元素视为id、attrName和attrType
    const id = propertyList.length > 0 ? propertyList[0] : '';
    const attrName = propertyList.length > 1 ? propertyList[1] : '';
    const attrType = propertyList.length > 2 ? propertyList[2] : '';

    // 如果endOffset为零，则将此节点视为单属性
    node.singleProperty = (numProperties === 1 && reader.getOffset() === endOffset) ? true : false;

    while (endOffset > reader.getOffset()) {
      const subNode = this.parseNode(reader, version);

      if (subNode !== null) {
        this.parseSubNode(name, node as FBXTreeNode, subNode);
      }
    }

    node.propertyList = propertyList; // 原始属性列表，供父节点使用

    if (typeof id === 'number') {node.id = id;}
    if (attrName !== '') {node.attrName = attrName as string;}
    if (attrType !== '') {node.attrType = attrType as string;}
    if (name !== '') {node.name = name;}

    return node as FBXTreeNode;
  }

  /**
   * 解析子节点
   */
  parseSubNode (name: string, node: FBXTreeNode, subNode: FBXTreeNode): void {
    // 特殊情况：子节点是单属性
    if (subNode.singleProperty === true) {
      const value = subNode.propertyList?.[0];

      if (Array.isArray(value)) {
        (node as any)[subNode.name || ''] = subNode;
        (subNode as any).a = value;
      } else {
        (node as any)[subNode.name || ''] = value;
      }
    } else if (name === 'Connections' && subNode.name === 'C') {
      const array: (number | string)[] = [];

      subNode.propertyList?.forEach((property: unknown, i: number) => {
        // 第一个连接是FBX类型（OO、OP等），我们将丢弃这些
        if (i !== 0) {array.push(property as number | string);}
      });

      if (!(node as any).connections) {
        (node as any).connections = [];
      }

      (node as any).connections.push(array);
    } else if (subNode.name === 'Properties70') {
      const keys = Object.keys(subNode);

      keys.forEach((key: string) => {
        (node as any)[key] = (subNode as any)[key];
      });
    } else if (name === 'Properties70' && subNode.name === 'P') {
      let innerPropName = subNode.propertyList?.[0] as string;
      let innerPropType1 = subNode.propertyList?.[1] as string;
      const innerPropType2 = subNode.propertyList?.[2] as string;
      const innerPropFlag = subNode.propertyList?.[3] as string;
      let innerPropValue: unknown;

      if (innerPropName?.indexOf('Lcl ') === 0) {
        innerPropName = innerPropName.replace('Lcl ', 'Lcl_');
      }
      if (innerPropType1?.indexOf('Lcl ') === 0) {
        innerPropType1 = innerPropType1.replace('Lcl ', 'Lcl_');
      }

      if (innerPropType1 === 'Color' || innerPropType1 === 'ColorRGB' ||
          innerPropType1 === 'Vector' || innerPropType1 === 'Vector3D' ||
          innerPropType1?.indexOf('Lcl_') === 0) {
        innerPropValue = [
          subNode.propertyList?.[4],
          subNode.propertyList?.[5],
          subNode.propertyList?.[6],
        ];
      } else {
        innerPropValue = subNode.propertyList?.[4];
      }

      // 这将被复制到父节点，见上文
      (node as any)[innerPropName || ''] = {
        type: innerPropType1,
        type2: innerPropType2,
        flag: innerPropFlag,
        value: innerPropValue,
      };
    } else if (!(node as any)[subNode.name || '']) {
      if (typeof subNode.id === 'number') {
        (node as any)[subNode.name || ''] = {};
        (node as any)[subNode.name || ''][subNode.id] = subNode;
      } else {
        (node as any)[subNode.name || ''] = subNode;
      }
    } else {
      // 处理多个同名节点
      if (Array.isArray((node as any)[subNode.name || ''])) {
        (node as any)[subNode.name || ''].push(subNode);
      } else {
        (node as any)[subNode.name || ''] = [(node as any)[subNode.name || ''], subNode];
      }
    }
  }

  /**
   * 解析属性
   */
  parseProperty (reader: BinaryReader): string | number | boolean | number[] | ArrayBuffer | boolean[] | null {
    const type = reader.getUint8();

    switch (type) {
      case 0x0:
        // 空属性
        return null;
      case 0x1: {
        // 字符串
        const strLen = reader.getUint32();

        return reader.getString(strLen);
      }
      case 0x2:
        // 16位整数
        return reader.getInt16();
      case 0x3:
        // 布尔值
        return reader.getBoolean();
      case 0x4:
        // 32位整数
        return reader.getInt32();
      case 0x5:
        // 64位整数
        return reader.getInt64();
      case 0x6:
        // 32位浮点数
        return reader.getFloat32();
      case 0x7:
        // 64位浮点数
        return reader.getFloat64();
      case 0x8: {
        // 二进制数据
        const binLen = reader.getUint32();

        return reader.getArrayBuffer(binLen);
      }
      case 0x9: {
        // 16位整数数组
        const int16Len = reader.getUint32();

        return reader.getInt16Array(int16Len);
      }
      case 0xA: {
        // 32位整数数组
        const int32Len = reader.getUint32();

        return reader.getInt32Array(int32Len);
      }
      case 0xB: {
        // 64位整数数组
        const int64Len = reader.getUint32();

        return reader.getInt64Array(int64Len);
      }
      case 0xC: {
        // 32位浮点数数组
        const float32Len = reader.getUint32();

        return reader.getFloat32Array(float32Len);
      }
      case 0xD: {
        // 64位浮点数数组
        const float64Len = reader.getUint32();

        return reader.getFloat64Array(float64Len);
      }
      case 0xE: {
        // 布尔数组
        const boolLen = reader.getUint32();

        return reader.getBooleanArray(boolLen);
      }
      case 0x10:
        // 8位整数
        return reader.getInt8();
      default:
        throw new Error(`未知的属性类型: 0x${type.toString(16)}`);
    }
  }
}

/**
 * FBX二进制数据读取器
 */
export class BinaryReader {
  public dv: DataView;
  public offset: number;
  public littleEndian: boolean;
  private _textDecoder: TextDecoder;

  constructor (buffer: ArrayBuffer, littleEndian: boolean = true) {
    this.dv = new DataView(buffer);
    this.offset = 0;
    this.littleEndian = littleEndian;
    this._textDecoder = new TextDecoder();
  }

  getOffset (): number {
    return this.offset;
  }

  size (): number {
    return this.dv.buffer.byteLength;
  }

  skip (length: number): void {
    this.offset += length;
  }

  // 布尔值表示似乎依赖于导出器
  // true: 1 或 'Y'(=0x59), false: 0 或 'T'(=0x54)
  getBoolean (): boolean {
    return (this.getUint8() & 1) === 1;
  }

  getBooleanArray (size: number): boolean[] {
    const a: boolean[] = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getBoolean());
    }

    return a;
  }

  getUint8 (): number {
    return this.dv.getUint8(this.offset++);
  }

  getInt8 (): number {
    const value = this.dv.getInt8(this.offset);

    this.offset += 1;

    return value;
  }

  getInt16 (): number {
    const value = this.dv.getInt16(this.offset, this.littleEndian);

    this.offset += 2;

    return value;
  }

  getInt16Array (size: number): number[] {
    const a: number[] = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getInt16());
    }

    return a;
  }

  getInt32 (): number {
    const value = this.dv.getInt32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  getInt32Array (size: number): number[] {
    const a: number[] = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getInt32());
    }

    return a;
  }

  getUint32 (): number {
    const value = this.dv.getUint32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  getInt64 (): number {
    const value = this.dv.getBigInt64(this.offset, this.littleEndian);

    this.offset += 8;

    return Number(value);
  }

  getInt64Array (size: number): number[] {
    const a: number[] = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getInt64());
    }

    return a;
  }

  getUint64 (): number {
    const value = this.dv.getBigUint64(this.offset, this.littleEndian);

    this.offset += 8;

    return Number(value);
  }

  getFloat32 (): number {
    const value = this.dv.getFloat32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  getFloat32Array (size: number): number[] {
    const a: number[] = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getFloat32());
    }

    return a;
  }

  getFloat64 (): number {
    const value = this.dv.getFloat64(this.offset, this.littleEndian);

    this.offset += 8;

    return value;
  }

  getFloat64Array (size: number): number[] {
    const a: number[] = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getFloat64());
    }

    return a;
  }

  getArrayBuffer (size: number): ArrayBuffer {
    const temp = new Uint8Array(this.dv.buffer, this.dv.byteOffset + this.offset, size);
    const value = temp.buffer.slice(temp.byteOffset, temp.byteOffset + temp.byteLength);

    this.offset += size;

    return value;
  }

  getString (size: number): string {
    const bytes = new Uint8Array(this.dv.buffer, this.offset, size);
    const string = this._textDecoder.decode(bytes);

    this.offset += size;

    return string;
  }
}

/**
 * 简单的FBX树实现
 */
class FBXTree {
  private tree: Partial<IFBXTree> = {};
  private connections: Array<Array<number | string>> = [];

  add (key: string, val: any): void {
    (this.tree as any)[key] = val;
  }

  addConnections (connections: Array<Array<number | string>>): void {
    this.connections = connections;
  }

  build (): IFBXTree {
    return {
      objects: this.tree.Objects || {},
      connections: this.tree.connections || { C: this.connections.map(conn => [conn[1], conn[2], conn[0]] as [number, number, string]) },
      settings: this.tree.settings || {},
      time: this.tree.time || {},
      version: this.tree.version,
      root: this.tree.root,
      Objects: this.tree.Objects || {},
    };
  }
}