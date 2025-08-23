// 材质解析器（合并了Handler功能）
import type { TextureLoader, LoadingManager } from 'three';
import {
  Texture,
  MeshPhongMaterial,
  Color,
  RepeatWrapping,
  ClampToEdgeWrapping,
  MeshStandardMaterial,
} from 'three';
import type {
  FBXMaterialNode,
  FBXTextureNode,
  FBXVideoNode,
} from '../types';
import type {
  MaterialData,
  TextureData,
  MaterialParseResult,
} from '../types';
import type { ParseContext } from '../types';

export class MaterialParser {
  private context: ParseContext;
  private textureLoader: TextureLoader;
  private manager: LoadingManager;

  constructor (context: ParseContext, textureLoader: TextureLoader, manager: LoadingManager) {
    this.context = context;
    this.textureLoader = textureLoader;
    this.manager = manager;
  }

  // 解析材质
  parse (textures: Map<number, TextureData>): MaterialParseResult {
    const materials = new Map<number, MaterialData>();
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;

    if (!fbxTree || !connections) {
      throw new Error('FBXTree or connections is not defined');
    }

    const objects = fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }

    const materialNodes = objects.Material;

    if (materialNodes) {
      for (const nodeID in materialNodes) {
        const materialNode = materialNodes[nodeID];
        const materialData = this.parseMaterialNode(materialNode, textures);

        materials.set(parseInt(nodeID), {
          id: parseInt(nodeID),
          material: materialNode,
          threeMaterial: materialData,
          textures: this.parseMaterialTextures(parseInt(nodeID), textures),
        });
      }
    }

