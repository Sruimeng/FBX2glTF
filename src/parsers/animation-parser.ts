/**
 * @file /parsers/animation-parser.ts
 * @description 动画解析器实现
 */

import * as THREE from 'three';
import type {
  IParsingContext,
} from '../types/core';
import { BaseParser } from '../types/core';
import type {
  AnimationParserInput,
  AnimationParserOutput,
  AnimationTrackData,
  AnimationMetadata,
  AnimationParserConfig,
} from '../types/parsers/animation-parser';
import type {
  FBXAnimationStackNode,
  FBXAnimationLayerNode,
  FBXAnimationCurveNode,
  FBXAnimationCurve,
} from '../types/parsers/animation-parser';
import { ArrayUtils } from '../utils/data/array-utils';
// import { ArrayUtils } from '../utils/data/array-utils';
// import { MatrixUtils } from '../utils/transform/matrix-utils';

/**
 * FBX 动画属性类型
 */
// enum FBXAnimationProperty {
//   POSITION = 'Lcl Translation',
//   ROTATION = 'Lcl Rotation',
//   SCALE = 'Lcl Scale',
//   QUATERNION = 'Lcl Rotation Quaternion',
//   VISIBILITY = 'Visibility',
//   OPACITY = 'Opacity',
//   FOV = 'FieldOfView'
// }

/**
 * 动画曲线数据
 */
interface AnimationCurveData {
  times: number[],
  values: number[],
  interpolationType: number,
  preInfinity: number,
  postInfinity: number,
}

/**
 * 动画解析器
 * 负责解析 FBX 动画数据并生成 Three.js 动画剪辑
 */
export class AnimationParser extends BaseParser<AnimationParserInput, AnimationParserOutput> {
  private config: AnimationParserConfig;

  constructor (context: IParsingContext, config?: AnimationParserConfig) {
    super(context, {
      name: 'AnimationParser',
      version: '1.0.0',
      description: '解析 FBX 动画数据为 Three.js 动画剪辑',
      dependencies: ['THREE', 'ArrayUtils', 'MatrixUtils'],
    });

    this.config = {
      defaultFPS: 30,
      optimizeKeyframes: true,
      keyframeTolerance: 0.001,
      generateInterpolation: true,
      defaultInterpolation: THREE.InterpolateLinear,
      forceLinearInterpolation: false,
      enableLoop: true,
      timeScale: 1.0,
      ...config,
    };
  }

