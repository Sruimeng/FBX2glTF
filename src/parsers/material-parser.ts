/**
 * @file /parsers/material-parser.ts
 * @description 材质解析器实现
 */

import * as THREE from 'three';
import type {
  IParsingContext,
  IParser,
  BaseParser,
  ParserMetadata
} from '../types/core';
import type {
  MaterialParserInput,
  MaterialParserOutput,
  MaterialProperties,
  MaterialTextureMap,
  MaterialMetadata,
  MaterialParserConfig
} from '../types/parsers/material-parser';
import type {
  FBXMaterialNode,
  FBXMaterialPropertyNode,
  FBXTextureConnection
} from '../types/parsers/material-parser';
import { TextureParser } from './texture-parser';

/**
 * FBX 材质着色模型枚举
 */
enum FBXShadingModel {
  LAMBERT = 'Lambert',
  PHONG = 'Phong',
  BLINN = 'Blinn',
  CONSTANT = 'Constant',
  UNKNOWN = 'Unknown'
}

/**
 * 材质解析器
 * 负责解析 FBX 材质节点并生成 Three.js 材质对象
 */
export class MaterialParser extends BaseParser<MaterialParserInput, MaterialParserOutput> {
  private config: MaterialParserConfig;
  private textureParser: TextureParser;

  constructor(context: IParsingContext, config?: MaterialParserConfig) {
    super(context, {
      name: 'MaterialParser',
      version: '1.0.0',
      description: '解析 FBX 材质节点为 Three.js 材质',
      dependencies: ['THREE', 'TextureParser']
    });

    this.config = {
      defaultShadingModel: 'standard',
      enablePBRConversion: true,
      useVertexColors: false,
      alphaTest: 0.1,
      normalScale: new THREE.Vector2(1, 1),
      aoMapIntensity: 1.0,
      roughnessFactor: 1.0,
      metallicFactor: 0.0,
      ...config
    };

    this.textureParser = new TextureParser(context);
  }

