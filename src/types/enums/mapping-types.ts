/**
 * @file /types/enums/mapping-types.ts
 * @description FBX 映射类型枚举定义
 */

/**
 * 映射信息类型枚举
 * 定义了 FBX 中顶点、面等数据的映射方式
 */
export enum MappingInformationType {
  /** 按顶点映射 */
  ByVertice = 'ByVertice',

  /** 按多边形映射 */
  ByPolygon = 'ByPolygon',

  /** 按多边形顶点映射 */
  ByPolygonVertex = 'ByPolygonVertex',

  /** 所有元素使用相同值 */
  AllSame = 'AllSame',

  /** 无映射信息 */
  NoMappingInformation = 'NoMappingInformation'
}

/**
 * 引用信息类型枚举
 * 定义了数据索引的使用方式
 */
export enum ReferenceInformationType {
  /** 直接引用数据 */
  Direct = 'Direct',

  /** 索引引用数据 */
  Index = 'Index',

  /** 索引到直接引用 */
  IndexToDirect = 'IndexToDirect'
}

/**
 * 纹理坐标映射类型
 */
export enum UVMappingType {
  /** UV 映射 */
  UV = 'UV',

  /** 法线贴图映射 */
  NormalMap = 'NormalMap',

  /** 环境光遮蔽映射 */
  AmbientOcclusion = 'AmbientOcclusion',

  /** 粗糙度映射 */
  Roughness = 'Roughness',

  /** 金属度映射 */
  Metallic = 'Metallic',

  /** 高度映射 */
  Height = 'Height'
}

/**
 * 颜色映射类型
 */
export enum ColorMappingType {
  /** 顶点颜色 */
  VertexColor = 'VertexColor',

  /** 面颜色 */
  FaceColor = 'FaceColor',

  /** 多边形颜色 */
  PolygonColor = 'PolygonColor',

  /** 无颜色 */
  NoColor = 'NoColor'
}

/**
 * 法线映射类型
 */
export enum NormalMappingType {
  /** 顶点法线 */
  VertexNormal = 'VertexNormal',

  /** 面法线 */
  FaceNormal = 'FaceNormal',

  /** 多边形法线 */
  PolygonNormal = 'PolygonNormal',

  /** 无法线 */
  NoNormal = 'NoNormal'
}
