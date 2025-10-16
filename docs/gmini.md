# 🏗️ FBX 加载器模块重构文档

## 📋 目录

- [概述](#概述-overview)
- [当前状态分析](#当前状态分析)
- [重构目标](#重构目标)
- [核心重构原则](#核心重构原则)
- [详细重构方案](#详细重构方案)
- [新的项目结构](#新的项目结构)
- [实施步骤](#实施步骤)
- [重构收益](#重构收益)
- [测试策略](#测试策略)

---

## 📊 概述 (Overview)

### 当前状态分析

当前 FBX 加载器项目已实现核心功能，但随着代码规模的增长，暴露出以下几个关键的架构问题：

1. **🔗 职责耦合过高**
   - `FBX-tree-parser.ts` 是典型的"上帝类"(God Class)
   - 文件体积庞大（1400+ 行），逻辑分支复杂
   - 承担材质、纹理、图像、骨骼、变形体、场景组装等所有工作
   - 任何微小修改都可能引发不可预见的副作用

2. **🌐 隐式数据依赖**
   - 通过 `global` 对象管理全局状态
   - 模块间紧密耦合和隐式依赖
   - 数据流向难以追踪，代码行为不可预测
   - 单元测试极其困难

3. **📝 类型定义混乱**
   - 所有 TypeScript 接口和类型堆砌在 `constants.ts`
   - 缺乏组织和分类
   - 违背"高内聚"原则
   - 难以理解 FBX 数据结构

4. **🧪 可测试性差**
   - 全局状态依赖导致单元测试困难
   - 无法独立测试各个解析模块
   - Mock 数据构造复杂

5. **🔧 工具函数重复**
   - `util.ts` 和 `utils.ts` 存在功能重复
   - 缺乏统一的工具函数组织

### 重构目标

本次重构旨在解决上述问题，核心目标如下：

1. **✅ 高内聚 (High Cohesion)**
   - 每个模块职责单一明确
   - 材质解析器只关心材质，几何体解析器只关心几何体
   - 代码库认知负荷大大降低

2. **🔌 低耦合 (Low Coupling)**
   - 解除模块间硬编码和隐式依赖
   - 通过明确接口和数据传递进行通信
   - 模块可独立、可替换

3. **🎯 类型优先 (Type First)**
   - 建立清晰、结构化的类型系统
   - 先定义数据契约，再实现逻辑
   - 编译阶段发现潜在错误

4. **🧪 可测试性 (Testability)**
   - 每个解析器可独立测试
   - 轻松模拟解析上下文
   - 测试覆盖率 90%+

5. **📈 可扩展性 (Scalability)**
   - 支持新特性只需添加新解析器
   - 最小化对现有代码的侵入
   - 清晰的扩展点

---

## 🎯 核心重构原则 (Core Refactoring Principles)

### 1. 单一职责原则 (Single Responsibility Principle)

**实现高内聚的基石**
- 将"上帝类" `FBXTreeParser` 彻底分解
- 拆分成多个功能单一、职责明确的子解析器
- 每个类只做一件事，并把它做好

### 2. 依赖倒置与上下文传递 (Dependency Inversion & Context Passing)

**实现低耦合的关键**
- 废弃 `global` 对象
- 引入 `ParsingContext` 抽象数据中心
- 高层模块不依赖低层模块具体实现
- 数据流从隐式变为显式，依赖关系清晰可见

### 3. 领域驱动的类型设计 (Domain-Driven Type Design)

**实现类型优先的手段**
- 根据 FBX 文件领域知识组织类型文件
- 类型结构本身成为项目文档
- 清晰的数据契约和接口定义

---

### 2\. 核心重构原则 (Core Refactoring Principles)

#### 2.1. 单一职责原则 (Single Responsibility Principle)

这是实现**高内聚**的基石。我们将把“上帝类” `FBXTreeParser` 彻底分解，拆分成多个功能单一、职责明确的子解析器。

#### 2.2. 依赖倒置与上下文传递 (Dependency Inversion & Context Passing)

这是实现**低耦合**的关键。我们将废弃 `global` 对象，引入一个 `ParsingContext` 对象。高层模块不依赖于低层模块的具体实现，所有模块都依赖于 `ParsingContext` 这个抽象的“数据中心”。数据流将从隐式变为显式，依赖关系清晰可见。

#### 2.3. 领域驱动的类型设计 (Domain-Driven Type Design)

这是实现**类型优先**的手段。我们将根据 FBX 文件的领域知识（如 Nodes, Connections, Properties）来组织我们的类型文件，使类型结构本身就能成为项目文档的一部分。

---

### 3\. 详细重构方案 (Detailed Refactoring Plan)

#### 3.1. **第一步：类型系统重构 (Type System Refactoring)**

**理由**：作为“类型优先”原则的实践，首先需要一个清晰的类型结构来定义数据契约。

**操作**：

1.  创建一个新的 `/types` 目录。
2.  将 `constants.ts` 文件按领域拆分到该目录中：
    - **/types/fbx-tree.ts**: 存放顶层 FBX 树结构接口，如 `IFBXTree`, `FBXObjects`, `FBXConnections` 等。
    - **/types/fbx-nodes.ts**: 存放具体的 FBX 节点接口，如 `FBXModelNode`, `FBXGeometryNode`, `FBXMaterialNode` 等。
    - **/types/parser.ts**: 存放解析器相关的接口，如 `Deformers`, `FBXSkeleton`，以及接下来要定义的新接口。
    - **/types/enums.ts**: 存放所有的枚举，如 `FBXNodeType`, `MappingInformationType` 等。
3.  删除原 `constants.ts` 中除 `global` 对象（后续也将被删除）外的所有类型定义。

#### 3.2. **第二步：消除全局状态，引入解析上下文 (Eliminate Global State, Introduce Parsing Context)**

**理由**：彻底解决模块间隐式耦合的问题，让数据流显式化，为单元测试铺平道路。

**操作**：

1.  在 `/types/parser.ts` 中定义 `ParsingContext` 接口：

    ```typescript
    import { IFBXTree, FBXConnectionNode } from "./fbx-tree";

    export interface ParsingContext {
      readonly fbxTree: IFBXTree;
      readonly connections: Map<number, FBXConnectionNode>;
    }
    ```

2.  修改 `FBXLoader.ts` 的 `parse` 方法：
    - 在通过 `BinaryParser` 或 `TextParser` 获得 `fbxTree` 后，立即调用一个内部方法（或工具函数）来解析 `Connections`。
    - 用 `fbxTree` 和 `connections` 创建一个 `ParsingContext` 实例。
    - 将此 `context` 实例作为后续所有解析流程的唯一数据源。
3.  **彻底删除 `global` 对象**及其在所有文件中的引用。

#### 3.3. **第三步：拆分核心解析器 (Decompose the Core Parser)**

**理由**：这是实现“高内聚”的核心步骤。将一个庞大、复杂的类拆解为多个小而美的、易于理解和维护的类。

**操作**：

1.  创建一个新的 `/parsers` 目录。

2.  将 `FBX-tree-parser.ts` 中的逻辑按职责拆分到以下新类中：

    - **`ImageParser`** (`/parsers/FBX-image-parser.ts`)

      - **职责**: 解析 FBX 文件中嵌入的图像数据。
      - **源方法**: `parseImages`, `parseImage`。
      - **输入**: `ParsingContext`。
      - **输出**: `Promise<Map<number, string>>` (图像 ID -\> Blob URL 或 Base64 字符串)。

    - **`TextureParser`** (`/parsers/FBX-texture-parser.ts`)

      - **职责**: 解析纹理节点信息，并加载纹理资源。
      - **源方法**: `parseTextures`, `parseTexture`, `loadTexture`。
      - **输入**: `ParsingContext`, `Map<number, string>` (来自 `ImageParser` 的结果), `TextureLoader`。
      - **输出**: `Promise<Map<number, THREE.Texture>>`。

    - **`MaterialParser`** (`/parsers/FBX-material-parser.ts`)

      - **职责**: 解析材质节点，并关联纹理，创建 `three.js` 材质实例。
      - **源方法**: `parseMaterials`, `parseMaterial`, `parseParameters`。
      - **输入**: `ParsingContext`, `Map<number, THREE.Texture>` (来自 `TextureParser` 的结果)。
      - **输出**: `Map<number, THREE.Material>`。

    - **`DeformerParser`** (`/parsers/FBX-deformer-parser.ts`)

      - **职责**: 解析变形器，包括骨骼 (Skin) 和融合变形 (BlendShape)。
      - **源方法**: `parseDeformers`, `parseSkeleton`, `parseMorphTargets`。
      - **输入**: `ParsingContext`。
      - **输出**: `Deformers` 对象 (包含 `skeletons` 和 `morphTargets`)。

    - **`GeometryParser`** (`/parsers/FBX-geometry-parser.ts` - **现有文件增强**)

      - **职责**: (保持不变) 解析几何体节点，生成 `BufferGeometry`。
      - **输入**: `ParsingContext`, `Deformers` (来自 `DeformerParser` 的结果)。
      - **输出**: `Map<number, THREE.BufferGeometry>` 和 `Map<number, BaseInfo>`。

    - **`AnimationParser`** (`/parsers/FBX-animation-parser.ts` - **现有文件增强**)

      - **职责**: (保持不变) 解析动画数据。
      - **输入**: `ParsingContext`, `THREE.Group` (最终场景图，用于查找节点)。
      - **输出**: `THREE.AnimationClip[]`。

    - **`SceneParser`** (`/parsers/FBX-scene-parser.ts` - **新的调度中心**)

      - **职责**: 作为总调度器，编排以上所有解析器的调用顺序，并负责最终的场景图 (`THREE.Group`) 的构建和组装。
      - **源方法**: `parseScene`, `parseWireFrameModels`, `buildSkeleton`, `create...` 系列方法, `bindSkeleton` 等所有与场景构建相关的逻辑。
      - **输入**: `ParsingContext`, `TextureLoader`, `LoadingManager`。
      - **输出**: `ModelLoaderResult` (包含 `scene`, `animations`, `modelInfo`)。

#### 3.4. **第四步：统一工具函数 (Unify Utility Functions)**

**理由**：整合零散的辅助函数，避免混淆。

**操作**：

1.  创建一个 `/utils` 目录。
2.  将 `util.ts` 和 `utils.ts` 的内容合并到一个新的 `fbx-utils.ts` 文件中。
3.  可以考虑在 `fbx-utils.ts` 内部使用命名空间或注释对函数进行分组，例如 `TransformUtils`, `DataExtractionUtils`, `FormatCheckUtils`。

#### 3.5. **第五步：明确主流程编排 (Clarify the Main Orchestration Flow)**

**理由**：在新的架构下，需要一个清晰的顶层逻辑来串联所有模块。

**操作**：

1.  **`FBXLoader.ts` 的新角色**:

    - 仅负责加载文件（二进制或文本）。
    - 调用 `BinaryParser` 或 `TextParser` 生成 `fbxTree`。
    - 创建 `ParsingContext`。
    - **实例化并调用 `SceneParser`**，将 `context` 注入。
    - 返回 `SceneParser` 的最终结果。

2.  **`SceneParser.ts` 的新角色**:

    - 在其 `parse` 方法中，按照依赖关系依次实例化并调用各个子解析器。
    - **调用顺序**:
      1.  `ImageParser`
      2.  `TextureParser` (依赖 `ImageParser` 的结果)
      3.  `MaterialParser` (依赖 `TextureParser` 的结果)
      4.  `DeformerParser`
      5.  `GeometryParser` (依赖 `DeformerParser` 的结果)
      6.  `this.buildSceneGraph()` (内部方法，使用以上所有结果构建场景)
      7.  `AnimationParser` (依赖构建好的 `sceneGraph`)
    - 将所有结果组装成 `ModelLoaderResult` 并返回。

---

### 4\. 预期的项目新结构 (Proposed New Project Structure)

```
/src
|-- /io
|   |-- FBX-binary-parser.ts
|   |-- FBX-text-parser.ts
|-- /parsers
|   |-- FBX-animation-parser.ts
|   |-- FBX-deformer-parser.ts
|   |-- FBX-geometry-parser.ts
|   |-- FBX-image-parser.ts
|   |-- FBX-material-parser.ts
|   |-- FBX-scene-parser.ts
|   |-- FBX-texture-parser.ts
|-- /types
|   |-- enums.ts
|   |-- fbx-nodes.ts
|   |-- fbx-tree.ts
|   |-- parser.ts
|-- /utils
|   |-- fbx-utils.ts
|-- FBX-loader.ts
|-- index.ts
```

---

### 5\. 重构收益总结 (Summary of Refactoring Benefits)

1.  **可维护性 (Maintainability)**：当需要修改材质的解析逻辑时，开发者只需关注 `MaterialParser`，无需理解和改动其他任何文件。代码库的认知负荷大大降低。
2.  **可测试性 (Testability)**：每个解析器都可以被独立进行单元测试。我们可以轻松地模拟 `ParsingContext` 来测试 `DeformerParser`，而无需加载一个完整的 FBX 文件。
3.  **可读性 (Readability)**：代码职责清晰，文件短小精悍。`SceneParser` 的 `parse` 方法就像一份清晰的目录，描述了整个 FBX 解析的步骤和数据流。
4.  **可扩展性 (Scalability)**：如果未来需要支持 FBX 的新特性（例如新的节点类型），只需添加一个新的解析器类，并在 `SceneParser` 中编排它的调用即可，对现有代码的侵入性极小。
5.  **健壮性 (Robustness)**：“类型优先”的设计确保了数据在各个模块间传递时的一致性和正确性，可以在编译阶段就发现大量潜在的错误。