  /**
   * 解析材质节点
   */
  parse(input: MaterialParserInput, context: IParsingContext): MaterialParserOutput {
    const { materialNode, id, textureConnections, textureMap } = input;

    this.log(`开始解析材质节点: ${materialNode.MaterialName?.value || `Material_${id}`}`);

    try {
      // 提取材质元数据
      const metadata = this.extractMaterialMetadata(materialNode);

      // 解析材质属性
      const materialProperties = this.parseMaterialProperties(materialNode);

      // 解析纹理连接
      const textures = this.parseTextureConnections(textureConnections || [], textureMap || new Map());

      // 创建 Three.js 材质
      const material = this.createThreeMaterial(metadata, materialProperties, textures);

      // 应用纹理到材质
      this.applyTexturesToMaterial(material, textures, materialProperties);

      const output: MaterialParserOutput = {
        material,
        name: materialNode.MaterialName?.value || `Material_${id}`,
        shadingModel: metadata.shadingModel,
        properties: materialProperties,
        textures,
        isPBR: material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
      };

      this.log(`成功解析材质: ${output.name} (${output.shadingModel})`);
      return output;

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * 提取材质元数据
   */
  private extractMaterialMetadata(materialNode: FBXMaterialNode): MaterialMetadata {
    const shadingModel = materialNode.ShadingModel?.value || FBXShadingModel.LAMBERT;
    const multiLayer = materialNode.MultiLayer?.value || false;

    const metadata: MaterialMetadata = {
      name: materialNode.MaterialName?.value || 'UnknownMaterial',
      shadingModel: shadingModel as string,
      multiLayer: multiLayer,
      textureCount: 0, // 将在后续步骤中计算
      isTransparent: false, // 将在后续步骤中确定
      isDoubleSided: false // 将在后续步骤中确定
    };

    this.log(`提取材质元数据: ${JSON.stringify(metadata)}`);
    return metadata;
  }

  /**
   * 解析材质属性
   */
  private parseMaterialProperties(materialNode: FBXMaterialNode): MaterialProperties {
    const properties: MaterialProperties = {};
    const materialProperties = materialNode.Properties;

    if (!materialProperties) {
      this.log('材质节点没有属性，使用默认值', 'warn');
      return properties;
    }

    // 解析漫反射颜色
    if (materialProperties.DiffuseColor) {
      const diffuseColor = this.parseColorValue(materialProperties.DiffuseColor);
      if (diffuseColor) {
        properties.diffuseColor = diffuseColor;
      }
    }

    // 解析高光颜色
    if (materialProperties.SpecularColor) {
      const specularColor = this.parseColorValue(materialProperties.SpecularColor);
      if (specularColor) {
        properties.specularColor = specularColor;
      }
    }

    // 解析高光强度
    if (materialProperties.Shininess) {
      const shininess = this.parseNumericValue(materialProperties.Shininess);
      if (shininess !== undefined) {
        properties.shininess = shininess;
      }
    }

    // 解析自发光颜色
    if (materialProperties.EmissiveColor) {
      const emissiveColor = this.parseColorValue(materialProperties.EmissiveColor);
      if (emissiveColor) {
        properties.emissiveColor = emissiveColor;
      }
    }

    // 解析透明度
    if (materialProperties.Transparency) {
      const transparency = this.parseNumericValue(materialProperties.Transparency);
      if (transparency !== undefined) {
        properties.opacity = 1.0 - transparency; // FBX 透明度与 Three.js 不透明度相反
      }
    }

    // 解析反射度
    if (materialProperties.Reflectivity) {
      const reflectivity = this.parseNumericValue(materialProperties.Reflectivity);
      if (reflectivity !== undefined) {
        properties.reflectivity = reflectivity;
      }
    }

    this.log(`解析材质属性: ${JSON.stringify(properties)}`);
    return properties;
  }

  /**
   * 解析纹理连接
   */
  private parseTextureConnections(
    connections: FBXTextureConnection[],
    textureMap: Map<number, THREE.Texture>
  ): MaterialTextureMap {
    const textures: MaterialTextureMap = {};

    connections.forEach(connection => {
      const texture = textureMap.get(connection.textureId);
      if (!texture) {
        this.log(`纹理 ID ${connection.textureId} 未找到对应的纹理`, 'warn');
        return;
      }

      // 根据属性名称映射到不同的纹理槽位
      switch (connection.propertyName.toLowerCase()) {
        case 'diffusecolor':
        case 'basecolor':
          textures.diffuse = texture;
          break;
        case 'specularcolor':
        case 'specular':
          textures.specular = texture;
          break;
        case 'emissivecolor':
        case 'emissive':
          textures.emissive = texture;
          break;
        case 'transparency':
        case 'alpha':
        case 'opacity':
          textures.alpha = texture;
          break;
        case 'normalmap':
        case 'normal':
          textures.normal = texture;
          break;
        case 'roughness':
          textures.roughness = texture;
          break;
        case 'metallic':
          textures.metallic = texture;
          break;
        case 'ambientocclusion':
        case 'ao':
          textures.ao = texture;
          break;
        case 'reflectioncolor':
        case 'reflection':
          textures.reflection = texture;
          break;
        default:
          // 对于未知属性，使用属性名作为键
          textures[connection.propertyName] = texture;
          this.log(`未知纹理属性: ${connection.propertyName}`, 'warn');
      }
    });

    this.log(`解析纹理连接: ${Object.keys(textures).length} 个纹理`);
    return textures;
  }

  /**
   * 创建 Three.js 材质
   */
  private createThreeMaterial(
    metadata: MaterialMetadata,
    properties: MaterialProperties,
    textures: MaterialTextureMap
  ): THREE.Material {
    let material: THREE.Material;

    // 根据着色模型和 PBR 转换设置选择材质类型
    if (this.config.enablePBRConversion || metadata.shadingModel === 'physical' || metadata.shadingModel === 'standard') {
      // 创建 PBR 材质
      material = this.createPBRMaterial(metadata, properties, textures);
    } else {
      // 创建传统材质
      material = this.createTraditionalMaterial(metadata, properties, textures);
    }

    // 设置材质基本属性
    material.name = metadata.name;
    material.transparent = this.isMaterialTransparent(properties, textures);
    material.alphaTest = this.config.alphaTest;

    // 检查是否需要双面渲染
    if (this.shouldBeDoubleSided(properties, textures)) {
      material.side = THREE.DoubleSide;
      metadata.isDoubleSided = true;
    }

    return material;
  }

  /**
   * 创建 PBR 材质
   */
  private createPBRMaterial(
    metadata: MaterialMetadata,
    properties: MaterialProperties,
    textures: MaterialTextureMap
  ): THREE.Material {
    // 判断是否需要物理材质
    const needsPhysicalMaterial = textures.roughness || textures.metallic ||
      properties.roughness !== undefined || properties.metallic !== undefined;

    const material = needsPhysicalMaterial
      ? new THREE.MeshPhysicalMaterial()
      : new THREE.MeshStandardMaterial();

    // 设置基础颜色
    if (properties.diffuseColor) {
      material.color = properties.diffuseColor;
    }

    // 设置粗糙度
    if (properties.roughness !== undefined) {
      material.roughness = properties.roughness;
    } else {
      material.roughness = this.config.roughnessFactor!;
    }

    // 设置金属度
    if (properties.metallic !== undefined) {
      material.metallic = properties.metallic;
    } else {
      material.metallic = this.config.metallicFactor!;
    }

    // 设置自发光
    if (properties.emissiveColor) {
      material.emissive = properties.emissiveColor;
    }

    // 设置透明度
    if (properties.opacity !== undefined) {
      material.opacity = properties.opacity;
    }

    // 如果是物理材质，设置额外属性
    if (material instanceof THREE.MeshPhysicalMaterial) {
      if (properties.reflectivity !== undefined) {
        material.reflectivity = properties.reflectivity;
      }
    }

    this.log(`创建 PBR 材质: ${needsPhysicalMaterial ? 'Physical' : 'Standard'}`);
    return material;
  }

  /**
   * 创建传统材质
   */
  private createTraditionalMaterial(
    metadata: MaterialMetadata,
    properties: MaterialProperties,
    textures: MaterialTextureMap
  ): THREE.Material {
    let material: THREE.Material;

    // 根据着色模型选择材质类型
    switch (metadata.shadingModel.toLowerCase()) {
      case FBXShadingModel.PHONG.toLowerCase():
        material = new THREE.MeshPhongMaterial();
        break;
      case FBXShadingModel.BLINN.toLowerCase():
        material = new THREE.MeshPhongMaterial(); // Three.js 没有 Blinn 材质，使用 Phong 代替
        break;
      case FBXShadingModel.CONSTANT.toLowerCase():
        material = new THREE.MeshBasicMaterial();
        break;
      case FBXShadingModel.LAMBERT.toLowerCase():
      default:
        material = new THREE.MeshLambertMaterial();
        break;
    }

    // 设置基础颜色
    if (properties.diffuseColor) {
      (material as any).color = properties.diffuseColor;
    }

    // 设置高光相关属性（仅适用于 Phong 材质）
    if (material instanceof THREE.MeshPhongMaterial) {
      if (properties.specularColor) {
        material.specular = properties.specularColor;
      }
      if (properties.shininess !== undefined) {
        material.shininess = properties.shininess;
      }
    }

    // 设置自发光
    if (properties.emissiveColor) {
      (material as any).emissive = properties.emissiveColor;
    }

    // 设置透明度
    if (properties.opacity !== undefined) {
      material.opacity = properties.opacity;
    }

    this.log(`创建传统材质: ${metadata.shadingModel}`);
    return material;
  }

  /**
   * 应用纹理到材质
   */
  private applyTexturesToMaterial(
    material: THREE.Material,
    textures: MaterialTextureMap,
    properties: MaterialProperties
  ): void {
    // 应用漫反射纹理
    if (textures.diffuse) {
      this.applyTextureToProperty(material, 'map', textures.diffuse);
    }

    // 应用法线贴图
    if (textures.normal) {
      this.applyTextureToProperty(material, 'normalMap', textures.normal);
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
        material.normalScale = this.config.normalScale!;
      }
    }

    // 应用粗糙度贴图（仅 PBR 材质）
    if (textures.roughness && material instanceof THREE.MeshStandardMaterial) {
      this.applyTextureToProperty(material, 'roughnessMap', textures.roughness);
    }

    // 应用金属度贴图（仅 PBR 材质）
    if (textures.metallic && material instanceof THREE.MeshStandardMaterial) {
      this.applyTextureToProperty(material, 'metalnessMap', textures.metallic);
    }

    // 应用环境光遮蔽贴图
    if (textures.ao) {
      this.applyTextureToProperty(material, 'aoMap', textures.ao);
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
        material.aoMapIntensity = this.config.aoMapIntensity!;
      }
    }

    // 应用高光贴图（仅 Phong 材质）
    if (textures.specular && material instanceof THREE.MeshPhongMaterial) {
      this.applyTextureToProperty(material, 'specularMap', textures.specular);
    }

    // 应用自发光贴图
    if (textures.emissive) {
      this.applyTextureToProperty(material, 'emissiveMap', textures.emissive);
    }

    // 应用透明度贴图
    if (textures.alpha) {
      this.applyTextureToProperty(material, 'alphaMap', textures.alpha);
    }

    // 应用反射贴图
    if (textures.reflection && material instanceof THREE.MeshPhysicalMaterial) {
      this.applyTextureToProperty(material, 'envMap', textures.reflection);
    }

    this.log(`应用纹理到材质: ${Object.keys(textures).length} 个纹理`);
  }

