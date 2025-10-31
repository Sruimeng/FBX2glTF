# FBX → GLB 转换实现设计文档（基于 glTF-Transform & three.js 数学）

本文档描述在保留现有解析/渲染路径的前提下，新增 `src/glb/` 模块完成 FBX→GLB 的核心逻辑实现方案。该方案使用 `@gltf-transform/core`/`extensions`/`functions` 构建 glTF `Document`，并统一用 three.js 数学库进行矩阵/向量等数学运算。最终既支持：

- 直接 three.js 渲染解析后的 FBX（既有路径，保持不变）。
- 将 FBX 转换为 GLB，并使用 three.js 的 `GLTFLoader` 渲染。

## 目标与约束

- 保持现有代码不删除与尽量少改动；新增模块集中在 `src/glb/`。
- 使用 three.js 进行所有数学运算（`Matrix4`/`Vector3`/`Quaternion` 等）。
- 使用 glTF-Transform 构建 `Document` 并导出为 GLB（二进制）。
- 不引入 `any`/`unknown` 类型；严格类型约束与 ESLint 规则一致。
- 支持基础材质、纹理、网格、节点层级、骨骼蒙皮、动画、相机、灯光（通过扩展）。

## 总体架构

- 解析阶段（既有）：`BinaryParser`/`TextParser` → `FBXTree` → `connections` → `GeometryParser`/各类解析器（材质/纹理/模型/变换等）。
- 渲染阶段（既有）：`FBXTreeParser` → three.js 对象树（`Group`）。
- 新增导出阶段（新增）：`GLBExporter`（基于 glTF-Transform）从 `FBXTree`/`connections`/解析结果构建 glTF `Document`，写出 GLB。

## 目录结构（新增）

```
src/glb/
  index.ts                 # 统一导出
  context.ts               # GLBParsingContext（持有 glTF Document 与 three.js math）
  document-builder.ts      # 创建/配置 glTF Document 与扩展
  node-mapper.ts           # FBX 节点 → glTF 节点映射，层级/变换
  mesh-converter.ts        # 生成 glTF Mesh/Primitive/Accessor/Buffer
  material-converter.ts    # FBX 材质 → glTF PBR（含扩展）
  texture-converter.ts     # 纹理/采样器/图像写入与 KHR_texture_transform
  skin-converter.ts        # 骨骼蒙皮/逆绑定矩阵生成
  animation-converter.ts   # 动画轨道/通道映射
  camera-converter.ts      # 相机映射
  light-converter.ts       # 灯光映射（KHR_lights_punctual）
  glb-writer.ts            # Document → GLB 二进制写出
```

## IParsingContext 设计调整

现有接口：

```ts
export interface IParsingContext {
  readonly fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
  sceneGraph: Group,
  readonly loadingManager: LoadingManager,
  readonly wireframe?: boolean,
  getConnections(id: number): FBXConnectionNode | undefined,
  getNodesByType<T>(nodeType: string): Map<number, T>,
}
```

要求将 `sceneGraph: Group` 替换为 glTF-Transform 的 `Document`。为不破坏现有 three.js 渲染流程，采用“并存式”上下文策略：

- 新增 `GLBParsingContext`（不改动原接口定义），内部持有：
  - `document: Document`（glTF-Transform）
  - `math: { Matrix4, Vector3, Quaternion }`（来自 three.js）
  - 与原 `ParsingContext` 同步的 `fbxTree`、`connections`、`loadingManager`。

- 在不影响 `FBXTreeParser` 的情况下，GLB 导出路径只使用 `GLBParsingContext`，避免修改既有 `IParsingContext.sceneGraph` 类型导致大范围重构。

如果后续你坚持将统一上下文的 `sceneGraph` 改为 `Document`，建议：

- 将 `sceneGraph` 改为联合或泛型：`sceneGraph: Group | Document` 或 `IParsingContext<TSceneGraph>`；
- 逐步将 three 渲染路径的使用点改为 `context.sceneGraph as Group`；GLB 路径改为 `context.sceneGraph as Document`。

当前实现文档按“并存式”上下文设计推进（默认风险更低，改动面更小）。

