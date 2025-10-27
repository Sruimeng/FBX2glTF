import { z } from 'zod';

// FBX基础值类型
export const FBXValueSchema = z.object({
  flag: z.string().optional(),
  type: z.string().optional(),
  value: z.unknown().optional(),
});

// FBX节点模式
export const FBXNodeSchema = z.object({
  name: z.string(),
  singleProperty: z.boolean(),
  propertyList: z.array(z.unknown()).optional(),
});

// FBX连接节点
export const FBXConnectionReferenceSchema = z.object({
  ID: z.number(),
  relationship: z.string().optional(),
});

export const FBXConnectionNodeSchema = z.object({
  parents: z.array(FBXConnectionReferenceSchema),
  children: z.array(FBXConnectionReferenceSchema),
});

// FBX模型节点
export const FBXModelNodeSchema = z.object({
  id: z.number(),
  attrName: z.string(),
  attrType: z.string(),
  Lcl_Translation: z.object({ value: z.array(z.number()) }).optional(),
  Lcl_Rotation: z.object({ value: z.array(z.number()) }).optional(),
  Lcl_Scaling: z.object({ value: z.array(z.number()) }).optional(),
  PreRotation: z.object({ value: z.array(z.number()) }).optional(),
  PostRotation: z.object({ value: z.array(z.number()) }).optional(),
  InheritType: z.object({ value: z.number() }).optional(),
  RotationOrder: z.object({ value: z.number() }).optional(),
});

// FBX几何节点
export const FBXGeometryNodeSchema = z.object({
  id: z.number(),
  attrName: z.string(),
  attrType: z.string(),
  Vertices: z.object({ a: z.array(z.number()) }).optional(),
  PolygonVertexIndex: z.object({ a: z.array(z.number()) }).optional(),
  LayerElementNormal: z.object({
    Normals: z.object({ a: z.array(z.number()) }).optional(),
    NormalsW: z.object({ a: z.array(z.number()) }).optional(),
  }).optional(),
  LayerElementUV: z.object({
    UV: z.object({ a: z.array(z.number()) }).optional(),
    UVIndex: z.object({ a: z.array(z.number()) }).optional(),
  }).optional(),
});

// FBX材质节点
export const FBXMaterialNodeSchema = z.object({
  id: z.number(),
  attrName: z.string(),
  ShadingModel: z.object({ value: z.string() }).optional(),
  Diffuse: z.object({ value: z.array(z.number()) }).optional(),
  DiffuseColor: z.object({
    value: z.array(z.number()),
    type: z.string(),
  }).optional(),
  Specular: z.object({ value: z.array(z.number()) }).optional(),
  SpecularColor: z.object({
    value: z.array(z.number()),
    type: z.string(),
  }).optional(),
  Shininess: z.object({ value: z.number() }).optional(),
  TransparencyFactor: z.object({ value: z.number() }).optional(),
  Opacity: z.object({ value: z.number() }).optional(),
  BumpFactor: z.object({ value: z.number() }).optional(),
  DisplacementFactor: z.object({ value: z.number() }).optional(),
  EmissiveFactor: z.object({ value: z.number() }).optional(),
  Emissive: z.object({ value: z.array(z.number()) }).optional(),
  EmissiveColor: z.object({
    value: z.array(z.number()),
    type: z.string(),
  }).optional(),
  ReflectionFactor: z.object({ value: z.number() }).optional(),
});

// FBX纹理节点
export const FBXTextureNodeSchema = z.object({
  id: z.number(),
  attrName: z.string(),
  WrapModeU: z.object({ value: z.number() }).optional(),
  WrapModeV: z.object({ value: z.number() }).optional(),
  Scaling: z.object({ value: z.array(z.number()) }).optional(),
  Translation: z.object({ value: z.array(z.number()) }).optional(),
  FileName: z.string().optional(),
  RelativeFilename: z.string().optional(),
});

// FBX动画相关节点
export const FBXAnimationCurveNodeSchema = z.object({
  id: z.number(),
  attrName: z.string(),
});

export const FBXAnimationCurveSchema = z.object({
  id: z.number(),
  KeyTime: z.object({ a: z.array(z.number()) }),
  KeyValueFloat: z.object({ a: z.array(z.number()) }),
});

export const FBXAnimationLayerSchema = z.object({
  id: z.number(),
});

export const FBXAnimationStackSchema = z.object({
  id: z.number(),
  attrName: z.string(),
});

// FBX变形器节点
export const FBXDeformerNodeSchema = z.object({
  id: z.number(),
  attrName: z.string(),
  attrType: z.string(),
  Indexes: z.object({ a: z.array(z.number()) }).optional(),
  Weights: z.object({ a: z.array(z.number()) }).optional(),
  TransformLink: z.object({ a: z.array(z.number()) }).optional(),
  DeformPercent: z.object({ value: z.number() }).optional(),
});

// FBX姿势节点
export const FBXPoseNodeSchema = z.object({
  id: z.number(),
  attrType: z.string(),
  PoseNode: z.array(z.object({
    Node: z.union([z.number(), z.object({ value: z.number() })]),
    Matrix: z.object({ a: z.array(z.number()) }).optional(),
  })).optional(),
  NbPoseNodes: z.object({ value: z.number() }).optional(),
});

// FBX顶层结构
export const FBXTreeSchema = z.object({
  objects: z.record(z.string(), z.unknown()).optional(),
  connections: z.record(z.string(), z.unknown()).optional(),
  Objects: z.object({
    Model: z.record(z.string(), z.unknown()).optional(),
    Geometry: z.record(z.string(), z.unknown()).optional(),
    Material: z.record(z.string(), z.unknown()).optional(),
    Texture: z.record(z.string(), z.unknown()).optional(),
    Video: z.record(z.string(), z.unknown()).optional(),
    AnimationCurve: z.record(z.string(), z.unknown()).optional(),
    AnimationCurveNode: z.record(z.string(), z.unknown()).optional(),
    AnimationLayer: z.record(z.string(), z.unknown()).optional(),
    AnimationStack: z.record(z.string(), z.unknown()).optional(),
    Deformer: z.record(z.string(), z.unknown()).optional(),
    Pose: z.record(z.string(), z.unknown()).optional(),
    NodeAttribute: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

// 工具类型
export type FBXValue = z.infer<typeof FBXValueSchema>;
export type FBXNode = z.infer<typeof FBXNodeSchema>;
export type FBXConnectionReference = z.infer<typeof FBXConnectionReferenceSchema>;
export type FBXConnectionNode = z.infer<typeof FBXConnectionNodeSchema>;
export type FBXModelNode = z.infer<typeof FBXModelNodeSchema>;
export type FBXGeometryNode = z.infer<typeof FBXGeometryNodeSchema>;
export type FBXMaterialNode = z.infer<typeof FBXMaterialNodeSchema>;
export type FBXTextureNode = z.infer<typeof FBXTextureNodeSchema>;
export type FBXAnimationCurveNode = z.infer<typeof FBXAnimationCurveNodeSchema>;
export type FBXAnimationCurve = z.infer<typeof FBXAnimationCurveSchema>;
export type FBXAnimationLayer = z.infer<typeof FBXAnimationLayerSchema>;
export type FBXAnimationStack = z.infer<typeof FBXAnimationStackSchema>;
export type FBXDeformerNode = z.infer<typeof FBXDeformerNodeSchema>;
export type FBXPoseNode = z.infer<typeof FBXPoseNodeSchema>;
export type FBXTree = z.infer<typeof FBXTreeSchema>;