/**
 * @file /parsers/texture-parser.ts
 * @description 纹理解析器实现
 */

import * as THREE from 'three';
import type {
  IParsingContext,
} from '../types/core';
import { BaseParser } from '../types/core';
import type {
  TextureParserInput,
  TextureParserOutput,
  TextureMetadata,
  TextureParserConfig,
} from '../types/parsers/texture-parser';
import type {
  FBXTextureNode,
  FBXVideoNode,
} from '../types/parsers/texture-parser';
import { ImageParser } from './image-parser';

/**
 * 纹理解析器
 * 负责解析 FBX 纹理节点并生成具有完整属性的 Three.js 纹理对象
 */
export class TextureParser extends BaseParser<TextureParserInput, TextureParserOutput> {
  private config: TextureParserConfig;
  private imageParser: ImageParser;

  constructor (context: IParsingContext, config?: TextureParserConfig) {
    super(context, {
      name: 'TextureParser',
      version: '1.0.0',
      description: '解析 FBX 纹理节点为 Three.js 纹理',
      dependencies: ['THREE', 'ImageParser'],
    });

    this.config = {
      generateMipmaps: true,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearMipmapLinearFilter,
      defaultWrapS: THREE.RepeatWrapping,
      defaultWrapT: THREE.RepeatWrapping,
      colorSpace: THREE.SRGBColorSpace,
      flipY: true,
      enableVideoTextures: true,
      videoAutoplay: true,
      videoLoop: true,
      ...config,
    };

    this.imageParser = new ImageParser(context);
  }

