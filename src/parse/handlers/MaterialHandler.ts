// 材质处理器
import type {
  Texture,
  MinificationTextureFilter,
  MagnificationTextureFilter,
  Wrapping,
} from 'three';
import {
  MeshStandardMaterial,
  MeshPhongMaterial,
  Color,
  RepeatWrapping,
  ClampToEdgeWrapping,
} from 'three';
import type { MaterialData, TextureData } from '../types';

export class MaterialHandler {
  // 处理材质数据
  static processMaterial (materialData: MaterialData): MaterialData {
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

  // 优化材质属性
  private static optimizeMaterialProperties (material: any): void {
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

  // 处理材质纹理
  private static processMaterialTextures (materialData: MaterialData): void {
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

  // 优化纹理
  private static optimizeTexture (texture: Texture, textureType: string): void {
    // 设置合适的包装模式
    if (textureType === 'normalMap' || textureType === 'bumpMap') {
      texture.wrapS = RepeatWrapping as Wrapping;
      texture.wrapT = RepeatWrapping as Wrapping;
    } else {
      texture.wrapS = ClampToEdgeWrapping as Wrapping;
      texture.wrapT = ClampToEdgeWrapping as Wrapping;
    }

    // 设置过滤模式
    texture.generateMipmaps = true;
    texture.minFilter = (textureType === 'normalMap' ? 9984 : 9986) as MinificationTextureFilter;
    texture.magFilter = 9986 as MagnificationTextureFilter;

    texture.needsUpdate = true;
  }

  // 创建标准材质
  static createStandardMaterial (params: any): MeshStandardMaterial {
    return new MeshStandardMaterial(params);
  }

  // 创建Phong材质
  static createPhongMaterial (params: any): MeshPhongMaterial {
    return new MeshPhongMaterial(params);
  }

  // 转换材质类型
  static convertMaterialType (material: any, targetType: 'standard' | 'phong'): any {
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

  // 转换为标准材质
  private static convertToStandardMaterial (material: any): MeshStandardMaterial {
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

  // 转换为Phong材质
  private static convertToPhongMaterial (material: any): MeshPhongMaterial {
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

  // 验证材质
  static validateMaterial (material: any): boolean {
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

  // 合并材质
  static mergeMaterials (materials: any[], name: string): any {
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