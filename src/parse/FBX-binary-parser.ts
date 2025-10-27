// Parses binary FBX files.
import * as fflate from 'fflate';
import type {
  FBXConnection,
} from '../constants';
import {
  type IFBXTree,
  FBXTreeFactory,
} from '../constants';
import type { FBXTreeNode, FBXConnectionType } from '../types/core';

// Parse an FBX file in Binary format
export class BinaryParser {
  private factory: FBXTreeFactory;
  private connections: FBXConnection[] = [];

  parse (buffer: ArrayBuffer): IFBXTree {
    this.factory = new FBXTreeFactory();

    this.connections = [];

    const reader = new BinaryReader(buffer);

    reader.skip(23); // skip magic 23 bytes

    const version = reader.getUint32();

    if (version < 6400) {
      throw new Error('THREE.FBXLoader: FBX version not supported, FileVersion: ' + version);
    }

    while (!this.endOfContent(reader)) {
      const node = this.parseNode(reader, version);

      if (node !== null && node.name) {
        this.processNode(node);
      }
    }

    // 添加所有连接关系
    this.connections.forEach(conn => {
      this.factory.addConnection(conn);
    });

    return this.factory.build();
  }

  private processNode (node: FBXTreeNode): void {
    switch (node.name) {
      case 'FBXHeaderExtension':
        this.factory.setHeader(node);

        break;
      case 'GlobalSettings':
        this.factory.setGlobalSettings(node);

        break;
      case 'C':
        // 连接关系
        if (node.propertyList && node.propertyList.length >= 3) {
          this.connections.push({
            ID: node.id || 0,
            from: node.propertyList[1] as number,
            to: node.propertyList[2] as number,
            relationship: node.propertyList[0] as FBXConnectionType,
          });
        }

        break;
      case 'Objects':
        // 处理 Objects 节点 - 这个节点包含所有的 FBX 对象
        // Objects 节点本身不需要添加到 factory，但它的子节点需要
        break;
      default:
        // 添加到 Objects 或其他父节点
        if (node.id !== undefined && node.name) {
          this.factory.addObject(node.name, node.id, node);
        }

        break;
    }
  }

