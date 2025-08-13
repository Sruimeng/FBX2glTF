// 材质解析器
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
} from '../../constants';
import type {
  MaterialData,
  TextureData,
  MaterialParseResult,
  FBXMeshStandardMaterialParameters,
} from '../types';
import type { ParseContext } from '../types/common';

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
          textures: new Map(),
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
    const materialData: FBXMeshStandardMaterialParameters = {
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

      (materialData as any).specular = new Color(specularColor[0], specularColor[1], specularColor[2]);
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

export class ImageParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  // 解析图像
  parse (): Map<number, any> {
    const images = new Map<number, any>();
    const fbxTree = this.context.fbxTree;

    if (!fbxTree) {
      throw new Error('FBXTree is not defined');
    }

    const objects = fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }

    const videoNodes = objects.Video;

    if (videoNodes) {
      for (const nodeID in videoNodes) {
        const videoNode = videoNodes[nodeID];
        const imageData = this.parseVideoNode(videoNode);

        if (imageData) {
          images.set(parseInt(nodeID), imageData);
        }
      }
    }

    return images;
  }

  // 解析视频节点
  private parseVideoNode (videoNode: FBXVideoNode): any {
    if (videoNode.Content) {
      // 如果有二进制内容
      return videoNode.Content;
    } else if (videoNode.RelativeFilename) {
      // 如果有相对文件名，返回文件名供外部加载
      return videoNode.RelativeFilename;
    } else if (videoNode.Filename) {
      // 如果有完整文件名
      return videoNode.Filename;
    }

    return null;
  }
}