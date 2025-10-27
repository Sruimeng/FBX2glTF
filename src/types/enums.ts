/**
 * FBX 基础枚举类型
 */

export enum FBXEulerOrder {
  SphericXYZ = 6,
  XYZ = 5,
  XZY = 2,
  YXZ = 4,
  YZX = 1,
  ZXY = 3,
  ZYX = 0,
}

export enum FBXConnectionType {
  OBJECT_OBJECT = 'OO',
  OBJECT_PROPERTY = 'OP',
}

export enum FBXNodeType {
  ANIMATION = 'Animation',
  DEFORMER = 'Deformer',
  GEOMETRY = 'Geometry',
  MATERIAL = 'Material',
  MODEL = 'Model',
  TEXTURE = 'Texture',
  VIDEO = 'Video',
}

export enum FBXMaterialPropertyType {
  AMBIENT = 'Ambient',
  DIFFUSE = 'Diffuse',
  EMISSIVE = 'Emissive',
  REFLECTIVITY = 'Reflectivity',
  SHININESS = 'Shininess',
  SPECULAR = 'Specular',
}

export enum MappingInformationType {
  ALL_SAME = 'AllSame',
  BY_EDGE = 'ByEdge',
  BY_POLYGON = 'ByPolygon',
  BY_POLYGON_VERTEX = 'ByPolygonVertex',
  BY_VERTEX = 'ByVertex',
}

export enum ReferenceInformationType {
  DIRECT = 'Direct',
  INDEX_TO_DIRECT = 'IndexToDirect',
}

export enum LayerElementType {
  BINORMAL = 'LayerElementBinormal',
  COLOR = 'LayerElementColor',
  MATERIAL = 'LayerElementMaterial',
  NORMAL = 'LayerElementNormal',
  SMOOTHING = 'LayerElementSmoothing',
  TANGENT = 'LayerElementTangent',
  UV = 'LayerElementUV',
}