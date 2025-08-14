# 上下文
文件名：2025-08-14_1_fbx-gltf-refactor.md
创建时间：2025-08-14_10:30:00
创建者：Sruimeng
主分支：main
任务分支：task/fbx-gltf-refactor_2025-08-14_1
Yolo 模式：Ask

# 任务描述
FBX->GLTF模型格式转化库的重构，将Three.js依赖替换为@maxellabs/math和@gltf-transform/core

# 项目概述
这是一个用于完成FBX->GLTF模型格式转化的Web包，目前依赖Three.js，需要重构为：
- 使用@maxellabs/math作为数学库
- 使用@gltf-transform/core作为核心转化包
- 移除Three.js依赖

# 分析
## 项目结构分析
- **当前依赖**：Three.js (v0.176.0), @gltf-transform/core (v4.1.3), fflate (v0.8.2)
- **目标依赖**：@maxellabs/math, @gltf-transform/core, 移除Three.js

## 核心Three.js依赖分析
项目在23个文件中使用了Three.js，主要功能包括：

### 数学运算功能
- `Matrix4`, `Vector3`, `Vector2`, `Vector4` - 向量和矩阵运算
- `Euler`, `Quaternion` - 旋转和方向
- `MathUtils` - 数学工具函数

### 3D对象和场景
- `Group`, `Object3D` - 场景图节点
- `Mesh`, `SkinnedMesh` - 网格对象
- `Bone`, `Skeleton` - 骨骼系统
- `BufferGeometry` - 几何体数据

### 材质和纹理
- `MeshStandardMaterial`, `MeshPhongMaterial`, `MeshPhysicalMaterial` - 材质
- `Texture`, `TextureLoader` - 纹理加载和处理
- `Color` - 颜色管理

### 动画系统
- `AnimationClip` - 动画剪辑
- `VectorKeyframeTrack`, `QuaternionKeyframeTrack`, `NumberKeyframeTrack` - 关键帧轨道
- `PropertyBinding` - 属性绑定

### 灯光和相机
- `PerspectiveCamera`, `PointLight`, `DirectionalLight`, `SpotLight`, `AmbientLight`

### 加载器工具
- `Loader`, `FileLoader`, `LoaderUtils` - 文件加载基础
- `LoadingManager` - 加载管理

## 重构挑战
1. **数学库替换**：需要将Three.js的数学运算功能替换为@maxellabs/math
2. **场景图转换**：需要将Three.js的场景图结构转换为glTF兼容格式
3. **材质系统**：需要将Three.js材质转换为glTF材质
4. **动画系统**：需要将Three.js动画转换为glTF动画格式
5. **几何体转换**：需要将BufferGeometry转换为glTF几何体格式

# 建议解决方案
## 重构策略

### 阶段1：依赖管理和基础设施
1. **安装新的依赖**
   - 添加 `@maxellabs/math` 作为数学库
   - 确保 `@gltf-transform/core` 是最新版本
   - 暂时保留 `three` 用于兼容性测试

2. **创建适配层**
   - 创建 `src/adapters/` 目录
   - 实现 `ThreeToGLTFAdapter` 类来桥接Three.js和glTF格式
   - 创建 `MathAdapter` 来桥接Three.js数学运算和@maxellabs/math

### 阶段2：核心功能重构
3. **数学运算替换**
   - 创建 `src/math/` 目录
   - 实现基于@maxellabs/math的向量、矩阵、四元数类
   - 逐步替换所有Three.js数学运算调用

4. **几何体转换**
   - 创建 `src/converters/geometry.ts`
   - 实现BufferGeometry到glTF几何体的转换
   - 处理顶点、法线、UV坐标、骨骼权重等

### 阶段3：高级功能重构
5. **材质和纹理转换**
   - 创建 `src/converters/material.ts`
   - 实现Three.js材质到glTF材质的转换
   - 处理纹理映射和材质属性

6. **动画系统转换**
   - 创建 `src/converters/animation.ts`
   - 实现Three.js动画到glTF动画的转换
   - 处理关键帧轨道和动画剪辑

### 阶段4：整合和测试
7. **主加载器重构**
   - 修改 `src/parse/core/FBXLoader.ts`
   - 整合所有转换器
   - 移除Three.js依赖

8. **测试和验证**
   - 创建测试用例
   - 验证转换结果的正确性
   - 性能优化

## 实施计划

### 第一步：设置基础架构
1. 创建项目结构
2. 安装依赖
3. 创建适配层

### 第二步：数学库替换
1. 实现数学适配器
2. 替换向量运算
3. 替换矩阵运算
4. 替换四元数运算

### 第三步：几何体转换
1. 实现几何体转换器
2. 处理顶点数据
3. 处理索引数据
4. 处理属性数据

### 第四步：材质和动画
1. 实现材质转换器
2. 实现动画转换器
3. 整合所有转换器

### 第五步：清理和优化
1. 移除Three.js依赖
2. 优化性能
3. 添加文档
4. 发布新版本

# 当前执行步骤："3. 分析现有代码库结构"
- 已完成代码库结构分析，识别出23个文件使用了Three.js
- 需要制定重构方案

# 任务进度
[待记录]

# 最终审查：
[待完成]