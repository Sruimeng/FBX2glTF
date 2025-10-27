/**
 * @file /parsers/image-parser.ts
 * @description 图像解析器实现
 */

import * as THREE from 'three';
import type {
  IParsingContext,
} from '../types/core';
import { AsyncBaseParser } from '../types/core';
import type {
  ImageParserInput,
  ImageParserOutput,
  ImageMetadata,
  ImageParserConfig,
} from '../types/parsers/image-parser';
import type { FBXImageNode } from '../types/parsers/image-parser';

/**
 * 图像解析器
 * 负责解析 FBX 中的图像节点并生成 Three.js 纹理对象
 */
export class ImageParser extends AsyncBaseParser<ImageParserInput, ImageParserOutput> {
  private config: ImageParserConfig;

  constructor (context: IParsingContext, config?: ImageParserConfig) {
    super(context, {
      name: 'ImageParser',
      version: '1.0.0',
      description: '解析 FBX 图像节点为 Three.js 纹理',
      dependencies: ['THREE'],
    });

    this.config = {
      generateMipmaps: true,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearMipmapLinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      colorSpace: THREE.SRGBColorSpace,
      flipY: true,
      timeout: 10000,
      useCache: true,
      ...config,
    };
  }

  /**
   * 解析图像节点
   */
  override async parse (input: ImageParserInput, context: IParsingContext): Promise<ImageParserOutput> {
    const { imageNode, id } = input;

    this.log(`开始解析图像节点: ${imageNode.name || `Image_${id}`}`);

    try {
      // 提取图像元数据
      const metadata = this.extractImageMetadata(imageNode);

      // 加载图像
      const texture = await this.loadImage(metadata);

      // 配置纹理
      this.configureTexture(texture, metadata);

      const output: ImageParserOutput = {
        texture,
        name: imageNode.TextureName?.value || `Image_${id}`,
        size: metadata.width && metadata.height ? {
          width: metadata.width,
          height: metadata.height,
        } : undefined,
        format: metadata.format,
        isVideo: metadata.isVideo,
      };

      this.log(`成功解析图像: ${output.name}`);

      return output;

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 提取图像元数据
   */
  private extractImageMetadata (imageNode: FBXImageNode): ImageMetadata {
    const metadata: ImageMetadata = {
      filename: imageNode.Filename?.value,
      relativeFilename: imageNode.RelativeFilename?.value,
      width: imageNode.Width?.value,
      height: imageNode.Height?.value,
      format: imageNode.ImageFormat?.value,
      isVideo: imageNode.Type === 'Video',
    };

    this.log(`提取图像元数据: ${JSON.stringify(metadata)}`);

    return metadata;
  }

  /**
   * 加载图像
   */
  private async loadImage (metadata: ImageMetadata): Promise<THREE.Texture> {
    // 如果有 Base64 内容，直接加载
    if (metadata.format && metadata.filename?.startsWith('data:')) {
      return this.loadBase64Image(metadata);
    }

    // 否则从文件路径加载
    if (metadata.relativeFilename || metadata.filename) {
      return this.loadImageFromFile(metadata);
    }

    throw new Error('无法确定图像源：既没有 Base64 内容也没有文件路径');
  }

  /**
   * 从 Base64 内容加载图像
   */
  private async loadBase64Image (metadata: ImageMetadata): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      const imageSrc = metadata.filename!;

      // 检查缓存
      if (this.config.useCache) {
        const cached = this.context.getCacheValue(`texture_${imageSrc}`);

        if (cached) {
          this.log('使用缓存的纹理');
          resolve(cached.clone());

          return;
        }
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`图像加载超时: ${imageSrc}`));
      }, this.config.timeout);

      loader.load(
        imageSrc,
        texture => {
          clearTimeout(timeoutId);
          this.log(`成功加载 Base64 图像: ${metadata.format}`);

          if (this.config.useCache) {
            this.context.setCacheValue(`texture_${imageSrc}`, texture);
          }

          resolve(texture);
        },
        progress => {
          this.log(`Base64 图像加载进度: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        error => {
          clearTimeout(timeoutId);
          this.log(`Base64 图像加载失败: ${(error as Error).message}`, 'error');
          reject(error);
        }
      );
    });
  }

  /**
   * 从文件路径加载图像
   */
  private async loadImageFromFile (metadata: ImageMetadata): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      const imagePath = metadata.relativeFilename || metadata.filename!;

      // 检查缓存
      if (this.config.useCache) {
        const cached = this.context.getCacheValue(`texture_${imagePath}`);

        if (cached) {
          this.log('使用缓存的纹理');
          resolve(cached.clone());

          return;
        }
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`图像加载超时: ${imagePath}`));
      }, this.config.timeout);

      loader.load(
        imagePath,
        texture => {
          clearTimeout(timeoutId);
          this.log(`成功加载图像文件: ${imagePath}`);

          if (this.config.useCache) {
            this.context.setCacheValue(`texture_${imagePath}`, texture);
          }

          resolve(texture);
        },
        progress => {
          if (progress.total > 0) {
            this.log(`图像加载进度: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
          }
        },
        error => {
          clearTimeout(timeoutId);
          this.log(`图像加载失败: ${(error as Error).message}`, 'error');

          // 尝试创建默认纹理
          const defaultTexture = this.createDefaultTexture();

          resolve(defaultTexture);
        }
      );
    });
  }

  /**
   * 创建默认纹理
   */
  private createDefaultTexture (): THREE.Texture {
    this.log('创建默认纹理', 'warn');

    const canvas = document.createElement('canvas');

    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext('2d')!;

    // 创建棋盘格图案
    const size = 16;

    for (let i = 0; i < canvas.width; i += size) {
      for (let j = 0; j < canvas.height; j += size) {
        context.fillStyle = ((i / size) + (j / size)) % 2 === 0 ? '#ffffff' : '#cccccc';
        context.fillRect(i, j, size, size);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);

    texture.name = 'DefaultTexture';

    return texture;
  }

  /**
   * 配置纹理属性
   */
  private configureTexture (texture: THREE.Texture, metadata: ImageMetadata): void {
    // 设置纹理名称
    texture.name = metadata.filename || 'UnknownTexture';

    // 设置过滤模式
    texture.magFilter = this.config.magFilter!;
    texture.minFilter = this.config.minFilter!;

    // 设置包装模式
    texture.wrapS = this.config.wrapS!;
    texture.wrapT = this.config.wrapT!;

    // 设置颜色空间
    texture.colorSpace = this.config.colorSpace!;

    // 设置翻转
    texture.flipY = this.config.flipY!;

    // 生成 Mipmap
    if (this.config.generateMipmaps) {
      texture.generateMipmaps = true;
    }

    // 更新纹理
    texture.needsUpdate = true;

    this.log(`配置纹理属性: ${texture.name}`);
  }

  /**
   * 验证图像节点
   */
  protected override validateInput (input: ImageParserInput): void {
    super.validateInput(input);

    if (!input.imageNode) {
      throw new Error('图像节点不能为空');
    }

    if (!input.imageNode.Type || input.imageNode.Type !== 'Texture' && input.imageNode.Type !== 'Video') {
      throw new Error(`无效的图像节点类型: ${input.imageNode.Type}`);
    }
  }

  /**
   * 获取配置
   */
  public getConfig (): ImageParserConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig (newConfig: Partial<ImageParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('更新图像解析器配置');
  }
}

/**
 * 图像解析器工厂
 */
export class ImageParserFactory {
  private defaultConfig: ImageParserConfig;

  constructor (defaultConfig?: ImageParserConfig) {
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 创建图像解析器实例
   */
  create (context: IParsingContext, config?: ImageParserConfig): ImageParser {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return new ImageParser(context, mergedConfig);
  }

  /**
   * 获取默认配置
   */
  public getDefaultConfig (): ImageParserConfig {
    return { ...this.defaultConfig };
  }
}
