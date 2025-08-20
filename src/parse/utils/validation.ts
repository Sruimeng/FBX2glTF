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
