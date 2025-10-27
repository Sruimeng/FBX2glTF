import type { IParsingContext, IParser, IAsyncParser } from './parser';
import type { FBXConnectionNode } from '../nodes';

/**
 * 解析器抽象基类
 * 提供通用功能和工具方法
 */
export abstract class BaseParser<TInput, TOutput> implements IParser<TInput, TOutput> {
  protected context: IParsingContext;

  constructor (context: IParsingContext) {
    if (!context) {
      throw new Error('ParsingContext is required');
    }
    this.context = context;
  }

  /**
   * 子类必须实现的解析方法
   */
  abstract parse (input: TInput, context: IParsingContext): TOutput;

  /**
   * 统一的日志记录
   */
  protected log (message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.constructor.name}]`;

    switch (level) {
      case 'warn':
        console.warn(prefix, message);

        break;
      case 'error':
        console.error(prefix, message);

        break;
      default:
        console.info(prefix, message);
    }
  }

  /**
   * 输入验证钩子
   */
  protected validateInput (input: TInput): void {
    // 默认实现，子类可重写
    if (input === undefined || input === null) {
      throw new Error('Input cannot be null or undefined');
    }
  }

  /**
   * 获取当前上下文的便捷方法
   */
  protected get fbxTree () { return this.context.fbxTree; }
  protected get connections () { return this.context.connections; }
  protected get sceneGraph () { return this.context.sceneGraph; }
  protected get loadingManager () { return this.context.loadingManager; }
  protected get wireframe () { return this.context.wireframe; }

  /**
   * 便捷方法：根据ID获取节点
   */
  protected getNodeById<T = unknown>(id: number): T | undefined {
    return this.context.getNodeById<T>(id);
  }

  /**
   * 便捷方法：获取节点连接
   */
  protected getConnections (id: number): FBXConnectionNode | undefined {
    return this.context.getConnections(id);
  }

  /**
   * 便捷方法：根据类型获取节点
   */
  protected getNodesByType<T = unknown>(nodeType: string): Map<number, T> {
    return this.context.getNodesByType<T>(nodeType);
  }
}

/**
 * 异步解析器抽象基类
 */
export abstract class AsyncBaseParser<TInput, TOutput> implements IAsyncParser<TInput, TOutput> {
  protected context: IParsingContext;

  constructor (context: IParsingContext) {
    if (!context) {
      throw new Error('ParsingContext is required');
    }
    this.context = context;
  }

  /**
   * 子类必须实现的异步解析方法
   */
  abstract parse (input: TInput, context: IParsingContext): Promise<TOutput>;

  /**
   * 统一的日志记录
   */
  protected log (message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.constructor.name}]`;

    switch (level) {
      case 'warn':
        console.warn(prefix, message);

        break;
      case 'error':
        console.error(prefix, message);

        break;
      default:
        console.info(prefix, message);
    }
  }

  /**
   * 输入验证钩子
   */
  protected validateInput (input: TInput): void {
    // 默认实现，子类可重写
    if (input === undefined || input === null) {
      throw new Error('Input cannot be null or undefined');
    }
  }

  /**
   * 异步输入验证
   */
  protected async validateInputAsync (input: TInput): Promise<void> {
    // 默认调用同步验证
    this.validateInput(input);
  }
}