  // Check if reader has reached the end of content.
  endOfContent (reader: BinaryReader) {
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

  // recursively parse nodes until the end of the file is reached
  parseNode (reader: BinaryReader, version: number) {
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

    const propertyList = [];

    for (let i = 0; i < numProperties; i++) {
      propertyList.push(this.parseProperty(reader));
    }

    // Regards the first three elements in propertyList as id, attrName, and attrType
    const id = propertyList.length > 0 ? propertyList[0] : '';
    const attrName = propertyList.length > 1 ? propertyList[1] : '';
    const attrType = propertyList.length > 2 ? propertyList[2] : '';

    // check if this node represents just a single property
    // like (name, 0) set or (name2, [0, 1, 2]) set of {name: 0, name2: [0, 1, 2]}
    node.singleProperty = numProperties === 1 && reader.getOffset() === endOffset ? true : false;

    while (endOffset > reader.getOffset()) {
      const subNode = this.parseNode(reader, version);

      if (subNode !== null) {
        // 将子节点附加到当前节点
        this.parseSubNode(name, node, subNode);

        // 如果子节点不是 Properties70 类型，也需要通过 processNode 处理
        // 这确保所有对象都被添加到 factory 中
        if (subNode.name && subNode.name !== 'Properties70') {
          this.processNode(subNode);
        }
      }
    }

    node.propertyList = propertyList as string[]; // raw property list used by parent

    if (typeof id === 'number') {
      node.id = id;
    }
    if (attrName !== '') {
      node.attrName = attrName as string;
    }
    if (attrType !== '') {
      node.attrType = attrType as string;
    }
    if (name !== '') {
      node.name = name;
    }

    return node;
  }

  parseSubNode (name: string, node: FBXTreeNode, subNode: FBXTreeNode) {
    // special case: child node is single property
    if (subNode.singleProperty === true && subNode.propertyList && subNode.propertyList.length > 0) {
      const value = subNode.propertyList[0];

      if (Array.isArray(value)) {
        node[subNode.name as string] = subNode;

        subNode.a = value;
      } else {
        node[subNode.name as string] = value;
      }
    } else if (name === 'Connections' && subNode.name === 'C') {
      const array: unknown[] = [];
      const propertyDef = subNode.propertyList as [string, number, number | string];

      propertyDef.forEach(property => {
        // first Connection is FBX type (OO, OP, etc.). We'll discard these
        if (propertyDef.indexOf(property) !== 0) {
          array.push(property);
        }
      });

      if ((node as Record<string, unknown>).connections === undefined) {
        (node as Record<string, unknown>).connections = [];
      }

      ((node as Record<string, unknown>).connections as unknown[]).push(array);
    } else if (subNode.name === 'Properties70') {
      const keys = Object.keys(subNode);

      keys.forEach(function (key) {
        (node as Record<string, unknown>)[key] = (subNode as Record<string, unknown>)[key];
      });
    } else if (name === 'Properties70' && subNode.name === 'P') {
      const propertyList = subNode.propertyList as [string, string, string, boolean, number, number, number];
      let innerPropName = propertyList[0];
      let innerPropType1 = propertyList[1];
      const innerPropType2 = propertyList[2];
      const innerPropFlag = propertyList[3];
      let innerPropValue;

      if (innerPropName.indexOf('Lcl ') === 0) {
        innerPropName = innerPropName.replace('Lcl ', 'Lcl_');
      }
      if (innerPropType1.indexOf('Lcl ') === 0) {
        innerPropType1 = innerPropType1.replace('Lcl ', 'Lcl_');
      }

      if (
        innerPropType1 === 'Color'
        || innerPropType1 === 'ColorRGB'
        || innerPropType1 === 'Vector'
        || innerPropType1 === 'Vector3D'
        || innerPropType1.indexOf('Lcl_') === 0
      ) {
        innerPropValue = [
          propertyList[4],
          propertyList[5],
          propertyList[6],
        ];
      } else {
        innerPropValue = propertyList[4];
      }

      // this will be copied to parent, see above
      node[innerPropName] = {
        flag: innerPropFlag,
        type: innerPropType1,
        type2: innerPropType2,
        value: innerPropValue,
      };
    } else if (node[subNode.name as string] === undefined) {
      if (typeof subNode.id === 'number') {
        node[subNode.name as string] = subNode;
      } else {
        node[subNode.name as string] = subNode;
      }
    } else {
      if (subNode.name === 'PoseNode') {
        if (!Array.isArray(node[subNode.name])) {
          node[subNode.name] = [node[subNode.name]];
        }

        ((node as Record<string, unknown>)[subNode.name] as unknown[]).push(subNode);
      } else if (((node as Record<string, unknown>)[subNode.name!] as Record<number, unknown>)[subNode.id as number] === undefined) {
        ((node as Record<string, unknown>)[subNode.name!] as Record<number, unknown>)[subNode.id as number] = subNode;
      }
    }
  }

  parseProperty (reader: BinaryReader) {
    const type = reader.getString(1);
    let length;

    switch (type) {
      case 'C':
        return reader.getBoolean();
      case 'D':
        return reader.getFloat64();
      case 'F':
        return reader.getFloat32();
      case 'I':
        return reader.getInt32();
      case 'L':
        return reader.getInt64();
      case 'R':
        length = reader.getUint32();

        return reader.getArrayBuffer(length);
      case 'S':
        length = reader.getUint32();

        return reader.getString(length);
      case 'Y':
        return reader.getInt16();
      case 'b':
      case 'c':
      case 'd':
      case 'f':
      case 'i':
      case 'l': {
        const arrayLength = reader.getUint32();
        const encoding = reader.getUint32(); // 0: non-compressed, 1: compressed
        const compressedLength = reader.getUint32();

        if (encoding === 0) {
          switch (type) {
            case 'b':
            case 'c':
              return reader.getBooleanArray(arrayLength);
            case 'd':
              return reader.getFloat64Array(arrayLength);
            case 'f':
              return reader.getFloat32Array(arrayLength);
            case 'i':
              return reader.getInt32Array(arrayLength);
            case 'l':
              return reader.getInt64Array(arrayLength);
          }
        }

        const data = fflate.unzlibSync(new Uint8Array(reader.getArrayBuffer(compressedLength)), {});
        const reader2 = new BinaryReader(data.buffer as ArrayBuffer);

        switch (type) {
          case 'b':
          case 'c':
            return reader2.getBooleanArray(arrayLength);
          case 'd':
            return reader2.getFloat64Array(arrayLength);
          case 'f':
            return reader2.getFloat32Array(arrayLength);
          case 'i':
            return reader2.getInt32Array(arrayLength);
          case 'l':
            return reader2.getInt64Array(arrayLength);
        }
      }
      // eslint-disable-next-line no-fallthrough
      default:
        throw new Error('THREE.FBXLoader: Unknown property type ' + type);
    }
  }
}

export class BinaryReader {
  dv: DataView;
  offset: number;
  littleEndian: boolean;
  _textDecoder: TextDecoder;

