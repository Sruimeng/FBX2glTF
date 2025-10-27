import { ZodError } from 'zod';
import type { z } from 'zod';
import { FBXTreeSchema, FBXNodeSchema, FBXValueSchema, FBXConnectionNodeSchema } from '../schemas/fbx-schemas';

/**
 * FBX解析错误类
 */
export class FBXValidationError extends Error {
  override cause?: ZodError;
  
  constructor(
    message: string,
    public code: string,
    public path?: string,
  ) {
    super(message);
    this.name = 'FBXValidationError';
  }
}

/**
 * 安全的FBX数据验证包装器
 */
export class FBXValidator {
  /**
   * 验证FBX树结构
   */
  static validateFBXTree(data: unknown): any {
    try {
      return FBXTreeSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new FBXValidationError(
          'Invalid FBX tree structure',
          'INVALID_TREE',
          undefined
        );
        if (error instanceof ZodError) {
          (this as any).cause = error;
        }
      }
      throw error;
    }
  }

  /**
   * 验证FBX节点
   */
  static validateNode(data: unknown): any {
    try {
      return FBXNodeSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new FBXValidationError(
          'Invalid FBX node structure',
          'INVALID_NODE',
          undefined
        );
        if (error instanceof ZodError) {
          (this as any).cause = error;
        }
      }
      throw error;
    }
  }

  /**
   * 验证FBX值
   */
  static validateValue(data: unknown): any {
    try {
      return FBXValueSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new FBXValidationError(
          'Invalid FBX value structure',
          'INVALID_VALUE',
          undefined
        );
        if (error instanceof ZodError) {
          (this as any).cause = error;
        }
      }
      throw error;
    }
  }

  /**
   * 验证连接节点
   */
  static validateConnectionNode(data: unknown): any {
    try {
      return FBXConnectionNodeSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new FBXValidationError(
          'Invalid FBX connection structure',
          'INVALID_CONNECTION',
          undefined
        );
        if (error instanceof ZodError) {
          (this as any).cause = error;
        }
      }
      throw error;
    }
  }

  /**
   * 安全访问对象属性
   */
  static safeProperty<T>(obj: any, path: string, schema?: z.ZodSchema<T>): T | null {
    try {
      const parts = path.split('.');
      let current = obj;
      
      for (const part of parts) {
        if (current === null || current === undefined) {
          return null;
        }
        current = current[part];
      }
      
      if (current === null || current === undefined) {
        return null;
      }
      
      if (schema) {
        return schema.parse(current);
      }
      
      return current;
    } catch (error) {
      console.warn(`Failed to access property ${path}:`, error);
      return null;
    }
  }

  /**
   * 验证数组中的每个元素
   */
  static validateArray<T>(data: unknown[], schema: z.ZodSchema<T>): T[] {
    const results: T[] = [];
    const errors: { index: number; error: string }[] = [];
    
    data.forEach((item, index) => {
      try {
        results.push(schema.parse(item));
      } catch (error) {
        errors.push({ index, error: error instanceof Error ? error.message : String(error) });
      }
    });
    
    if (errors.length > 0) {
      console.warn('Array validation had errors:', errors);
    }
    
    return results;
  }

  /**
   * 创建类型安全的对象工厂
   */
  static createObject<T>(schema: z.ZodSchema<T>): (data: unknown) => T {
    return (data: unknown) => {
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new FBXValidationError(
            `Failed to create object: ${error.message}`,
            'OBJECT_CREATION_FAILED',
            undefined
          );
          (this as any).cause = error;
        }
        throw error;
      }
    };
  }

  /**
   * 带默认值的验证
   */
  static parseWithDefault<T>(schema: z.ZodSchema<T>, data: unknown, defaultValue: T): T {
    try {
      return schema.parse(data);
    } catch (error) {
      console.warn('Validation failed, using default value:', error);
      return defaultValue;
    }
  }
}

/**
 * 创建验证过的属性访问器
 */
export function createValidatedProperty<T>(
  obj: any,
  path: string,
  schema?: z.ZodSchema<T>
): () => T | null {
  return () => FBXValidator.safeProperty(obj, path, schema);
}

/**
 * 批量验证对象属性
 */
export function validateProperties<T extends Record<string, any>>(
  obj: any,
  properties: { [K in keyof T]: z.ZodSchema<T[K]> }
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, schema] of Object.entries(properties)) {
    const value = FBXValidator.safeProperty(obj, key, schema);
    if (value !== null) {
      (result as any)[key] = value;
    }
  }
  
  return result;
}