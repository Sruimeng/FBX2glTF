/**
 * @file /types/parsers/texture-parser.ts
 * @description 纹理解析器类型定义
 */

import type * as THREE from 'three';
import type { FBXNode, FBXValue, FBXTextureInfo } from '../core/fbx-types';

/**
 * FBX 纹理节点接口
 */
export interface FBXTextureNode extends FBXNode {
  /** 纹理类型 */
  Type: 'Texture';
  /** 版本 */
  Version: number;
  /** 纹理名称 */
  TextureName?: FBXValue<string>;
  /** 材质类型 */
  MaterialType?: FBXValue<string>;
  /** 纹理类型 */
  TextureType?: FBXValue<string>;
  /** 使用方式 */
  Usage?: FBXValue<string>;
  /** 纹理坐标集 */
  UVSet?: FBXValue<string>;
  /** 纹理映射模式 */
  WrapModeU?: FBXValue<string>;
  WrapModeV?: FBXValue<string>;
  /** 纹理混合模式 */
  BlendMode?: FBXValue<string>;
  /** 纹理透明度 */
  Alpha?: FBXValue<number>;
  /** 纹理变换 */
  TextureRotation?: FBXValue<number>;
  TextureScaling?: FBXValue<number[]>;
  TextureTranslation?: FBXValue<number[]>;
  /** 纹理CRGB */
  CrColor?: FBXValue<number[]>;
}

/**
 * FBX 纹理视频节点接口
 */
export interface FBXVideoNode extends FBXNode {
  /** 视频类型 */
  Type: 'Video';
  /** 版本 */
  Version: number;
  /** 相对路径 */
  RelativeFilename?: FBXValue<string>;
  /** 绝对路径 */
  Filename?: FBXValue<string>;
  /** 视频内容 */
  Content?: FBXValue<string>;
  /** 视频时长 */
  Duration?: FBXValue<number>;
  /** 帧率 */
  FrameRate?: FBXValue<number>;
}

/**
 * 纹理解析器输入接口
 */
export interface TextureParserInput {
  /** FBX 纹理节点 */
  textureNode: FBXTextureNode;
  /** FBX 视频节点 (如果存在) */
  videoNode?: FBXVideoNode;
  /** 节点ID */
  id: number;
  /** 已解析的图像纹理 (如果存在) */
  baseTexture?: THREE.Texture;
}

/**
 * 纹理解析器输出接口
 */
export interface TextureParserOutput {
  /** Three.js 纹理对象 */
  texture: THREE.Texture;
  /** 纹理名称 */
  name: string;
  /** 纹理类型 */
  textureType: string;
  /** UV 坐标集 */
  uvSet: string;
  /** 纹理变换信息 */
  transform?: {
    rotation: number;
    scaling: THREE.Vector2;
    translation: THREE.Vector2;
  };
  /** 纹理包装模式 */
  wrapMode: {
    u: THREE.Wrapping;
    v: THREE.Wrapping;
  };
  /** 混合模式 */
  blendMode?: string;
  /** 透明度 */
  alpha?: number;
  /** 是否为视频纹理 */
  isVideo: boolean;
}

/**
 * 纹理元数据
 */
export interface TextureMetadata {
  /** 纹理名称 */
  name: string;
  /** 纹理类型 */
  type: string;
  /** 材质类型 */
  materialType?: string;
  /** 使用方式 */
  usage?: string;
  /** UV 坐标集 */
  uvSet: string;
  /** 文件路径信息 */
  filepaths?: {
    relative?: string;
    absolute?: string;
  };
}

/**
 * 纹理解析器配置
 */
export interface TextureParserConfig {
  /** 是否启用Mipmap */
  generateMipmaps?: boolean;
  /** 纹理过滤模式 */
  magFilter?: THREE.MagnificationTextureFilter;
  minFilter?: THREE.MinificationTextureFilter;
  /** 默认包装模式 */
  defaultWrapS?: THREE.Wrapping;
  defaultWrapT?: THREE.Wrapping;
  /** 颜色空间 */
  colorSpace?: THREE.ColorSpace;
  /** 是否翻转Y轴 */
  flipY?: boolean;
  /** 是否支持视频纹理 */
  enableVideoTextures?: boolean;
  /** 视频自动播放 */
  videoAutoplay?: boolean;
  /** 视频循环播放 */
  videoLoop?: boolean;
}