## 模块职责与实现细节

### 1. `context.ts`

- 导出 `GLBParsingContext`：
  - 构造参数：`fbxTree`、`connections`、`loadingManager`、`options`（单位、坐标系、纹理选项等）。
  - 初始化 `Document`：通过 `document-builder` 创建，并附加需要的扩展。
  - 暴露 `getConnections()`、`getNodesByType()` 等与原接口一致的便捷方法，以降低迁移成本。

### 2. `document-builder.ts`

- 负责创建并配置 `Document`，并统一开启扩展：
  - `KHR_lights_punctual`（灯光）
  - `KHR_materials_unlit`（非 PBR）可选
  - `KHR_texture_transform`（纹理坐标变换）可选
  - 其他材质扩展（如 clearcoat、transmission）按需求增量添加
- 管理 `Buffer`/`Image` 资源池与写出策略（嵌入/外链）。

### 3. `node-mapper.ts`

- 将 FBX 的对象层级映射为 glTF `Node` 层级：
  - 使用 three.js `Matrix4`/`Quaternion` 计算 TRS，最终写入 glTF（`node.setTranslation/Rotation/Scale`）。
  - 坐标系/单位转换：
    - 单位：依据 `FBX GlobalSettings` 中的 `UnitScaleFactor` 转换到米（glTF 默认单位米）。
    - 轴：FBX 通常为 +Y up/-Z forward，glTF 通常 +Y up/-Z forward（与 three 一致）；若文件声明不同，按 `TransformUtils` 的约定归一化。
  - 节点命名保留：使用 `PropertyBinding.sanitizeNodeName` 清洗。

### 4. `mesh-converter.ts`

- 将几何数据生成 `Mesh`、`Primitive`、`Accessor`、`BufferView`：
  - 顶点属性：`POSITION`、`NORMAL`、`TANGENT`、`TEXCOORD_0/1`、`COLOR_0`。
  - 索引：`UNSIGNED_SHORT`/`UNSIGNED_INT`，依据最大索引值选择。
  - 切线：若 FBX 未提供，使用 three.js 计算或以 glTF-Transform `functions.tangents()` 生成。
  - Morph Targets：将 `targets` 写入 `Primitive.targets`，并设置 `weights`。
  - 多材质：拆分为多个 `Primitive`（依据 `GeometryGroup.materialIndex`）。

### 5. `material-converter.ts`

- 将 FBX 材质映射到 glTF PBR：
  - 统一映射规则：
    - `Diffuse` → `baseColorFactor/Texture`
    - `Specular`/`Glossiness` → `metallicRoughness` 近似（可选支持 `KHR_materials_specular`）
    - `NormalMap` → `normalTexture`
    - `Emissive` → `emissiveFactor/Texture`
    - `Opacity` → `alphaMode` 与 `baseColorFactor.a`
  - 支持非 PBR：标记 `KHR_materials_unlit`。
  - 纹理坐标变换：`offset/scale/rotation` → `KHR_texture_transform`。

### 6. `texture-converter.ts`

- 创建 `Texture`/`Image`/`Sampler`：
  - 从原解析结果（`images`, `textures`）读取二进制/URL，按选项嵌入或外链。
  - 翻转策略（`flipY`）：glTF 要求纹理坐标从左下角；three 默认从左上角。根据现有加载逻辑与材质定义决定是否需要翻转。

### 7. `skin-converter.ts`

- 骨骼蒙皮：
  - 依据 `skeletons`/`rawBones` 构造 `Skin`
  - 使用 three.js 计算 `inverseBindMatrices`（`bindMatrix.clone().invert()`）并写入 `Accessor`
  - 绑定 `Node` 与 `Skin`，写入 `joints` 与 `skeleton`。

### 8. `animation-converter.ts`

- 动画轨道映射：
  - 位置/旋转/缩放曲线 → glTF `channels`（`sampler` → `input` 时间、`output` 值），旋转使用四元数。
  - 权重（Morph Targets）曲线 → `WEIGHTS` 通道。
  - 时间轴：FBX 的帧/秒 → glTF 秒制；保持采样一致性。

### 9. `camera-converter.ts`

