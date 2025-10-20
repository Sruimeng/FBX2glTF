/**
 * @file /types/enums/node-types.ts
 * @description FBX 节点类型枚举定义
 */

/**
 * FBX 节点类型枚举
 * 定义了 FBX 文件中各种节点类型
 */
export enum FBXNodeType {
  /** 几何体节点 */
  Geometry = 'Geometry',

  /** 模型节点 */
  Model = 'Model',

  /** 材质节点 */
  Material = 'Material',

  /** 纹理节点 */
  Texture = 'Texture',

  /** 视频节点 */
  Video = 'Video',

  /** 动画曲线节点 */
  AnimationCurve = 'AnimationCurve',

  /** 动画曲线节点属性 */
  AnimationCurveNode = 'AnimationCurveNode',

  /** 动画层节点 */
  AnimationLayer = 'AnimationLayer',

  /** 动画堆栈节点 */
  AnimationStack = 'AnimationStack',

  /** 变形器节点 */
  Deformer = 'Deformer',

  /** 骨骼节点 */
  Skeleton = 'Skeleton',

  /** 摄像机节点 */
  Camera = 'Camera',

  /** 摄像机属性节点 */
  CameraAttribute = 'CameraAttribute',

  /** 灯光节点 */
  Light = 'Light',

  /** 灯光属性节点 */
  LightAttribute = 'LightAttribute',

  /** 音频节点 */
  Audio = 'Audio',

  /** 属性集节点 */
  PropertySet = 'PropertySet',

  /** 关键节点 */
  Key = 'Key',

  /** 集合节点 */
  Collection = 'Collection',

  /** 约束节点 */
  Constraint = 'Constraint',

  /** 表情节点 */
  Expression = 'Expression',

  /** 混合形状节点 */
  BlendShape = 'BlendShape',

  /** 皮肤节点 */
  Skin = 'Skin',

  /** 簇化器节点 */
  Cluster = 'Cluster',

  /** 边界节点 */
  Boundary = 'Boundary',

  /** 控制器节点 */
  Controller = 'Controller',

  /** 控制器标签节点 */
  ControllerTag = 'ControllerTag',

  /** 脚本节点 */
  Script = 'Script',

  /** 时间轴节点 */
  TimeMarker = 'TimeMarker',

  /** 标记节点 */
  Marker = 'Marker',

  /** 参考节点 */
  Reference = 'Reference',

  /** 空节点 */
  Null = 'Null',

  /** 未知类型 */
  Unknown = 'Unknown'
}

/**
 * 节点属性类型枚举
 */
export enum NodeAttributeType {
  /** 布尔属性 */
  Boolean = 'bool',

  /** 整数属性 */
  Integer = 'int',

  /** 浮点数属性 */
  Float = 'double',

  /** 字符串属性 */
  String = 'KString',

  /** 时间属性 */
  Time = 'Time',

  /** 二进制数据属性 */
  Binary = 'Binary',

  /** 距离属性 */
  Distance = 'Distance',

  /** 角度属性 */
  Angle = 'Angle',

  /** 速度属性 */
  Speed = 'Speed',

  /** 颜色属性 */
  Color = 'ColorRGB',

  /** 4D向量属性 */
  Vector4D = 'Vector4D',

  /** 3D向量属性 */
  Vector3D = 'Vector3D',

  /** 2D向量属性 */
  Vector2D = 'Vector2D',

  /** 矩阵属性 */
  Matrix = 'Matrix',

  /** 未知属性类型 */
  Unknown = 'Unknown'
}

/**
 * 连接类型枚举
 */
export enum ConnectionType {
  /** 对象属性连接 */
  ObjectProperty = 'OO',

  /** 对象属性（双向）连接 */
  ObjectPropertyBidirectional = 'OO',

  /** 属性连接 */
  Property = 'OP',

  /** 材质连接 */
  Material = 'OM',

  /** 变形连接 */
  Deformer = 'OD',

  /** 场景连接 */
  Scene = 'OS',

  /** 约束连接 */
  Constraint = 'OC',

  /** 位置连接 */
  Position = 'OT',

  /** 旋转连接 */
  Rotation = 'OR',

  /** 缩放连接 */
  Scale = 'OS',

  /** 通用连接 */
  Generic = 'O?'
}