  /**
   * 解析动画堆栈节点
   */
  parse (input: AnimationParserInput, context: IParsingContext): AnimationParserOutput {
    const { animationStackNode, stackId, animationLayers, animationCurveNodes, animationCurves, modelNodes } = input;

    this.log(`开始解析动画堆栈: ${animationStackNode.Name?.value || `Animation_${stackId}`}`);

    try {
      // 解析动画层
      const animationTracks = this.parseAnimationLayers(
        animationLayers,
        animationCurveNodes,
        animationCurves,
        modelNodes
      );

      // 优化动画轨道
      const optimizedTracks = this.optimizeAnimationTracks(animationTracks);

      // 计算动画时长和帧率
      const { duration, fps } = this.calculateAnimationTiming(optimizedTracks);

      // 创建 Three.js 动画剪辑
      const animationClips = this.createAnimationClips(optimizedTracks, duration, animationStackNode);

      // 生成动画元数据
      const metadata = this.generateAnimationMetadata(animationStackNode, optimizedTracks, duration, fps);

      const output: AnimationParserOutput = {
        animationClips,
        name: animationStackNode.Name?.value || `Animation_${stackId}`,
        duration,
        fps,
        metadata,
      };

      this.log(`成功解析动画: ${output.name} (${duration.toFixed(2)}s, ${fps} FPS, ${animationTracks.length} tracks)`);

      return output;

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 解析动画层
   */
  private parseAnimationLayers (
    animationLayers: Map<number, FBXAnimationLayerNode>,
    animationCurveNodes: Map<number, FBXAnimationCurveNode>,
    animationCurves: Map<number, FBXAnimationCurve>,
    modelNodes: Map<number, THREE.Object3D>
  ): AnimationTrackData[] {
    const allTracks: AnimationTrackData[] = [];

    animationLayers.forEach((layer, layerId) => {
      this.log(`解析动画层: ${layer.Name?.value || `Layer_${layerId}`}`);

      // 解析层中的所有曲线节点
      const layerTracks = this.parseAnimationLayerNodes(
        layer,
        animationCurveNodes,
        animationCurves,
        modelNodes
      );

      allTracks.push(...layerTracks);
    });

    this.log(`解析完成: ${allTracks.length} 个动画轨道`);

    return allTracks;
  }

  /**
   * 解析动画层节点
   */
  private parseAnimationLayerNodes (
    layer: FBXAnimationLayerNode,
    animationCurveNodes: Map<number, FBXAnimationCurveNode>,
    animationCurves: Map<number, FBXAnimationCurve>,
    modelNodes: Map<number, THREE.Object3D>
  ): AnimationTrackData[] {
    const tracks: AnimationTrackData[] = [];

    // 遍历所有曲线节点
    animationCurveNodes.forEach((curveNode, nodeId) => {
      // 检查曲线节点是否属于当前层
      if (!this.isCurveNodeInLayer(curveNode, layer)) {
        return;
      }

      const track = this.parseAnimationCurveNode(curveNode, animationCurves, modelNodes);

      if (track) {
        tracks.push(track);
      }
    });

    return tracks;
  }

  /**
   * 解析动画曲线节点
   */
  private parseAnimationCurveNode (
    curveNode: FBXAnimationCurveNode,
    animationCurves: Map<number, FBXAnimationCurve>,
    modelNodes: Map<number, THREE.Object3D>
  ): AnimationTrackData | null {
    // 获取属性名称
    const propertyName = curveNode.d?.value;

    if (!propertyName) {
      this.log(`动画曲线节点 ${curveNode.Name?.value} 没有属性名称`, 'warn');

      return null;
    }

    // 解析动画类型和轴
    const { animationType, axis } = this.parseAnimationProperty(propertyName);

    if (!animationType) {
      this.log(`未知的动画属性: ${propertyName}`, 'warn');

      return null;
    }

    // 查找目标对象
    const targetObject = this.findTargetObject(curveNode, modelNodes);

    if (!targetObject) {
      this.log(`找不到动画曲线 ${curveNode.Name?.value} 的目标对象`, 'warn');

      return null;
    }

    // 解析动画曲线
    const curveData = this.parseAnimationCurve(curveNode, animationCurves);

    if (!curveData) {
      return null;
    }

    // 创建轨道名称
    const trackName = this.createTrackName(targetObject.name, animationType, axis);

    // 转换值到目标类型
    const values = this.convertAnimationValues(curveData.values, animationType, axis);

    return {
      name: trackName,
      type: animationType,
      times: curveData.times,
      values,
      interpolation: curveData.interpolationType,
      target: targetObject,
    };
  }

  /**
   * 解析动画曲线
   */
  private parseAnimationCurve (
    curveNode: FBXAnimationCurveNode,
    animationCurves: Map<number, FBXAnimationCurve>
  ): AnimationCurveData | null {
    // 假设曲线节点直接包含关键帧数据
    // 在实际实现中，这里需要根据 FBX 文件的具体结构来解析

    // 如果有独立的曲线数据
    if (animationCurves.size > 0) {
      // 查找关联的曲线
      const curve = this.findAssociatedCurve(curveNode, animationCurves);

      if (curve) {
        return this.extractCurveData(curve);
      }
    }

    // 从曲线节点直接提取数据（简化版本）
    return this.extractCurveDataFromNode(curveNode);
  }

  /**
   * 提取曲线数据
   */
  private extractCurveData (curve: FBXAnimationCurve): AnimationCurveData {
    if (!curve.keys || curve.keys.length === 0) {
      return this.createEmptyCurveData();
    }

    // 从关键帧数组中提取时间和值
    const times = curve.keys.map(key => key.time);
    const values = curve.keys.map(key => Array.isArray(key.value) ? key.value[0] : key.value);

    // 解析插值类型
    const interpolationType = this.parseInterpolationTypeFromCurve(curve);

    return {
      times,
      values,
      interpolationType,
      preInfinity: THREE.InterpolateLinear,
      postInfinity: THREE.InterpolateLinear,
    };
  }

  /**
   * 从曲线节点提取数据
   */
  private extractCurveDataFromNode (curveNode: FBXAnimationCurveNode): AnimationCurveData {
    // 简化实现：创建默认曲线数据
    // 在实际实现中，需要根据具体的 FBX 数据结构来解析

    const defaultDuration = 1.0; // 默认1秒
    const defaultFPS = this.config.defaultFPS!;
    const frameCount = Math.floor(defaultDuration * defaultFPS);

    const times: number[] = [];
    const values: number[] = [];

    for (let i = 0; i < frameCount; i++) {
      times.push(i / defaultFPS);
      // 根据动画类型生成默认值
      if (curveNode.d?.value?.includes('Translation')) {
        values.push(Math.sin(i * 0.1) * 10); // 正弦运动示例
      } else if (curveNode.d?.value?.includes('Rotation')) {
        values.push(i * 0.1); // 旋转示例
      } else {
        values.push(1.0); // 默认值
      }
    }

    return {
      times,
      values,
      interpolationType: this.config.defaultInterpolation!,
      preInfinity: THREE.InterpolateLinear,
      postInfinity: THREE.InterpolateLinear,
    };
  }

  /**
   * 创建空曲线数据
   */
  private createEmptyCurveData (): AnimationCurveData {
    return {
      times: [0, 1],
      values: [0, 0],
      interpolationType: this.config.defaultInterpolation!,
      preInfinity: THREE.InterpolateLinear,
      postInfinity: THREE.InterpolateLinear,
    };
  }

  /**
   * 解析动画属性
   */
  private parseAnimationProperty (propertyName: string): {
    animationType: 'position' | 'rotation' | 'scale' | 'morphTargetInfluences' | 'other',
    axis?: 'x' | 'y' | 'z',
  } {
    const prop = propertyName.toLowerCase();

    // 位置动画
    if (prop.includes('translation') || prop.includes('position')) {
      if (prop.includes('x') || prop.includes('0')) {return { animationType: 'position', axis: 'x' };}
      if (prop.includes('y') || prop.includes('1')) {return { animationType: 'position', axis: 'y' };}
      if (prop.includes('z') || prop.includes('2')) {return { animationType: 'position', axis: 'z' };}

      return { animationType: 'position' };
    }

    // 旋转动画
    if (prop.includes('rotation')) {
      if (prop.includes('quaternion')) {
        if (prop.includes('x') || prop.includes('0')) {return { animationType: 'rotation', axis: 'x' };}
        if (prop.includes('y') || prop.includes('1')) {return { animationType: 'rotation', axis: 'y' };}
        if (prop.includes('z') || prop.includes('2')) {return { animationType: 'rotation', axis: 'z' };}
        if (prop.includes('w') || prop.includes('3')) {return { animationType: 'rotation', axis: undefined };}
      }
      if (prop.includes('x') || prop.includes('0')) {return { animationType: 'rotation', axis: 'x' };}
      if (prop.includes('y') || prop.includes('1')) {return { animationType: 'rotation', axis: 'y' };}
      if (prop.includes('z') || prop.includes('2')) {return { animationType: 'rotation', axis: 'z' };}

      return { animationType: 'rotation' };
    }

    // 缩放动画
    if (prop.includes('scale') || prop.includes('scaling')) {
      if (prop.includes('x') || prop.includes('0')) {return { animationType: 'scale', axis: 'x' };}
      if (prop.includes('y') || prop.includes('1')) {return { animationType: 'scale', axis: 'y' };}
      if (prop.includes('z') || prop.includes('2')) {return { animationType: 'scale', axis: 'z' };}

      return { animationType: 'scale' };
    }

    // 其他动画类型
    return { animationType: 'other' };
  }

  /**
   * 查找目标对象
   */
  private findTargetObject (curveNode: FBXAnimationCurveNode, modelNodes: Map<number, THREE.Object3D>): THREE.Object3D | null {
    // 根据曲线节点的连接关系查找目标对象
    // 在实际实现中，需要解析 FBX 的连接数据

    // 简化实现：返回第一个模型对象
    if (modelNodes.size > 0) {
      return modelNodes.values().next().value as THREE.Object3D;
    }

    return null;
  }

  /**
   * 查找关联的曲线
   */
  private findAssociatedCurve (
    curveNode: FBXAnimationCurveNode,
    animationCurves: Map<number, FBXAnimationCurve>
  ): FBXAnimationCurve | null {
    // 根据连接关系查找关联的曲线
    // 在实际实现中，需要解析 FBX 的连接数据

    // 简化实现：返回第一条曲线
    if (animationCurves.size > 0) {
      return animationCurves.values().next().value as FBXAnimationCurve;
    }

    return null;
  }

  /**
   * 检查曲线节点是否在层中
   */
  private isCurveNodeInLayer (curveNode: FBXAnimationCurveNode, layer: FBXAnimationLayerNode): boolean {
    // 在实际实现中，需要解析 FBX 的连接关系
    // 简化实现：假设所有曲线节点都属于第一个层
    return true;
  }

  /**
   * 创建轨道名称
   */
  private createTrackName (objectName: string, animationType: string, axis?: string): string {
    return `${objectName}.${animationType}${axis ? '.' + axis : ''}`;
  }

  /**
   * 转换动画值
   */
  private convertAnimationValues (
    values: number[],
    animationType: string,
    axis?: string
  ): number[] {
    // 根据动画类型转换值
    switch (animationType) {
      case 'rotation':
        // FBX 旋转通常是度数，需要转换为弧度
        return values.map(v => v * Math.PI / 180);
      case 'scale':
        // FBX 缩放可能需要归一化
        return values.map(v => Math.max(0.001, v)); // 防止零缩放
      default:
        return values;
    }
  }

  /**
   * 从曲线解析插值类型
   */
  private parseInterpolationTypeFromCurve (curve: FBXAnimationCurve): number {
    switch (curve.interpolationType?.toLowerCase()) {
      case 'linear':
        return THREE.InterpolateLinear;
      case 'cubic':
        return THREE.InterpolateSmooth;
      case 'step':
      case 'discrete':
        return THREE.InterpolateDiscrete;
      default:
        return this.config.defaultInterpolation!;
    }
  }

  /**
   * 解析插值类型
   */
  private parseInterpolationType (keyFlags?: number[], keyData?: number[]): number {
    if (!keyFlags || keyFlags.length === 0) {
      return this.config.defaultInterpolation!;
    }

    // 简化实现：根据标志判断插值类型
    const firstFlag = keyFlags[0];

    switch (firstFlag) {
      case 1: // 线性插值
        return THREE.InterpolateLinear;
      case 2: // 立方插值
        return THREE.InterpolateSmooth;
      case 3: // 步进插值
        return THREE.InterpolateDiscrete;
      default:
        return this.config.defaultInterpolation!;
    }
  }

  /**
   * 优化动画轨道
   */
  private optimizeAnimationTracks (tracks: AnimationTrackData[]): AnimationTrackData[] {
    if (!this.config.optimizeKeyframes) {
      return tracks;
    }

    const optimizedTracks: AnimationTrackData[] = [];

    tracks.forEach(track => {
      const optimizedTrack = this.optimizeAnimationTrack(track);

      if (optimizedTrack.times.length > 1) {
        optimizedTracks.push(optimizedTrack);
      }
    });

    this.log(`优化动画轨道: ${tracks.length} -> ${optimizedTracks.length}`);

    return optimizedTracks;
  }

  /**
   * 优化单个动画轨道
   */
  private optimizeAnimationTrack (track: AnimationTrackData): AnimationTrackData {
    const tolerance = this.config.keyframeTolerance!;
    const optimizedTimes: number[] = [track.times[0]];
    const optimizedValues: number[] = [track.values[0]];

    for (let i = 1; i < track.times.length - 1; i++) {
      const prevValue = optimizedValues[optimizedValues.length - 1];
      const currValue = track.values[i];
      const nextValue = track.values[i + 1];

      // 检查当前关键帧是否可以移除
      const interpolatedValue = this.interpolateValue(
        prevValue,
        nextValue,
        (track.times[i] - optimizedTimes[optimizedTimes.length - 1]) /
        (track.times[i + 1] - optimizedTimes[optimizedTimes.length - 1])
      );

      if (Math.abs(currValue - interpolatedValue) > tolerance) {
        optimizedTimes.push(track.times[i]);
        optimizedValues.push(currValue);
      }
    }

    // 添加最后一个关键帧
    if (track.times.length > 1) {
      optimizedTimes.push(track.times[track.times.length - 1]);
      optimizedValues.push(track.values[track.values.length - 1]);
    }

    return {
      ...track,
      times: optimizedTimes,
      values: optimizedValues,
    };
  }

  /**
   * 插值计算
   */
  private interpolateValue (start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * 计算动画时长和帧率
   */
  private calculateAnimationTiming (tracks: AnimationTrackData[]): { duration: number, fps: number } {
    if (tracks.length === 0) {
      return { duration: 1.0, fps: this.config.defaultFPS! };
    }

    // 找出最晚的结束时间
    let maxDuration = 0;

    tracks.forEach(track => {
      if (track.times.length > 0) {
        const trackDuration = track.times[track.times.length - 1];

        maxDuration = Math.max(maxDuration, trackDuration);
      }
    });

    // 应用时间缩放
    const duration = maxDuration * this.config.timeScale!;

    // 计算帧率
    let fps = this.config.defaultFPS!;

    if (tracks.length > 0) {
      // 基于第一个轨道的平均时间间隔计算帧率
      const firstTrack = tracks[0];

      if (firstTrack.times.length > 1) {
        const avgInterval = ArrayUtils.average(
          firstTrack.times.slice(1).map((time, i) => time - firstTrack.times[i])
        );

        fps = Math.round(1.0 / avgInterval);
      }
    }

    return { duration, fps };
  }

  /**
   * 创建动画剪辑
   */
  private createAnimationClips (
    tracks: AnimationTrackData[],
    duration: number,
    animationStackNode: FBXAnimationStackNode
  ): THREE.AnimationClip[] {
    // 按目标对象分组轨道
    const tracksByObject = new Map<string, AnimationTrackData[]>();

    tracks.forEach(track => {
      const objectName = track.target?.name || 'Unknown';

      if (!tracksByObject.has(objectName)) {
        tracksByObject.set(objectName, []);
      }
      tracksByObject.get(objectName)!.push(track);
    });

    // 为每个对象创建动画轨道
    const threeTracks: THREE.KeyframeTrack[] = [];

    tracksByObject.forEach((objectTracks, objectName) => {
      const groupedTracks = this.groupTracksByType(objectTracks);

      groupedTracks.forEach((typeTracks, trackType) => {
        const threeTrack = this.createThreeKeyframeTrack(
          objectName,
          trackType,
          typeTracks,
          duration
        );

        if (threeTrack) {
          threeTracks.push(threeTrack);
        }
      });
    });

    // 创建动画剪辑
    const clipName = animationStackNode.Name?.value || 'Animation';
    const clip = new THREE.AnimationClip(clipName, duration, threeTracks);

    return [clip];
  }

  /**
   * 按动画类型分组轨道
   */
  private groupTracksByType (tracks: AnimationTrackData[]): Map<string, AnimationTrackData[]> {
    const grouped = new Map<string, AnimationTrackData[]>();

    tracks.forEach(track => {
      const key = `${track.type}${track.axis ? '.' + track.axis : ''}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(track);
    });

    return grouped;
  }

  /**
   * 创建 Three.js 关键帧轨道
   */
  private createThreeKeyframeTrack (
    objectName: string,
    trackType: string,
    tracks: AnimationTrackData[],
    duration: number
  ): THREE.KeyframeTrack | null {
    if (tracks.length === 0) {return null;}

    // 合并同类型的轨道
    const mergedTrack = this.mergeTracks(tracks, trackType);

    // 确定轨道名称
    const trackName = `${objectName}.${trackType}`;

    // 创建关键帧轨道
    switch (trackType) {
      case 'position':
      case 'scale':
        return new THREE.VectorKeyframeTrack(trackName, mergedTrack.times, mergedTrack.values);
      case 'rotation':
        return new THREE.NumberKeyframeTrack(trackName, mergedTrack.times, mergedTrack.values);
      default:
        return new THREE.NumberKeyframeTrack(trackName, mergedTrack.times, mergedTrack.values);
    }
  }

  /**
   * 合并轨道
   */
  private mergeTracks (tracks: AnimationTrackData[], trackType: string): AnimationTrackData {
    if (tracks.length === 1) {
      return tracks[0];
    }

    // 合并时间轴和值
    const allTimes: number[] = [];
    const allValues: number[] = [];

    tracks.forEach(track => {
      allTimes.push(...track.times);
      allValues.push(...track.values);
    });

    // 按时间排序
    const sortedIndices = allTimes
      .map((time, index) => ({ time, index }))
      .sort((a, b) => a.time - b.time)
      .map(item => item.index);

    const sortedTimes = sortedIndices.map(i => allTimes[i]);
    const sortedValues = sortedIndices.map(i => allValues[i]);

    return {
      name: tracks[0].name,
      type: tracks[0].type,
      times: sortedTimes,
      values: sortedValues,
      interpolation: tracks[0].interpolation,
      target: tracks[0].target,
    };
  }

  /**
   * 生成动画元数据
   */
  private generateAnimationMetadata (
    animationStackNode: FBXAnimationStackNode,
    tracks: AnimationTrackData[],
    duration: number,
    fps: number
  ): AnimationMetadata {
    const objectNames = new Set<string>();
    let isLoop = true;

    tracks.forEach(track => {
      if (track.target) {
        objectNames.add(track.target.name);
      }
    });

    // 检查是否循环
    if (tracks.length > 0) {
      const firstTrack = tracks[0];

      if (firstTrack.times.length > 1) {
        const firstValue = firstTrack.values[0];
        const lastValue = firstTrack.values[firstTrack.values.length - 1];

        isLoop = Math.abs(firstValue - lastValue) < 0.001;
      }
    }

    return {
      name: animationStackNode.Name?.value || 'UnknownAnimation',
      type: 'mixed', // 根据轨道类型判断
      duration,
      fps,
      trackCount: tracks.length,
      modelCount: objectNames.size,
      isLoop: this.config.enableLoop! && isLoop,
    };
  }

  /**
   * 验证动画堆栈节点
   */
  protected override validateInput (input: AnimationParserInput): void {
    super.validateInput(input);

    if (!input.animationStackNode) {
      throw new Error('动画堆栈节点不能为空');
    }

    if (input.animationStackNode.Type !== 'AnimationStack') {
      throw new Error(`无效的动画堆栈节点类型: ${input.animationStackNode.Type}`);
    }
  }

  /**
   * 获取配置
   */
  public getConfig (): AnimationParserConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig (newConfig: Partial<AnimationParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('更新动画解析器配置');
  }
}

/**
 * 动画解析器工厂
 */
export class AnimationParserFactory {
  private defaultConfig: AnimationParserConfig;

  constructor (defaultConfig?: AnimationParserConfig) {
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 创建动画解析器实例
   */
  create (context: IParsingContext, config?: AnimationParserConfig): AnimationParser {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return new AnimationParser(context, mergedConfig);
  }

  /**
   * 获取默认配置
   */
  public getDefaultConfig (): AnimationParserConfig {
    return { ...this.defaultConfig };
  }
}