- 透视/正交相机映射：
  - `fov/aspect/near/far` → glTF `Camera`
  - 与 `Node` 关联，设置变换。

### 10. `light-converter.ts`

- 使用 `KHR_lights_punctual`：
  - `Directional/Point/Spot` 映射，并设置强度/色温/角度等参数。
  - 与 `Node` 关联。

### 11. `glb-writer.ts`

- 使用 glTF-Transform 的 `NodeIO`：
  - `io.writeBinary(document)` → `ArrayBuffer`
  - 输出选项：是否嵌入图片、是否压缩（可后续加 `KHR_meshopt_compression`）。

## API 设计

### 入口函数

```ts
// src/glb/index.ts
export interface FBXToGLBOptions {
  embedImages?: boolean,
  binary?: boolean, // 固定 true（GLB）
  flipY?: boolean,
  unitScale?: number, // 默认从 FBX 读取并归一化到 1.0（米）
  yUp?: boolean,     // 坐标系归一化
}

export interface FBXToGLBResult {
  document: import('@gltf-transform/core').Document,
  glb: ArrayBuffer,
}

export async function convertFBXToGLB(context: ParsingContext, options?: FBXToGLBOptions): Promise<FBXToGLBResult>;
```

### 使用方式（示例）

```ts
// 保持现有三维渲染路径
const group = await new FBXTreeParser(textureLoader, manager, parsingContext).parse({ null: null }, parsingContext);
scene.add(group.scene);

// 新增 GLB 导出路径
import { convertFBXToGLB } from './glb';
const { glb } = await convertFBXToGLB(parsingContext, { embedImages: true, flipY: false });

// 使用 GLTFLoader 加载 GLB（内存）
const blob = new Blob([glb], { type: 'model/gltf-binary' });
const url = URL.createObjectURL(blob);
new GLTFLoader().load(url, (gltf) => scene.add(gltf.scene));
```

## 关键映射与转换规则

- 单位：将 `GlobalSettings.UnitScaleFactor` 转换为米（`scale = UnitScaleFactor` → glTF 统一 1.0）。
- 坐标系：默认 +Y up/-Z forward；若 FBX 声明不同，按 `transform-utils` 同步修正。
- 变换：统一使用 three.js 计算 TRS，写入 glTF。
- 材质：优先 PBR 映射；无法匹配的特性（如高级光泽模型）标记为 Unlit 或使用近似扩展。
- 纹理：保持采样器参数；UV 变换使用 `KHR_texture_transform`；必要时 `flipY`。
- 骨骼：生成 `inverseBindMatrices`，写入 `Skin` 与 `Accessor`。
- 动画：统一秒制时间轴；旋转使用四元数；Morph 使用 `WEIGHTS`。
- 灯光：`KHR_lights_punctual`；相机直接写入 glTF。

## 与现有代码集成

- 不删除既有 `FBXTreeParser` 和各解析模块。
- 新增 `src/glb` 模块独立消费 `ParsingContext`。
- 如需把 `IParsingContext.sceneGraph: Group` 改为 `Document`，采用联合/泛型方式降低影响；或新增 `GLBParsingContext` 并在 GLB 路径中使用。

## 渐进迁移（src/parse → src/glb）

本项目采用“渐进式”迁移策略，将 `src/parse` 中的解析结果逐步映射到 glTF `Document`，避免一次性重写全部逻辑：

- 先打通“数学-only”的节点层级映射：从 `FBXTree`/`connections` 提取层级与 TRS 变换，使用 three.js 数学计算，写入 glTF `Node`。
- 其次引入网格数据：重用 `src/parse/geometry/*` 的几何管线（顶点属性/索引/组），在 `src/glb/mesh-mapper.ts` 生成 `Mesh/Primitive/Accessor`。
- 逐步接入材质与纹理：从 `src/parse/tree/material-parser.ts`、`texture-parser.ts` 读取解析结果，映射到 PBR 与 `KHR_texture_transform`。
- 后续增量加入骨骼/动画/相机/灯光：分别对应 `skin-converter.ts`、`animation-converter.ts`、`camera-converter.ts`、`light-converter.ts`。

