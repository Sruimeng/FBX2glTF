/**
 * @file /types/parsers/material-parser.ts
 * @description 材质解析器类型定义
 */

import type * as THREE from 'three';
import type { FBXNode, FBXValue, FBXMaterialProperties } from '../core/fbx-types';

/**
 * FBX 材质节点接口
 */
export interface FBXMaterialNode extends FBXNode {
  /** 材质类型 */
  Type: 'Material';
  /** 版本 */
  Version: number;
  /** 材质名称 */
  MaterialName?: FBXValue<string>;
  /** 材质类型 (Lambert、Phong、Blinn等) */
  ShadingModel?: FBXValue<string>;
  /** 多边形绘制模式 */
  MultiLayer?: FBXValue<boolean>;
  /** 材质属性 */
  Properties?: Record<string, FBXMaterialProperties>;
}

/**
 * FBX 材质属性节点接口
 */
export interface FBXMaterialPropertyNode extends FBXNode {
  /** 属性类型 */
  Type: 'MaterialProperty';
  /** 版本 */
  Version: number;
  /** 属性名称 */
  PropertyName?: FBXValue<string>;
  /** 属性值 */
  PropertyValue?: FBXValue<any>;
  /** 属性类型 */
  PropertyType?: FBXValue<string>;
}

/**
 * FBX 纹理连接信息
 */
export interface FBXTextureConnection {
  /** 纹理节点ID */
  textureId: number;
  /** 连接类型 */
  connectionType: string;
  /** 属性名称 */
  propertyName: string;
  /** UV 坐标集 */
  uvSet?: string;
}

/**
 * 材质解析器输入接口
 */
export interface MaterialParserInput {
  /** FBX 材质节点 */
  materialNode: FBXMaterialNode;
  /** 节点ID */
  id: number;
  /** 关联的纹理连接 */
  textureConnections?: FBXTextureConnection[];
  /** 已解析的纹理映射 */
  textureMap?: Map<number, THREE.Texture>;
}

/**
 * 材质解析器输出接口
 */
export interface MaterialParserOutput {
  /** Three.js 材质对象 */
  material: THREE.Material;
  /** 材质名称 */
  name: string;
  /** 材质类型 */
  shadingModel: string;
  /** 材质属性 */
  properties: MaterialProperties;
  /** 关联的纹理 */
  textures: MaterialTextureMap;
  /** 是否为PBR材质 */
  isPBR: boolean;
}

/**
 * 材质属性接口
 */
export interface MaterialProperties {
  /** 漫反射颜色 */
  diffuseColor?: THREE.Color;
  /** 漫反射纹理 */
  diffuseMap?: THREE.Texture;
  /** 高光颜色 */
  specularColor?: THREE.Color;
  /** 高光强度 */
  shininess?: number;
  /** 高光纹理 */
  specularMap?: THREE.Texture;
  /** 自发光颜色 */
  emissiveColor?: THREE.Color;
  /** 自发光纹理 */
  emissiveMap?: THREE.Texture;
  /** 透明度 */
  opacity?: number;
  /** 透明度纹理 */
  alphaMap?: THREE.Texture;
  /** 法线纹理 */
  normalMap?: THREE.Texture;
  /** 粗糙度 */
  roughness?: number;
  /** 粗糙度纹理 */
  roughnessMap?: THREE.Texture;
  /** 金属度 */
  metallic?: number;
  /** 金属度纹理 */
  metallicMap?: THREE.Texture;
  /** 环境光遮蔽 */
  aoMap?: THREE.Texture;
  /** 反射度 */
  reflectivity?: number;
  /** 环境反射 */
  envMap?: THREE.Texture;
}

/**
 * 材质纹理映射接口
 */
export interface MaterialTextureMap {
  /** 漫反射纹理 */
  diffuse?: THREE.Texture;
  /** 高光纹理 */
  specular?: THREE.Texture;
  /** 自发光纹理 */
  emissive?: THREE.Texture;
  /** 透明度纹理 */
  alpha?: THREE.Texture;
  /** 法线纹理 */
  normal?: THREE.Texture;
  /** 粗糙度纹理 */
  roughness?: THREE.Texture;
  /** 金属度纹理 */
  metallic?: THREE.Texture;
  /** 环境光遮蔽纹理 */
  ao?: THREE.Texture;
  /** 环境反射纹理 */
  reflection?: THREE.Texture;
  /** 自定义纹理 */
  [key: string]: THREE.Texture | undefined;
}

/**
 * 材质元数据
 */
export interface MaterialMetadata {
  /** 材质名称 */
  name: string;
  /** 着色模型 */
  shadingModel: string;
  /** 是否为多层材质 */
  multiLayer: boolean;
  /** 关联的纹理数量 */
  textureCount: number;
  /** 是否为透明材质 */
  isTransparent: boolean;
  /** 是否为双面材质 */
  isDoubleSided: boolean;
}

/**
 * 材质解析器配置
 */
export interface MaterialParserConfig {
  /** 默认着色模型 */
  defaultShadingModel?: 'lambert' | 'phong' | 'blinn' | 'physical' | 'standard';
  /** 是否启用PBR转换 */
  enablePBRConversion?: boolean;
  /** 是否使用顶点颜色 */
  useVertexColors?: boolean;
  /** 透明度阈值 */
  alphaTest?: number;
  /** 法线贴图强度 */
  normalScale?: THREE.Vector2;
  /** 环境光遮蔽强度 */
  aoMapIntensity?: number;
  /** 粗糙度因子 */
  roughnessFactor?: number;
  /** 金属度因子 */
  metallicFactor?: number;
}