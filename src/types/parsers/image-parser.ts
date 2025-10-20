/**
 * @file /types/parsers/image-parser.ts
 * @description 图像解析器类型定义
 */

import type * as THREE from 'three';
import type { FBXNode, FBXValue } from '../core/fbx-types';

/**
 * FBX 图像节点接口
 */
export interface FBXImageNode extends FBXNode {
  /** 图像类型 */
  Type: 'Texture' | 'Video',
  /** 版本 */
  Version: number,
  /** 图像名称 */
  TextureName?: FBXValue<string>,
  /** 文件类型 */
  Type_s?: FBXValue<string>,
  /** 相对路径 */
  RelativeFilename?: FBXValue<string>,
  /** 绝对路径 */
  Filename?: FBXValue<string>,
  /** 图片宽度 */
  Width?: FBXValue<number>,
  /** 图片高度 */
  Height?: FBXValue<number>,
  /** 图像内容 (Base64) */
  Content?: FBXValue<string>,
  /** 图像格式 */
  ImageFormat?: FBXValue<string>,
}

/**
 * 图像解析器输入接口
 */
export interface ImageParserInput {
  /** FBX 图像节点 */
  imageNode: FBXImageNode,
  /** 节点ID */
  id: number,
}

/**
 * 图像解析器输出接口
 */
export interface ImageParserOutput {
  /** Three.js 纹理对象 */
  texture: THREE.Texture,
  /** 图片名称 */
  name: string,
  /** 图片尺寸信息 */
  size?: {
    width: number,
    height: number,
  },
  /** 图片格式 */
  format?: string,
  /** 是否为视频纹理 */
  isVideo: boolean,
}

/**
 * 图像元数据
 */
export interface ImageMetadata {
  /** 原始文件名 */
  filename?: string,
  /** 相对文件名 */
  relativeFilename?: string,
  /** 图片宽度 */
  width?: number,
  /** 图片高度 */
  height?: number,
  /** 图片格式 */
  format?: string,
  /** 是否为视频 */
  isVideo: boolean,
}

/**
 * 图像解析器配置
 */
export interface ImageParserConfig {
  /** 是否启用Mipmap */
  generateMipmaps?: boolean,
  /** 纹理过滤模式 */
  magFilter?: THREE.MagnificationTextureFilter,
  minFilter?: THREE.MinificationTextureFilter,
  /** 纹理包装模式 */
  wrapS?: THREE.Wrapping,
  wrapT?: THREE.Wrapping,
  /** 颜色空间 */
  colorSpace?: THREE.ColorSpace,
  /** 是否翻转Y轴 */
  flipY?: boolean,
  /** 图像加载超时时间 (毫秒) */
  timeout?: number,
  /** 是否使用缓存 */
  useCache?: boolean,
}