    return {
      materials,
      textures,
    };
  }

  // 解析材质节点
  private parseMaterialNode (materialNode: FBXMaterialNode, textures: Map<number, TextureData>): any {
    const materialData: any = {
      name: materialNode.name || materialNode.attrName || '',
    };

    // 解析基础颜色
    if (materialNode.DiffuseColor) {
      const diffuseColor = materialNode.DiffuseColor.value;

      materialData.color = new Color(diffuseColor[0], diffuseColor[1], diffuseColor[2]);
    }

    // 解析自发光
    if (materialNode.EmissiveColor) {
      const emissiveColor = materialNode.EmissiveColor.value;

      materialData.emissive = new Color(emissiveColor[0], emissiveColor[1], emissiveColor[2]);
    }

    // 解析镜面反射 (标准材质不直接支持specular，这里存储为userData)
    if (materialNode.SpecularColor) {
      const specularColor = materialNode.SpecularColor.value;

      (materialData).specular = new Color(specularColor[0], specularColor[1], specularColor[2]);
    }

    // 解析光泽度
    if (materialNode.Shininess) {
      const shininess = parseFloat(materialNode.Shininess.value.toString());

      materialData.roughness = 1 - (shininess / 100);
    }

    // 解析透明度
    if (materialNode.Opacity) {
      materialData.opacity = parseFloat(materialNode.Opacity.value.toString());
      materialData.transparent = materialData.opacity < 1;
    }

    // 解析反射率
    if (materialNode.ReflectionFactor) {
      materialData.reflectivity = parseFloat(materialNode.ReflectionFactor.value.toString());
    }

    // 解析着色模型
    const shadingModel = materialNode.ShadingModel?.value?.toString() || 'phong';

    // 根据着色模型创建材质
    if (shadingModel === 'phong') {
      return new MeshPhongMaterial(materialData);
    } else if (shadingModel === 'lambert') {
      return new MeshPhongMaterial({ ...materialData, shininess: 0 });
    } else {
      return new MeshStandardMaterial(materialData);
    }
  }

  // 解析材质纹理连接
  private parseMaterialTextures (materialId: number, textures: Map<number, TextureData>): Map<string, Texture> {
    const textureMap = new Map<string, Texture>();
    const connections = this.context.connections;

    const materialConnections = connections.get(materialId);

    if (!materialConnections) {return textureMap;}

    for (const connection of materialConnections.children) {
      const textureData = textures.get(connection.ID);

      if (textureData && textureData.threeTexture) {
        const textureType = this.getTextureType(connection.relationship?.toString() || '');

        textureMap.set(textureType, textureData.threeTexture);
      }
    }

    return textureMap;
  }

  // 获取纹理类型
  private getTextureType (relationship: string): string {
    switch (relationship) {
      case 'DiffuseColor':
        return 'map';
      case 'NormalMap':
        return 'normalMap';
      case 'Bump':
        return 'bumpMap';
      case 'SpecularColor':
        return 'specularMap';
      case 'EmissiveColor':
        return 'emissiveMap';
      case 'Reflection':
        return 'envMap';
      case 'TransparentColor':
        return 'alphaMap';
      default:
        return 'map';
    }
  }

  // 处理材质数据（原Handler功能）
  public processMaterial (materialData: MaterialData): MaterialData {
    const processedMaterial = { ...materialData };

    // 优化材质属性
    if (processedMaterial.threeMaterial) {
      this.optimizeMaterialProperties(processedMaterial.threeMaterial);
    }

    // 处理纹理
    if (processedMaterial.textures) {
      this.processMaterialTextures(processedMaterial);
    }

    return processedMaterial;
  }

  // 优化材质属性（原Handler功能）
  private optimizeMaterialProperties (material: any): void {
    // 标准化颜色值
    if (material.color) {
      material.color = new Color(material.color);
    }

    if (material.emissive) {
      material.emissive = new Color(material.emissive);
    }

    if (material.specular) {
      material.specular = new Color(material.specular);
    }

    // 标准化数值
    if (material.opacity !== undefined) {
      material.opacity = Math.max(0, Math.min(1, material.opacity));
      material.transparent = material.opacity < 1;
    }

    if (material.roughness !== undefined) {
      material.roughness = Math.max(0, Math.min(1, material.roughness));
    }

    if (material.metalness !== undefined) {
      material.metalness = Math.max(0, Math.min(1, material.metalness));
    }

    // 优化性能设置
    material.needsUpdate = true;
  }

  // 处理材质纹理（原Handler功能）
  private processMaterialTextures (materialData: MaterialData): void {
    if (!materialData.threeMaterial) {return;}

    const material = materialData.threeMaterial;

    // 为每种纹理类型应用优化
    for (const [textureType, texture] of materialData.textures) {
      this.optimizeTexture(texture, textureType);

      // 应用纹理到材质
      switch (textureType) {
        case 'map':
          material.map = texture;

          break;
        case 'normalMap':
          material.normalMap = texture;

          break;
        case 'bumpMap':
          material.bumpMap = texture;

          break;
        case 'specularMap':
          material.specularMap = texture;

          break;
        case 'emissiveMap':
          material.emissiveMap = texture;

          break;
        case 'roughnessMap':
          material.roughnessMap = texture;

          break;
        case 'metalnessMap':
          material.metalnessMap = texture;

          break;
        case 'alphaMap':
          material.alphaMap = texture;
          material.transparent = true;

          break;
        case 'envMap':
          material.envMap = texture;

          break;
      }
    }
  }

  // 优化纹理（原Handler功能）
  private optimizeTexture (texture: Texture, textureType: string): void {
    // 设置合适的包装模式
    if (textureType === 'normalMap' || textureType === 'bumpMap') {
      texture.wrapS = RepeatWrapping as any;
      texture.wrapT = RepeatWrapping as any;
    } else {
      texture.wrapS = ClampToEdgeWrapping as any;
      texture.wrapT = ClampToEdgeWrapping as any;
    }

    // 设置过滤模式
    texture.generateMipmaps = true;
    texture.minFilter = (textureType === 'normalMap' ? 9984 : 9986) as any;
    texture.magFilter = 9986 as any;

    texture.needsUpdate = true;
  }

  // 创建标准材质（原Handler功能）
  public createStandardMaterial (params: any): MeshStandardMaterial {
    return new MeshStandardMaterial(params);
  }

  // 创建Phong材质（原Handler功能）
  public createPhongMaterial (params: any): MeshPhongMaterial {
    return new MeshPhongMaterial(params);
  }

  // 转换材质类型（原Handler功能）
  public convertMaterialType (material: any, targetType: 'standard' | 'phong'): any {
    try {
      if (targetType === 'standard' && !(material instanceof MeshStandardMaterial)) {
        return this.convertToStandardMaterial(material);
      } else if (targetType === 'phong' && !(material instanceof MeshPhongMaterial)) {
        return this.convertToPhongMaterial(material);
      }
    } catch (error) {
      console.warn('Failed to convert material type:', error);
    }

    return material;
  }

  // 转换为标准材质（原Handler功能）
  private convertToStandardMaterial (material: any): MeshStandardMaterial {
    const params: any = {
      name: material.name,
      color: material.color,
      opacity: material.opacity,
      transparent: material.transparent,
      side: material.side,
    };

    // 转换Phong材质属性
    if (material instanceof MeshPhongMaterial) {
      params.roughness = 1 - (material.shininess / 100);
      params.metalness = 0;

      if (material.specular) {
        params.metalness = material.specular.getHex() > 0 ? 0.5 : 0;
      }
    }

    // 复制纹理
    const textureProperties = [
      'map', 'normalMap', 'bumpMap', 'specularMap',
      'emissiveMap', 'roughnessMap', 'metalnessMap', 'alphaMap',
    ];

    for (const prop of textureProperties) {
      if (material[prop]) {
        params[prop] = material[prop];
      }
    }

    return new MeshStandardMaterial(params);
  }

  // 转换为Phong材质（原Handler功能）
  private convertToPhongMaterial (material: any): MeshPhongMaterial {
    const params: any = {
      name: material.name,
      color: material.color,
      opacity: material.opacity,
      transparent: material.transparent,
      side: material.side,
    };

    // 转换标准材质属性
    if (material instanceof MeshStandardMaterial) {
      params.shininess = (1 - material.roughness) * 100;
      params.specular = new Color(0xffffff);

      if (material.metalness > 0) {
        params.specular.setHex(material.metalness > 0.5 ? 0x888888 : 0x444444);
      }
    }

    // 复制纹理
    const textureProperties = [
      'map', 'normalMap', 'bumpMap', 'specularMap',
      'emissiveMap', 'alphaMap',
    ];

    for (const prop of textureProperties) {
      if (material[prop]) {
        params[prop] = material[prop];
      }
    }

    return new MeshPhongMaterial(params);
  }

  // 验证材质（原Handler功能）
  public validateMaterial (material: any): boolean {
    if (!material) {
      console.warn('Material is null or undefined');

      return false;
    }

    if (!material.color) {
      console.warn('Material has no color');

      return false;
    }

    if (material.opacity !== undefined && (material.opacity < 0 || material.opacity > 1)) {
      console.warn('Material opacity is out of range [0, 1]');

      return false;
    }

    return true;
  }

  // 合并材质（原Handler功能）
  public mergeMaterials (materials: any[], name: string): any {
    if (materials.length === 0) {return null;}
    if (materials.length === 1) {return materials[0];}

    try {
      // 创建基础材质
      const baseMaterial = materials[0];
      const mergedParams: any = {
        name: name,
        color: baseMaterial.color ? new Color(baseMaterial.color) : new Color(0xffffff),
        opacity: baseMaterial.opacity || 1,
        transparent: baseMaterial.transparent || false,
      };

      // 合并属性
      for (const material of materials) {
        if (material.roughness !== undefined) {
          mergedParams.roughness = Math.max(mergedParams.roughness || 0, material.roughness);
        }

        if (material.metalness !== undefined) {
          mergedParams.metalness = Math.max(mergedParams.metalness || 0, material.metalness);
        }
      }

      // 使用最常用的材质类型
      const standardCount = materials.filter(m => m instanceof MeshStandardMaterial).length;
      const phongCount = materials.filter(m => m instanceof MeshPhongMaterial).length;

      if (standardCount >= phongCount) {
        return new MeshStandardMaterial(mergedParams);
      } else {
        return new MeshPhongMaterial(mergedParams);
      }
    } catch (error) {
      console.warn('Failed to merge materials:', error);

      return materials[0]; // 返回第一个材质作为后备
    }
  }
}