该路线的关键是“复用解析、替换输出”：解析仍来自 `src/parse`，输出由 `src/glb` 统一写入 glTF `Document`，从而减少对既有 three.js 渲染路径的侵入。

## 非 Mesh three.js 代码替代策略

在 GLB 导出路径中，逐步替代对 three.js 非网格能力的直接依赖，改为 glTF 原生或扩展能力：

- 变换：保留 three.js 数学计算，但最终写入 glTF `Node.setTranslation/Rotation/Scale`。
- 灯光：替代 three.js 直接灯光对象，使用 `KHR_lights_punctual` 扩展并与 `Node` 关联。
- 相机：写入 glTF `Camera`，与 `Node` 绑定，避免在导出路径构造 three.js 相机对象。
- 骨骼与蒙皮：用 three.js 计算 `inverseBindMatrices`，但输出为 glTF `Skin` 与 `Accessor`。
- 动画：将位置/旋转/缩放/权重曲线映射为 glTF `channels/samplers`，旋转统一四元数。

以上替换策略保证渲染路径（three.js Group）继续工作，同时 GLB 导出路径不依赖非必要的 three.js 运行时对象。

## 构建预览与静态资源

为确保 Demo 在生产预览中稳定加载静态资源（FBX/贴图/GLB）：

- 使用 `vite.config.js` 设置 `publicDir: demo/assets`，构建时自动复制到 `dist/assets`。
- 额外提供 `scripts/copy-assets.js`，在 `vite build` 完成后复制 `demo/assets` → `dist/assets`，避免某些 CI/预览环境遗漏。
- Demo 中的资源路径统一使用绝对路径：`/assets/models/fbx/<name>.fbx`，兼容开发与预览服务器。

已知问题与排查建议：

- 若预览环境报 `TypeError: ... translationService ...` 或出现形如 `academia-*.js` 的第三方脚本错误，通常为浏览器扩展/外部脚本注入所致，并非本仓库代码。请在隐私模式或禁用扩展后重试，或在 DevTools Sources 中定位非本仓库的脚本来源。
- 资源 404：检查 `dist/assets` 是否包含目标文件，或确认 `publicDir`/复制脚本已生效。

## 测试与验证

1. 类型/风格：`pnpm check:ts` 与 `pnpm lint` 全量通过。
2. Demo：
   - 直接 FBX 渲染（旧路径）视觉正确。
   - GLB 导出后用 `GLTFLoader` 渲染，视觉一致或可接受。
3. glTF 校验：使用 `gltf-validator` 或 glTF-Transform 内置检查（如 `inspect`）。
4. 性能：大型 FBX（>50MB）导出时间与内存峰值记录；必要时引入 `meshopt` 压缩。

## 增量迭代（可选）

- 补充材质扩展：`KHR_materials_transmission`、`KHR_materials_clearcoat`。
- 动画插值优化：统一为 `LINEAR`，必要时支持 `STEP`/`CUBICSPLINE`。
- 贴图格式转换：将非 PNG/JPEG 的纹理统一编码为 GLB 可嵌入格式。
- Mesh 压缩：`KHR_meshopt_compression`。

## 里程碑与实施步骤

1. 搭建 `src/glb/` 基础文件与导出入口（空实现 + 类型）。
2. 完成 `document-builder` 与 `context`，能创建 `Document` 与写出空场景 GLB。
3. 逐步实现 `node-mapper`/`mesh-converter`/`material-converter`/`texture-converter`。
4. 实现 `skin` 与 `animation`，打通骨骼与基础动画。
5. 加入 `camera` 与 `light`（扩展）。
6. Demo 对比与校验；性能测试；文档补充。

## 回滚与风险控制

- 新模块与现有模块完全隔离，随时可停用 GLB 导出路径，原加载/渲染不受影响。
- 若选择改动 `IParsingContext.sceneGraph` 类型，优先使用联合/泛型以降风险。
- 任何步骤失败可直接回滚至不包含 `src/glb/` 的提交。

---

如需我开始第一步代码脚手架（`src/glb/` 基础文件与类型定义），请在审核通过后确认。我会在不影响现有解析/渲染的前提下，按本文档进行实现。 
