/**
 * @file /types/parsers/animation-parser.ts
 * @description 动画解析器类型定义
 */

import type * as THREE from 'three';
import type { FBXNode, FBXValue, FBXKeyframe, FBXAnimationCurve } from '../core/fbx-types';

// Re-export for convenience
export type { FBXAnimationCurve } from '../core/fbx-types';

/**
 * FBX 动画曲线节点接口
 */
export interface FBXAnimationCurveNode extends FBXNode {
  /** 动画曲线节点类型 */
  Type: 'AnimationCurveNode';
  /** 版本 */
  Version: number;
  /** 曲线节点名称 */
  Name?: FBXValue<string>;
  /** 动画属性 */
  d?: FBXValue<string>;
  /** 曲线节点ID */
  ID?: FBXValue<number>;
  /** 连接的曲线 */
  curves?: Map<string, FBXAnimationCurve>;
}


/**
 * FBX 动画层节点接口
 */
export interface FBXAnimationLayerNode extends FBXNode {
  /** 动画层类型 */
  Type: 'AnimationLayer';
  /** 版本 */
  Version: number;
  /** 层名称 */
  Name?: FBXValue<string>;
  /** 混合模式 */
  MixMode?: FBXValue<string>;
  /** 权重 */
  Weight?: FBXValue<number>;
  /** 是否静音 */
  Mute?: FBXValue<boolean>;
  /** 是否独奏 */
  Solo?: FBXValue<boolean>;
  /** 是否锁定 */
  Lock?: FBXValue<boolean>;
}

/**
 * FBX 动画堆栈节点接口
 */
export interface FBXAnimationStackNode extends FBXNode {
  /** 动画堆栈类型 */
  Type: 'AnimationStack';
  /** 版本 */
  Version: number;
  /** 堆栈名称 */
  Name?: FBXValue<string>;
  /** 描述 */
  Description?: FBXValue<string>;
  /** 动画层 */
  AnimationLayers?: FBXAnimationLayerNode[];
}

/**
 * FBX 姿势节点接口
 */
export interface FBXPoseNode extends FBXNode {
  /** 姿势类型 */
  Type: 'Pose';
  /** 版本 */
  Version: number;
  /** 姿势名称 */
  PoseName?: FBXValue<string>;
  /** 姿势子类型 */
  PoseType?: FBXValue<string>;
  /** 姿势节点 */
  PoseNode?: FBXPoseNodeData[];
}

/**
 * FBX 姿势节点数据接口
 */
export interface FBXPoseNodeData {
  /** 节点ID */
  ID: number;
  /** 矩阵 */
  Matrix: Float32Array;
}

/**
 * 动画解析器输入接口
 */
export interface AnimationParserInput {
  /** FBX 动画堆栈节点 */
  animationStackNode: FBXAnimationStackNode;
  /** 堆栈ID */
  stackId: number;
  /** 关联的动画层 */
  animationLayers: Map<number, FBXAnimationLayerNode>;
  /** 关联的动画曲线节点 */
  animationCurveNodes: Map<number, FBXAnimationCurveNode>;
  /** 关联的动画曲线 */
  animationCurves: Map<number, FBXAnimationCurve>;
  /** 关联的模型节点 */
  modelNodes: Map<number, THREE.Object3D>;
}

/**
 * 动画解析器输出接口
 */
export interface AnimationParserOutput {
  /** Three.js 动画剪辑 */
  animationClips: THREE.AnimationClip[];
  /** 动画名称 */
  name: string;
  /** 动画时长 */
  duration: number;
  /** 帧率 */
  fps: number;
  /** 动画元数据 */
  metadata: AnimationMetadata;
}

/**
 * 动画轨道数据接口
 */
export interface AnimationTrackData {
  /** 轨道名称 */
  name: string;
  /** 轨道类型 */
  type: 'position' | 'rotation' | 'scale' | 'morphTargetInfluences' | 'other';
  /** 轴向（可选） */
  axis?: 'x' | 'y' | 'z';
  /** 关键帧时间数组 */
  times: number[];
  /** 关键帧值数组 */
  values: number[];
  /** 插值类型 */
  interpolation?: number;
  /** 目标对象 */
  target?: THREE.Object3D;
}

/**
 * 动画元数据接口
 */
export interface AnimationMetadata {
  /** 动画名称 */
  name: string;
  /** 动画类型 */
  type: 'skeletal' | 'morph' | 'transform' | 'mixed';
  /** 动画时长 */
  duration: number;
  /** 帧率 */
  fps: number;
  /** 轨道数量 */
  trackCount: number;
  /** 影响的模型数量 */
  modelCount: number;
  /** 是否循环 */
  isLoop: boolean;
}

/**
 * 动画解析器配置
 */
export interface AnimationParserConfig {
  /** 默认帧率 */
  defaultFPS?: number;
  /** 是否优化关键帧 */
  optimizeKeyframes?: boolean;
  /** 关键帧误差阈值 */
  keyframeTolerance?: number;
  /** 是否自动生成插值 */
  generateInterpolation?: boolean;
  /** 默认插值类型 */
  defaultInterpolation?: number;
  /** 是否强制使用线性插值 */
  forceLinearInterpolation?: boolean;
  /** 是否启用循环 */
  enableLoop?: boolean;
  /** 时间缩放因子 */
  timeScale?: number;
}

/**
 * FBX 数组数据接口 (动画专用)
 */
interface FBXArrayData {
  a: number[];
}