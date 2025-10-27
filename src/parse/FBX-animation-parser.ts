/**
 * FBX 动画解析器主文件
 */

import type { AnimationClip } from 'three';
import type { IParsingContext } from '../types';
import { BaseParser } from '../types';
import type { RawClip } from '../types';

// 导入动画解析模块
import {
  parseAnimationCurveNodes,
  parseAnimationCurves,
  parseAnimationLayers,
  parseAnimStacks,
  addClip,
} from './animation';

/**
 * FBX 动画解析器
 * 将原始动画片段转换为 Three.js 动画片段
 */
export class AnimationParser extends BaseParser<null, AnimationClip[]> {
  constructor (context: IParsingContext) {
    super(context);
  }

  /**
   * 解析动画数据
   * @param input 输入数据（此处为null）
   * @param context 解析上下文
   * @returns 动画片段数组
   */
  parse (_input: null, context: IParsingContext): AnimationClip[] {
    const animationClips: AnimationClip[] = [];
    const rawClips = this.parseClips();

    if (rawClips !== undefined) {
      for (const key in rawClips) {
        const rawClip = rawClips[key];
        const clip = this.addClip(rawClip);

        animationClips.push(clip);
      }
    }

    return animationClips;
  }

  /**
   * 解析动画片段
   * @returns 原始动画片段映射
   */
  parseClips (): Record<string, RawClip> | undefined {
    const objects = this.context.fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }

    // since the actual transformation data is stored in FBXTree.Objects.AnimationCurve,
    // if this is undefined we can safely assume there are no animations
    if (objects.AnimationCurve === undefined) {
      return undefined;
    }

    // 解析各个组件
    const curveNodesMap = parseAnimationCurveNodes(objects);

    parseAnimationCurves(objects, curveNodesMap, this.context.connections);
    const layersMap = parseAnimationLayers(this.context, curveNodesMap);
    const rawClips = parseAnimStacks(this.context, layersMap);

    return rawClips;
  }

  /**
   * 添加动画片段
   * @param rawClip 原始动画片段
   * @returns Three.js 动画片段
   */
  private addClip (rawClip: { layer: any, name: string }): AnimationClip {
    return addClip(rawClip.layer, this.context);
  }
}