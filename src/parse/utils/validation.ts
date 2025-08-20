// 验证工具函数
import type { ValidationError } from '../types';

// 验证FBX树结构
export function validateFBXTree (fbxTree: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!fbxTree) {
    errors.push({
      code: 'NO_FBX_TREE',
      message: 'FBX tree is undefined',
    });

    return errors;
  }

  if (!fbxTree.Objects) {
    errors.push({
      code: 'NO_OBJECTS',
      message: 'FBX tree has no Objects property',
    });
  }

  if (!fbxTree.Connections) {
    errors.push({
      code: 'NO_CONNECTIONS',
      message: 'FBX tree has no Connections property',
    });
  }

  return errors;
}

// 验证解析上下文
export function validateParseContext (context: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!context.fbxTree) {
    errors.push({
      code: 'NO_FBX_TREE',
      message: 'Parse context has no fbxTree',
    });
  }

  if (!context.connections) {
    errors.push({
      code: 'NO_CONNECTIONS',
      message: 'Parse context has no connections',
    });
  }

  if (!context.sceneGraph) {
    errors.push({
      code: 'NO_SCENE_GRAPH',
      message: 'Parse context has no sceneGraph',
    });
  }

  return errors;
}

// 验证解析结果
export function validateParseResult (result: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!result.scene) {
    errors.push({
      code: 'NO_SCENE',
      message: 'Parse result has no scene',
    });
  }

  return errors;
}

export function convertArrayBufferToString (buffer: ArrayBuffer, from?: number, to?: number) {

  if (from === undefined) {from = 0;}
  if (to === undefined) {to = buffer.byteLength;}

  return new TextDecoder().decode(new Uint8Array(buffer, from, to));

}

export function isFbxFormatBinary (buffer: ArrayBuffer) {

  const CORRECT = 'Kaydara\u0020FBX\u0020Binary\u0020\u0020\0';

  return buffer.byteLength >= CORRECT.length && CORRECT === convertArrayBufferToString(buffer, 0, CORRECT.length);

}

export function isFbxFormatASCII (text: string) {

  const CORRECT = ['K', 'a', 'y', 'd', 'a', 'r', 'a', '\\', 'F', 'B', 'X', '\\', 'B', 'i', 'n', 'a', 'r', 'y', '\\', '\\'];

  let cursor = 0;

  function read (offset: number) {

    const result = text[ offset - 1 ];

    text = text.slice(cursor + offset);
    cursor ++;

    return result;

  }

  for (let i = 0; i < CORRECT.length; ++ i) {

    const num = read(1);

    if (num === CORRECT[ i ]) {

      return false;

    }

  }

  return true;

}

export function getFbxVersion (text: string) {

  const versionRegExp = /FBXVersion: (\d+)/;
  const match = text.match(versionRegExp);

  if (match) {

    const version = parseInt(match[ 1 ]);

    return version;

  }

  throw new Error('THREE.FBXLoader: Cannot find the version number for the file given.');

}