  /**
   * 应用纹理到材质属性
   */
  private applyTextureToProperty(material: THREE.Material, property: string, texture: THREE.Texture): void {
    (material as any)[property] = texture;
    texture.needsUpdate = true;
  }

  /**
   * 解析颜色值
   */
  private parseColorValue(colorValue: any): THREE.Color | undefined {
    if (!colorValue) return undefined;

    // 处理不同的颜色值格式
    if (typeof colorValue === 'object' && colorValue.value) {
      const colorArray = colorValue.value;
      if (Array.isArray(colorArray) && colorArray.length >= 3) {
        return new THREE.Color(colorArray[0], colorArray[1], colorArray[2]);
      }
    }

    if (Array.isArray(colorValue) && colorValue.length >= 3) {
      return new THREE.Color(colorValue[0], colorValue[1], colorValue[2]);
    }

    this.log(`无法解析颜色值: ${JSON.stringify(colorValue)}`, 'warn');
    return undefined;
  }

  /**
   * 解析数值
   */
  private parseNumericValue(numericValue: any): number | undefined {
    if (numericValue === undefined || numericValue === null) return undefined;

    if (typeof numericValue === 'object' && numericValue.value !== undefined) {
      return parseFloat(numericValue.value);
    }

    if (typeof numericValue === 'number') {
      return numericValue;
    }

    if (typeof numericValue === 'string') {
      const parsed = parseFloat(numericValue);
      return isNaN(parsed) ? undefined : parsed;
    }

    this.log(`无法解析数值: ${JSON.stringify(numericValue)}`, 'warn');
    return undefined;
  }

