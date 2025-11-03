# FBX → GLB 转换实现（保持原解析结构不变、零侵入）

本方案严格遵循“原有解析结构不变”的前提：不改动已有文件的职责划分与类型结构，不重命名、不新建并行模块目录，不在既有接口上新增字段。GLB 导出以“只读访问”解析结果的方式实现，作为附加功能追加在现有文件中（尾部或工具函数），确保三维渲染路径完全不受影响。

## 范围与原则

- 不改动解析链路：`BinaryParser`/`TextParser` → `FBXTree` → `connections` → 各解析器 → `FBXTreeParser` → `Group`。
- 不改动类型结构：`IParsingContext`、各节点/几何/材质等类型保持不变。
- 仅保留 three.js 数学（Matrix4/Vector3/Quaternion/Euler/MathUtils）；导出路径不依赖任何 three.js 运行时对象（不创建或引用 Object3D/Group、Mesh、Material、Texture、SkinnedMesh、AnimationClip、Camera、Light）。
- 代码改动采用“附加函数”方式：在现有文件尾部新增导出函数/工具函数，避免并行模块与大范围迁移。（并保证不出现非 Math 相关的 three.js 对象， 如 Object3D、Group、Mesh、Material、Texture、SkinnedMesh、AnimationClip、Camera、Light 等,可以通过注释原有代码来消除）

## 总体思路

- 复用解析结果：以 `FBXTree`、`connections`、解析后的缓存对象。
- 在单个导出入口函数中局部创建 glTF-Transform `Document`，完成节点/网格/材质/纹理/骨骼/动画/相机/灯光的映射，然后写出 GLB（二进制）。
- 不修改上下文或解析器对外接口；导出函数以现有 `IParsingContext` 为基础加入 `GLBExportOptions` 选项。

## 保留与替代（严格执行）

- 保留的 three.js 能力（仅数学）：`Matrix4`、`Vector3`、`Quaternion`、`Euler`、`MathUtils`（必要时 `Color` 仅用于数值转换）。
- 替代的运行时对象（GLB 导出路径中不创建/不依赖）：`Object3D/Group`、`Mesh`、`BufferGeometry`、`Material`、`Texture`、`SkinnedMesh`、`AnimationClip`、`Camera`、`Light`。
- 对应替代实现：全部由 glTF-Transform `Document` 与扩展（`KHR_lights_punctual`、`KHR_texture_transform` 等）完成节点、网格、材质、纹理、骨骼、动画、相机与灯光的写入。
- 数据提取约束：读取几何/材质/纹理等数据以解析缓存为主；如确需从 `BufferGeometry` 读取，仅用于提取 `ArrayLike` 数据，不在导出路径实例化或依赖任何 three 运行时行为。

## 导出入口与选项（新增函数，零侵入）

- 函数签名（建议放置位置：`src/FBXLoaderRefactored.ts` 尾部，或 `src/parse/tree/FBXTreeParser.ts` 尾部）：

```ts
export interface GLBExportOptions {
  embedImages?: boolean; // 是否嵌入贴图到 GLB
  flipY?: boolean; // 纹理坐标翻转策略（按需）
  unitScale?: number; // 覆盖单位缩放（默认从 FBX 取值）
  yUp?: boolean; // 坐标系归一化（默认与 three/glTF 一致）
}

export async function exportGLBFromParsed(
  scene: import("three").Group,
  parsingContext: IParsingContext,
  options?: GLBExportOptions
): Promise<{ document: import("@gltf-transform/core").Document; glb: ArrayBuffer }>;
```

- 说明：
  - 仅新增函数，不改变任何既有类型与接口。
  - `Document` 在函数内部创建与使用，不存入 `parsingContext`，避免结构变化。

## 数据源与映射顺序（只读）

- 节点层级与变换：通过 `scene`（`Group`）与 `FBXTree`/`connections` 获取层级、TRS，使用 three.js 数学计算。
- 网格与几何：从 three `Mesh` 或解析缓存（顶点/索引/分组/法线/切线/uv/颜色）提取，写入 glTF `Accessor/BufferView/Primitive/Mesh`。
- 材质与纹理：复用解析出的材质/纹理信息（贴图路径、采样器、UV 旋转/偏移/缩放），映射到 PBR；纹理变换用 `KHR_texture_transform`（按需）。
- 骨骼与蒙皮：从 `SkinnedMesh`/骨架数据计算 `inverseBindMatrices`，写为 `Skin+Accessor` 并绑定节点。
- 动画：从现有 `AnimationClip` 或解析出的曲线生成 glTF `channels/samplers`；旋转统一四元数；时间轴统一秒制。
- 相机与灯光：扫描 `scene` 中对应对象，写入 glTF `Camera` 与 `KHR_lights_punctual` 并与节点关联。

## 详细实施步骤（保持结构不变）

1. 基线确认

- 运行 `pnpm build` 与 Demo 预览，确认当前解析与渲染路径稳定。整理 `FBXTreeParser` 输出与 `Group` 结构特征。