export class TextureParser {
  private context: ParseContext;
  private textureLoader: TextureLoader;
  private manager: LoadingManager;

  constructor (context: ParseContext, textureLoader: TextureLoader, manager: LoadingManager) {
    this.context = context;
    this.textureLoader = textureLoader;
    this.manager = manager;
  }

  // 解析纹理
  parse (images: Map<number, any>): Map<number, TextureData> {
    const textures = new Map<number, TextureData>();
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;

    if (!fbxTree || !connections) {
      throw new Error('FBXTree or connections is not defined');
    }

    const objects = fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }

    const textureNodes = objects.Texture;

    if (textureNodes) {
      for (const nodeID in textureNodes) {
        const textureNode = textureNodes[nodeID];
        const textureData = this.parseTextureNode(textureNode, images);

        textures.set(parseInt(nodeID), {
          id: parseInt(nodeID),
          texture: textureNode,
          image: textureData.image,
          threeTexture: textureData.texture,
        });
      }
    }

    return textures;
  }

  // 解析纹理节点
  private parseTextureNode (textureNode: FBXTextureNode, images: Map<number, any>): { image?: any, texture?: Texture } {
    const textureData: { image?: any, texture?: Texture } = {};

    // 查找关联的图像
    const connections = this.context.connections;
    const textureConnections = connections.get(textureNode.id || 0);

    if (textureConnections) {
      for (const connection of textureConnections.children) {
        const imageData = images.get(connection.ID);

        if (imageData) {
          textureData.image = imageData;

          break;
        }
      }
    }

    // 创建Three.js纹理
    if (textureData.image) {
      const texture = this.createTexture(textureNode, textureData.image);

      textureData.texture = texture;
    }

    return textureData;
  }

  // 创建纹理
  private createTexture (textureNode: FBXTextureNode, image: any): Texture {
    let texture: Texture;

    if (image instanceof HTMLImageElement) {
      texture = new Texture(image);
    } else if (image instanceof ArrayBuffer) {
      // 处理二进制图像数据
      const blob = new Blob([image]);
      const url = URL.createObjectURL(blob);

      texture = this.textureLoader.load(url);
    } else {
      // 默认创建空纹理
      texture = new Texture();
    }

    // 设置纹理属性
    if (textureNode.WrapModeU) {
      texture.wrapS = this.getWrapMode(textureNode.WrapModeU.value);
    }
    if (textureNode.WrapModeV) {
      texture.wrapT = this.getWrapMode(textureNode.WrapModeV.value);
    }

    texture.needsUpdate = true;

    return texture;
  }

  // 获取包装模式
  private getWrapMode (wrapMode: number): any {
    switch (wrapMode) {
      case 0:
        return RepeatWrapping;
      case 1:
        return ClampToEdgeWrapping;
      default:
        return RepeatWrapping;
    }
  }
}
/**
 * 负责与外部文件系统交互，解析FBX中的图像数据
 */
