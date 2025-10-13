/**
 * @file /types/enums.ts
 * @description 所有 FBX 相关枚举类型
 */

/** 剔除类型 */
export enum CullingType {
  CullingOff = 'CullingOff',
  CullingOn = 'CullingOn',
}

/** 变换继承类型 */
export enum InheritType {
  RrSs = 0,
  RSrs = 1,
  Rrs = 2,
}

/** FBX 属性映射信息类型 */
export enum MappingInformationType {
  AllSame = 'AllSame',
  ByPolygon = 'ByPolygon',
  ByPolygonVertex = 'ByPolygonVertex',
  ByVertex = 'ByVertice', // 注意：FBX 标准有时写作 ByVertex
  NoMappingInformation = 'NoMappingInformation',
}

/** FBX 属性引用信息类型 */
export enum ReferenceInformationType {
  Direct = 'Direct',
  IndexToDirect = 'IndexToDirect',
}

/** FBX 节点类型枚举 */
export enum FBXNodeType {
  GEOMETRY = "Geometry",
  MATERIAL = "Material",
  MODEL = "Model",
  TEXTURE = "Texture",
  VIDEO = "Video",
}

/** FBX 连接类型 */
export enum FBXConnectionType {
  OBJECT_OBJECT = "OO",
  OBJECT_PROPERTY = "OP",
}

/** Euler 枚举顺序映射（兼容 Blender 输出） */
export enum FBXEulerOrder {
  ZYX = 0,
  YZX = 1,
  XZY = 2,
  ZXY = 3,
  YXZ = 4,
  XYZ = 5,
  SphericXYZ = 6,
}