2. 新增导出入口函数（附加）

- 在 `src/FBXLoaderRefactored.ts` 尾部新增 `exportGLBFromParsed()`（或在 `FBXTreeParser.ts` 尾部），仅使用函数内部局部状态与只读访问。
- 引入 glTF-Transform 的 `Document`/`NodeIO`（或 `WebIO`）在函数体内创建。

3. 节点与变换写入

- 遍历 `scene`，为每个 `Object3D` 创建 glTF `Node`，写入 `translation/rotation(quaternion)/scale`。
- 单位/坐标系转换：读取 `GlobalSettings.UnitScaleFactor` 与坐标系声明，归一化到 glTF 习惯（米、+Y up/-Z forward）。

4. 网格与几何写入

- 收集 `BufferGeometry` 的 `position/normal/tangent/uv/color/index` 等属性，生成 `Accessor/BufferView` 并挂到 `Primitive`；多材质拆分多个 `Primitive`。
- 若缺少切线，使用 three 的工具或 glTF-Transform `functions.tangents()` 计算。

5. 材质映射（基础）

- `Diffuse` → `baseColorTexture/factor`；`Opacity` → `alphaMode` 与 `baseColorFactor.a`。
- `NormalMap` → `normalTexture`；`Emissive` → `emissiveFactor/Texture`。
- `Specular/Glossiness` 按需近似到 `metallicRoughness`，或后续增量支持 `KHR_materials_specular`。

6. 纹理与采样器

- 读取贴图路径与采样器参数（wrap/filter），按 `options.embedImages` 决定嵌入/外链。
- UV 变换映射为 `KHR_texture_transform`（offset/scale/rotation）。`flipY` 策略按材质与贴图来源决定。

7. 骨骼与蒙皮

- 从 `SkinnedMesh` 读取骨架层级与绑定矩阵，计算并写入 `inverseBindMatrices`（Accessor），生成 `Skin` 并将 `joints` 与 `skeleton` 关联到节点。

8. 动画映射

- 将位置/旋转/缩放轨道转换为 glTF `channels/samplers`；MorphTargets 映射到 `WEIGHTS`。
- 时间统一秒制；插值统一 `LINEAR`，按需支持 `STEP/CUBICSPLINE`。

9. 相机与灯光

- 相机：写入透视/正交参数并与节点绑定。
- 灯光：使用 `KHR_lights_punctual` 扩展写入 `Directional/Point/Spot`，关联节点。

10. GLB 写出

- 使用 `io.writeBinary(document)` 获取 `ArrayBuffer`，返回 `{ document, glb }`。
- 不在上下文中持久化 `Document`；函数外仅暴露返回值。

11. Demo 接入（不改解析结构）

- 在 `demo/src/single.ts` 中，FBX 加载成功后调用 `exportGLBFromParsed(scene, parsingContext, options)`，用 `GLTFLoader` 加载内存 Blob 并展示。
- 所有路径与加载逻辑保持不变；此调用仅为新增能力演示。

12. 验证与度量

- 视觉一致性：three 渲染 vs GLB 渲染对比。
- glTF 校验：`gltf-validator` 或 glTF-Transform 内置检查。
- 性能记录：导出时间、内存峰值、GLB 体积；必要时引入 `meshopt` 压缩（可选）。

## 文件修改清单（仅“追加”，不改结构）

- `src/FBXLoaderRefactored.ts`：追加 `exportGLBFromParsed()` 函数；在文件顶部按需引入 glTF-Transform 类型与 IO 类。
- （可选）`src/parse/tree/FBXTreeParser.ts`：追加若干私有/内部的映射辅助函数；不改导出、不改现有方法签名。
- （可选）`src/parse/utils.ts`：追加数学/坐标/单位变换的小工具函数，供导出函数内部使用。

> 注：以上均为“追加”型改动，不涉及接口签名、类型结构、目录层级的变化。

## 风险与回滚

- 风险隔离：导出函数不参与解析链路，失败不影响 FBX 加载与 three 渲染。
- 回滚简易：移除新增函数即可完全回到现状，无需改动任何解析相关文件。

## 里程碑

- M1：节点与网格最小闭环（Node+Mesh，无材质/纹理）。
- M2：材质与纹理（含 `KHR_texture_transform`）。
- M3：骨骼与蒙皮。
- M4：动画。
- M5：相机与灯光（`KHR_lights_punctual`）。
- M6：性能优化与压缩（可选）。

## 附：最小闭环示例流程

- 解析 FBX → 得到 `Group`。
- 调用 `exportGLBFromParsed(group, parsingContext, { embedImages: true })`。
- 获取 `glb: ArrayBuffer` → 构造 `Blob` → `GLTFLoader` 从内存 URL 加载 → `scene.add(gltf.scene)`。

---

若需要，我可以按照本文件的步骤，从 M1 开始在 `src/FBXLoaderRefactored.ts` 追加导出函数的最小实现，不触及任何解析结构与接口签名。
