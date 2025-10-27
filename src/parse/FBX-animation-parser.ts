/**
 * @file parse/FBX-animation-parser.ts
 * @description FBX动画解析器
 */

import type { ParseContext } from '../types/core/fbx-types';

/**
 * FBX动画解析器
 */
export class AnimationParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  /**
   * 解析动画数据
   */
  parse (): any[] {
    const animations: any[] = [];

    // 简化的动画解析逻辑
    if (this.context.fbxTree.Objects && 'AnimationStack' in this.context.fbxTree.Objects) {
      const animationStacks = (this.context.fbxTree.Objects as any).AnimationStack;

      for (const stackId in animationStacks) {
        const animationStack = animationStacks[stackId];

        // 这里可以实现完整的动画解析逻辑
        animations.push({
          name: animationStack.attrName || `Animation_${stackId}`,
          duration: 1.0,
          tracks: [],
        });
      }
    }

    return animations;
  }
}