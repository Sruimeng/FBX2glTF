/**
 * @file /parsers/core/base-parser.ts
 * @description 解析器基类实现
 */

import type {
  IParsingContext,
  IParser,
  IAsyncParser,
  ParserLifecycle,
  ParserMetadata
} from '../../types/core/parser';

/**
 * 抽象解析器基类
 * 提供通用的解析器功能和生命周期管理
 * @template TInput 输入类型
 * @template TOutput 输出类型
 */
export abstract class BaseParser<TInput, TOutput> implements IParser<TInput, TOutput>, ParserLifecycle {
  protected context: IParsingContext;
  protected metadata: ParserMetadata;

  constructor(context: IParsingContext, metadata?: Partial<ParserMetadata>) {
    this.context = context;
    this.metadata = {
      name: this.constructor.name,
      version: '1.0.0',
      description: '',
      dependencies: [],
      ...metadata
    };
  }

  /**
   * 主要解析方法，由子类实现
   */
  abstract parse(input: TInput, context: IParsingContext): TOutput;

  /**
   * 解析前的生命周期钩子
   */
  public beforeParse(): void {
    // 子类可以重写此方法
  }

  /**
   * 解析后的生命周期钩子
   */
  public afterParse(result: TOutput): void {
    // 子类可以重写此方法
  }

  /**
   * 错误处理钩子
   */
  public onError(error: Error): void {
    console.error(`[${this.metadata.name}] Error during parsing:`, error);
    throw error;
  }

  /**
   * 统一的日志记录
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.metadata.name}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'info':
        console.info(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
    }
  }

  /**
   * 输入验证
   */
  protected validateInput(input: TInput): void {
    if (input === null || input === undefined) {
      throw new Error(`Invalid input: input cannot be null or undefined`);
    }
  }

  /**
   * 安全执行解析，包含错误处理和生命周期管理
   */
  protected safeParse(input: TInput): TOutput {
    try {
      this.validateInput(input);
      this.beforeParse();

      const result = this.parse(input, this.context);

      this.afterParse(result);
      return result;
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 获取节点信息
   */
  protected getParserInfo(): ParserMetadata {
    return { ...this.metadata };
  }
}

/**
 * 异步解析器基类
 * @template TInput 输入类型
 * @template TOutput 输出类型
 */
export abstract class AsyncBaseParser<TInput, TOutput> implements IAsyncParser<TInput, TOutput>, ParserLifecycle {
  protected context: IParsingContext;
  protected metadata: ParserMetadata;

  constructor(context: IParsingContext, metadata?: Partial<ParserMetadata>) {
    this.context = context;
    this.metadata = {
      name: this.constructor.name,
      version: '1.0.0',
      description: '',
      dependencies: [],
      ...metadata
    };
  }

  /**
   * 异步解析方法，由子类实现
   */
  abstract parse(input: TInput, context: IParsingContext): Promise<TOutput>;

  /**
   * 解析前的生命周期钩子
   */
  public beforeParse(): void {
    // 子类可以重写此方法
  }

  /**
   * 解析后的生命周期钩子
   */
  public afterParse(result: TOutput): void {
    // 子类可以重写此方法
  }

  /**
   * 错误处理钩子
   */
  public onError(error: Error): void {
    console.error(`[${this.metadata.name}] Error during parsing:`, error);
    throw error;
  }

  /**
   * 输入验证
   */
  protected validateInput(input: TInput): void {
    if (input === null || input === undefined) {
      throw new Error(`Invalid input: input cannot be null or undefined`);
    }
  }

  /**
   * 安全执行异步解析
   */
  protected async safeParse(input: TInput): Promise<TOutput> {
    try {
      this.validateInput(input);
      this.beforeParse();

      const result = await this.parse(input, this.context);

      this.afterParse(result);
      return result;
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }
}