export class ImageParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  /**
   * 解析FBX图像数据
   * 处理FBXTree.Objects.Video中的嵌入图像数据
   * 这些图像通过FBXTree.Connections连接到FBXTree.Objects.Textures中的纹理
   *
   * @returns Map<number, string|Blob> - 图像ID到图像数据或文件名的映射
   */
  parse (): Map<number, string | Blob> {
    const images = new Map<number, string | Blob>();
    const blobs = new Map<string, string | Blob>();
    const fbxTree = this.context.fbxTree;

    if (!fbxTree || !fbxTree.Objects) {
      return images;
    }

    const videoNodes = fbxTree.Objects.Video;

    if (videoNodes) {
      for (const nodeID in videoNodes) {
        const videoNode = videoNodes[nodeID];
        const id = parseInt(nodeID);

        // 优先使用相对文件名，否则使用完整文件名
        const filename = videoNode.RelativeFilename || videoNode.Filename;

        if (!filename) {
          console.warn(`FBXLoader: Video node ${id} has no filename, skipping`);
          continue;
        }

        images.set(id, filename);

        // 检查是否有嵌入的二进制内容
        if ('Content' in videoNode) {
          const hasArrayBufferContent = videoNode.Content instanceof ArrayBuffer && videoNode.Content.byteLength > 0;
          const hasBase64Content = typeof videoNode.Content === 'string' && videoNode.Content !== '';

          if (hasArrayBufferContent || hasBase64Content) {
            const processedImage = this.parseVideoNode(videoNode);

            if (processedImage) {
              blobs.set(filename, processedImage);
            }
          }
        }
      }

      for (const [id, filename] of images) {
        const blobImage = blobs.get(filename as string);

        if (blobImage !== undefined) {
          images.set(id, blobImage);
        } else {
          // 如果没有嵌入内容，返回文件名的最后一部分（去掉路径）
          const cleanFilename = (filename as string).split('\\').pop();

          images.set(id, cleanFilename || filename as string);
        }
      }
    }

    return images;
  }

  /**
   * 解析嵌入的图像数据
   * 处理FBXTree.Video.Content中的二进制或Base64数据
   *
   * @param videoNode - FBX视频节点，包含图像内容
   * @returns 处理后的图像数据URL或null（如果处理失败）
   */
  private parseVideoNode (videoNode: FBXVideoNode): string | null {
    const content = videoNode.Content;
    const fileName = videoNode.RelativeFilename || videoNode.Filename;

    if (!fileName || !content) {
      console.warn(`FBXLoader: Video node missing filename or content for ${fileName || 'unknown'}`);

      return null;
    }

    const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
    let mimeType: string | null = null;

    // 根据文件扩展名确定MIME类型
    switch (extension) {
      case 'bmp':
        mimeType = 'image/bmp';

        break;
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';

        break;
      case 'png':
        mimeType = 'image/png';

        break;
      case 'tif':
        mimeType = 'image/tiff';

        break;
      case 'tga':
        mimeType = 'image/tga';

        break;
      case 'webp':
        mimeType = 'image/webp';

        break;
      default:
        console.warn('FBXLoader: Image type "' + extension + '" is not supported.');

        return null;
    }

    // 处理Base64字符串格式内容
    if (content instanceof String) {
      if (!content.trim()) {
        console.warn(`FBXLoader: Empty Base64 content for ${fileName}`);

        return null;
      }

      return `data:${mimeType};base64,${content}`;
      // 处理ArrayBuffer二进制格式内容
    } else if (content instanceof ArrayBuffer) {
      if (content.byteLength === 0) {
        console.warn(`FBXLoader: Empty ArrayBuffer content for ${fileName}`);

        return null;
      }
      try {
        const array = new Uint8Array(content);

        return URL.createObjectURL(new Blob([array], { type: mimeType }));
      } catch (error) {
        console.warn(`FBXLoader: Failed to create Blob for ${fileName}:`, error);

        return null;
      }
    }

    console.warn(`FBXLoader: Unsupported content type for ${fileName}`);

    return null;
  }
}