  /**
   * 判断材质是否透明
   */
  private isMaterialTransparent(properties: MaterialProperties, textures: MaterialTextureMap): boolean {
    // 检查透明度属性
    if (properties.opacity !== undefined && properties.opacity < 1.0) {
      return true;
    }

    // 检查透明度纹理
    if (textures.alpha) {
      return true;
    }

    // 检查漫反射纹理是否包含透明通道
    if (textures.diffuse && textures.diffuse.format === THREE.RGBAFormat) {
      return true;
    }

    return false;
  }

  /**
   * 判断材质是否应该双面渲染
   */
  private shouldBeDoubleSided(properties: MaterialProperties, textures: MaterialTextureMap): boolean {
    // 如果材质是透明的，通常需要双面渲染
    return this.isMaterialTransparent(properties, textures);
  }

  /**
   * 验证材质节点
   */
  protected validateInput(input: MaterialParserInput): void {
    super.validateInput(input);

    if (!input.materialNode) {
      throw new Error('材质节点不能为空');
    }

    if (input.materialNode.Type !== 'Material') {
      throw new Error(`无效的材质节点类型: ${input.materialNode.Type}`);
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): MaterialParserConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<MaterialParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('更新材质解析器配置');
  }
}

/**
 * 材质解析器工厂
 */
export class MaterialParserFactory {
  private defaultConfig: MaterialParserConfig;

  constructor(defaultConfig?: MaterialParserConfig) {
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 创建材质解析器实例
   */
  create(context: IParsingContext, config?: MaterialParserConfig): MaterialParser {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return new MaterialParser(context, mergedConfig);
  }

  /**
   * 获取默认配置
   */
  public getDefaultConfig(): MaterialParserConfig {
    return { ...this.defaultConfig };
  }
}