/**
 * FBX 属性解析器
 * 负责解析 FBX 二进制文件中的各种属性类型
 */

import * as fflate from 'fflate';
import { BinaryReader } from './binary-reader';

/**
 * FBX 属性值类型联合
 */
export type FBXPropertyValue = 
  | boolean 
  | number 
  | string 
  | ArrayBuffer 
  | boolean[] 
  | number[] 
  | Float32Array 
  | Float64Array 
  | Int32Array 
  | BigInt64Array;

/**
 * 解析属性
 * @param reader 二进制读取器
 * @returns 解析后的属性值
 */
export function parseProperty (reader: BinaryReader): FBXPropertyValue {
  const type = reader.getString(1);
  let length: number;

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
      const reader2 = new BinaryReader(data.buffer);

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