  /**
   * 解析纹理节点
   */
  parse (input: TextureParserInput, context: IParsingContext): TextureParserOutput {
    const { textureNode, videoNode, id } = input;

    this.log(`开始解析纹理节点: ${textureNode.name || `Texture_${id}`}`);

    try {
      // 提取纹理元数据
      const metadata = this.extractTextureMetadata(textureNode, videoNode);

      // 加载基础纹理
      const baseTexture = this.loadBaseTexture(input, metadata);

      // 应用纹理变换
      this.applyTextureTransform(baseTexture, metadata);

      // 应用纹理包装模式
      this.applyTextureWrapMode(baseTexture, metadata);

      // 应用纹理过滤
      this.applyTextureFiltering(baseTexture, metadata);

      const output: TextureParserOutput = {
        texture: baseTexture,
        name: textureNode.TextureName?.value || `Texture_${id}`,
        textureType: metadata.type,
        uvSet: metadata.uvSet || 'UVMap',
        transform: metadata.transform,
        wrapMode: {
          u: baseTexture.wrapS,
          v: baseTexture.wrapT,
        },
        blendMode: metadata.blendMode,
        alpha: metadata.alpha,
        isVideo: metadata.isVideo,
      };

      this.log(`成功解析纹理: ${output.name} (${output.textureType})`);

      return output;

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 提取纹理元数据
   */
  private extractTextureMetadata (
    textureNode: FBXTextureNode,
    videoNode?: FBXVideoNode
  ): TextureMetadata {
    const metadata: TextureMetadata = {
      name: textureNode.TextureName?.value || 'UnknownTexture',
      type: textureNode.TextureType?.value || 'DiffuseColor',
      materialType: textureNode.MaterialType?.value,
      usage: textureNode.Usage?.value,
      uvSet: textureNode.UVSet?.value || 'UVMap',
      filepaths: {
        relative: videoNode?.RelativeFilename?.value,
        absolute: videoNode?.Filename?.value,
      },
    };

    this.log(`提取纹理元数据: ${JSON.stringify(metadata)}`);

    return metadata;
  }

  /**
   * 加载基础纹理
   */
  private loadBaseTexture (input: TextureParserInput, metadata: TextureMetadata): THREE.Texture {
    // 如果已有预加载的基础纹理，直接使用
    if (input.baseTexture) {
      this.log('使用预加载的基础纹理');

      return input.baseTexture.clone();
    }

    // 如果有视频节点，创建视频纹理
    if (input.videoNode && this.config.enableVideoTextures) {
      return this.loadVideoTexture(input.videoNode, metadata);
    }

    // 否则创建默认纹理
    this.log('创建默认纹理', 'warn');

    return this.createDefaultTexture(metadata);
  }

  /**
   * 加载视频纹理
   */
  private loadVideoTexture (videoNode: FBXVideoNode, metadata: TextureMetadata): THREE.Texture {
    this.log('创建视频纹理');

    // 创建视频元素
    const video = document.createElement('video');

    video.src = videoNode.RelativeFilename?.value || videoNode.Filename?.value || '';
    video.loop = this.config.videoLoop!;
    video.autoplay = this.config.videoAutoplay!;
    video.muted = true; // 浏览器要求静音才能自动播放

    // 创建视频纹理
    const videoTexture = new THREE.VideoTexture(video);

    videoTexture.name = metadata.name;
    videoTexture.colorSpace = this.config.colorSpace!;
    videoTexture.flipY = this.config.flipY!;

    // 视频加载完成后设置属性
    video.addEventListener('loadedmetadata', () => {
      this.log(`视频加载完成: ${video.videoWidth}x${video.videoHeight}`);
      videoTexture.needsUpdate = true;
    });

    // 错误处理
    video.addEventListener('error', error => {
      this.log(`视频加载失败: ${error}`, 'error');
    });

    return videoTexture;
  }

  /**
   * 创建默认纹理
   */
  private createDefaultTexture (metadata: TextureMetadata): THREE.Texture {
    const canvas = document.createElement('canvas');

    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext('2d')!;

    // 根据纹理类型创建不同的默认图案
    switch (metadata.type) {
      case 'NormalMap':
        this.createNormalMapPattern(context, canvas.width, canvas.height);

        break;
      case 'RoughnessMap':
        this.createRoughnessPattern(context, canvas.width, canvas.height);

        break;
      case 'MetallicMap':
        this.createMetallicPattern(context, canvas.width, canvas.height);

        break;
      case 'AOMap':
        this.createAOPattern(context, canvas.width, canvas.height);

        break;
      default:
        this.createDefaultPattern(context, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);

    texture.name = metadata.name;
    texture.colorSpace = this.config.colorSpace!;
    texture.flipY = this.config.flipY!;

    return texture;
  }

  /**
   * 创建默认图案
   */
  private createDefaultPattern (context: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = context.createLinearGradient(0, 0, width, height);

    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#e0e0e0');
    gradient.addColorStop(1, '#ffffff');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  /**
   * 创建法线贴图图案
   */
  private createNormalMapPattern (context: CanvasRenderingContext2D, width: number, height: number): void {
    // 法线贴图主要是蓝色调，表示Z轴朝前
    const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);

    gradient.addColorStop(0, '#8080ff'); // 浅蓝色
    gradient.addColorStop(1, '#6060ff'); // 深蓝色
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  /**
   * 创建粗糙度图案
   */
  private createRoughnessPattern (context: CanvasRenderingContext2D, width: number, height: number): void {
    // 粗糙度贴图使用灰度值
    const gradient = context.createLinearGradient(0, 0, width, height);

    gradient.addColorStop(0, '#666666'); // 中等粗糙度
    gradient.addColorStop(1, '#888888'); // 较高粗糙度
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  /**
   * 创建金属度图案
   */
  private createMetallicPattern (context: CanvasRenderingContext2D, width: number, height: number): void {
    // 金属度贴图通常为黑色（非金属）
    context.fillStyle = '#000000';
    context.fillRect(0, 0, width, height);
  }

  /**
   * 创建环境光遮蔽图案
   */
  private createAOPattern (context: CanvasRenderingContext2D, width: number, height: number): void {
    // AO贴图使用灰度，通常较亮表示较少遮蔽
    const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);

    gradient.addColorStop(0, '#cccccc');
    gradient.addColorStop(1, '#999999');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  /**
   * 应用纹理变换
   */
  private applyTextureTransform (texture: THREE.Texture, metadata: TextureMetadata): void {
    if (!metadata.transform) {return;}

    const { rotation, scaling, translation } = metadata.transform;

    // 应用旋转
    if (rotation && rotation !== 0) {
      texture.rotation = rotation * Math.PI / 180; // 转换为弧度
      texture.center = new THREE.Vector2(0.5, 0.5); // 设置旋转中心
    }

    // 应用缩放
    if (scaling && (scaling[0] !== 1 || scaling[1] !== 1)) {
      texture.repeat = new THREE.Vector2(scaling[0], scaling[1]);
    }

    // 应用平移
    if (translation && (translation[0] !== 0 || translation[1] !== 0)) {
      texture.offset = new THREE.Vector2(translation[0], translation[1]);
    }

    this.log(`应用纹理变换: rotation=${rotation}, scaling=${scaling}, translation=${translation}`);
  }

  /**
   * 应用纹理包装模式
   */
  private applyTextureWrapMode (texture: THREE.Texture, metadata: TextureMetadata): void {
    // 根据纹理类型设置包装模式
    switch (metadata.type) {
      case 'NormalMap':
      case 'RoughnessMap':
      case 'MetallicMap':
      case 'AOMap':
        // 这些贴图通常使用镜像或重复
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        break;
      default:
        // 漫反射贴图使用默认包装模式
        texture.wrapS = this.config.defaultWrapS!;
        texture.wrapT = this.config.defaultWrapT!;
    }

    this.log(`设置纹理包装模式: wrapS=${texture.wrapS}, wrapT=${texture.wrapT}`);
  }

  /**
   * 应用纹理过滤
   */
  private applyTextureFiltering (texture: THREE.Texture, metadata: TextureMetadata): void {
    // 生成 Mipmap
    texture.generateMipmaps = this.config.generateMipmaps!;

    // 根据纹理类型设置过滤模式
    switch (metadata.type) {
      case 'NormalMap':
        // 法线贴图不需要过滤
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        break;
      case 'RoughnessMap':
      case 'MetallicMap':
      case 'AOMap':
        // 线性数据贴图使用线性过滤
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;

        break;
      default:
        // 颜色贴图使用默认过滤模式
        texture.magFilter = this.config.magFilter!;
        texture.minFilter = this.config.minFilter!;
    }

    this.log(`设置纹理过滤: magFilter=${texture.magFilter}, minFilter=${texture.minFilter}`);
  }

  /**
   * 验证纹理节点
   */
  protected override validateInput (input: TextureParserInput): void {
    super.validateInput(input);

    if (!input.textureNode) {
      throw new Error('纹理节点不能为空');
    }

    if (input.textureNode.Type !== 'Texture') {
      throw new Error(`无效的纹理节点类型: ${input.textureNode.Type}`);
    }
  }

  /**
   * 获取配置
   */
  public getConfig (): TextureParserConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig (newConfig: Partial<TextureParserConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 同时更新图像解析器配置
    this.imageParser.updateConfig({
      generateMipmaps: this.config.generateMipmaps,
      magFilter: this.config.magFilter,
      minFilter: this.config.minFilter,
      wrapS: this.config.defaultWrapS,
      wrapT: this.config.defaultWrapT,
      colorSpace: this.config.colorSpace,
      flipY: this.config.flipY,
    });

    this.log('更新纹理解析器配置');
  }
}

/**
 * 纹理解析器工厂
 */
export class TextureParserFactory {
  private defaultConfig: TextureParserConfig;

  constructor (defaultConfig?: TextureParserConfig) {
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 创建纹理解析器实例
   */
  create (context: IParsingContext, config?: TextureParserConfig): TextureParser {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return new TextureParser(context, mergedConfig);
  }

  /**
   * 获取默认配置
   */
  public getDefaultConfig (): TextureParserConfig {
    return { ...this.defaultConfig };
  }
}
