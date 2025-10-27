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

    // 解析动画栈
    if (this.context.fbxTree.Objects && 'AnimationStack' in this.context.fbxTree.Objects) {
      const animationStacks = (this.context.fbxTree.Objects as any).AnimationStack;

      for (const stackId in animationStacks) {
        const animationStack = animationStacks[stackId];
        const stackName = animationStack.attrName || `Animation_${stackId}`;

        // 创建基础的动画剪辑
        const animationClip = {
          name: stackName,
          duration: 1.0, // 默认持续时间，后续可以从AnimationLayer计算
          tracks: [],
          uuid: `anim_${stackId}`,
        };

        animations.push(animationClip);
      }
    }

    console.log(`📹 解析到 ${animations.length} 个动画栈`);
    animations.forEach((anim, index) => {
      console.log(`  ${index + 1}. ${anim.name} (duration: ${anim.duration}s)`);
    });

    return animations;
  }
}