  constructor (buffer: ArrayBuffer, littleEndian?: boolean) {
    this.dv = new DataView(buffer);
    this.offset = 0;
    this.littleEndian = littleEndian !== undefined ? littleEndian : true;
    this._textDecoder = new TextDecoder();
  }

  getOffset () {
    return this.offset;
  }

  size () {
    return this.dv.buffer.byteLength;
  }

  skip (length: number) {
    this.offset += length;
  }

  // seems like true/false representation depends on exporter.
  // true: 1 or 'Y'(=0x59), false: 0 or 'T'(=0x54)
  // then sees LSB.
  getBoolean () {
    return (this.getUint8() & 1) === 1;
  }

  getBooleanArray (size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getBoolean());
    }

    return a;
  }

  getUint8 () {
    const value = this.dv.getUint8(this.offset);

    this.offset += 1;

    return value;
  }

  getInt16 () {
    const value = this.dv.getInt16(this.offset, this.littleEndian);

    this.offset += 2;

    return value;
  }

  getInt32 () {
    const value = this.dv.getInt32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  getInt32Array (size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getInt32());
    }

    return a;
  }

  getUint32 () {
    const value = this.dv.getUint32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  // JavaScript doesn't support 64-bit integer so calculate this here
  // 1 << 32 will return 1 so using multiply operation instead here.
  // There's a possibility that this method returns wrong value if the value
  // is out of the range between Number.MAX_SAFE_INTEGER and Number.MIN_SAFE_INTEGER.
  // TODO: safely handle 64-bit integer
  getInt64 () {
    let low, high;

    if (this.littleEndian) {
      low = this.getUint32();
      high = this.getUint32();
    } else {
      high = this.getUint32();
      low = this.getUint32();
    }

    // calculate negative value
    if (high & 0x80000000) {
      high = ~high & 0xffffffff;
      low = ~low & 0xffffffff;

      if (low === 0xffffffff) {
        high = (high + 1) & 0xffffffff;
      }

      low = (low + 1) & 0xffffffff;

      return -(high * 0x100000000 + low);
    }

    return high * 0x100000000 + low;
  }

  getInt64Array (size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getInt64());
    }

    return a;
  }

  // Note: see getInt64() comment
  getUint64 () {
    let low, high;

    if (this.littleEndian) {
      low = this.getUint32();
      high = this.getUint32();
    } else {
      high = this.getUint32();
      low = this.getUint32();
    }

    return high * 0x100000000 + low;
  }

  getFloat32 () {
    const value = this.dv.getFloat32(this.offset, this.littleEndian);

    this.offset += 4;

    return value;
  }

  getFloat32Array (size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getFloat32());
    }

    return a;
  }

  getFloat64 () {
    const value = this.dv.getFloat64(this.offset, this.littleEndian);

    this.offset += 8;

    return value;
  }

  getFloat64Array (size: number) {
    const a = [];

    for (let i = 0; i < size; i++) {
      a.push(this.getFloat64());
    }

    return a;
  }

  getArrayBuffer (size: number) {
    const value = this.dv.buffer.slice(this.offset, this.offset + size);

    this.offset += size;

    return value;
  }

  getString (size: number) {
    const start = this.offset;
    let a = new Uint8Array(this.dv.buffer, start, size);

    this.skip(size);

    const nullByte = a.indexOf(0);

    if (nullByte >= 0) {
      a = new Uint8Array(this.dv.buffer, start, nullByte);
    }

    return this._textDecoder.decode(a);
  }
}
