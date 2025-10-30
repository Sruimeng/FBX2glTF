# FBX-tree-parser.ts 重构执行步骤

## 执行前准备

1. **备份原始文件**
   ```bash
   cp src/parse/FBX-tree-parser.ts src/parse/FBX-tree-parser.ts.backup
   ```

2. **创建工作分支**
   ```bash
   git checkout -b refactor/fbx-tree-parser
   ```

## 步骤1：创建目录结构

```bash
mkdir -p src/parse/tree
```

## 步骤2：类型守护工具整理

**目标**：确保 `src/types/parsers/type-guards.ts` 包含所有必要的类型安全函数

**检查清单**：
- [ ] `extractNumberArray()`
- [ ] `extractMaterialValue()`
- [ ] `extractMaterialArray()`
- [ ] `extractNodeId()`
- [ ] `extractMatrixArray()`
- [ ] `setObjectID()`

## 步骤3：提取连接解析功能

**文件**：`src/parse/tree/connections.ts`

**源函数**：从 `FBX-tree-parser.ts` 中提取 `parseConnections()`

**操作步骤**：
1. 复制函数到新文件
2. 添加必要的导入
3. 确保类型正确
4. 运行 `pnpm check:ts` 验证

**原始函数位置**：FBX-tree-parser.ts 第 X-X 行

## 步骤4：提取图像解析功能

**文件**：`src/parse/tree/image-parser.ts`

**源函数**：
- `parseImages()`
- `parseImage()`

**操作步骤**：
1. 复制函数到新文件
2. 修复函数签名
3. 添加必要导入
4. 类型检查

## 步骤5：提取纹理解析功能

**文件**：`src/parse/tree/texture-parser.ts`

**源函数**：
- `parseTextures()`
- `parseTexture()`
- `loadTexture()`

**注意事项**：异步函数处理

## 步骤6：提取材质解析功能

**文件**：`src/parse/tree/material-parser.ts`

**源函数**：
- `parseMaterials()`
- `parseMaterial()`
- `parseParameters()`
- `getTexture()`

**关键修复**：connections 参数传递

## 步骤7：提取变形器解析功能

**文件**：`src/parse/tree/deformer-parser.ts`

**源函数**：
- `parseDeformers()`
- `parseSkeleton()`
- `parseMorphTargets()`

## 步骤8：提取场景构建功能

**文件**：`src/parse/tree/scene-builder.ts`

**源函数**：
- `parseScene()`
- `createCamera()`
- `createLight()`
- `SceneParser` 类

## 步骤9：提取模型解析功能

**文件**：`src/parse/tree/model-parser.ts`

**源函数**：
- `createMesh()`
- `createCurve()`

## 步骤10：提取变换工具

**文件**：`src/parse/tree/transform-utils.ts`

**源函数**：
- `getTransformData()`
- `setLookAtProperties()`
- `bindSkeleton()`
- `parsePoseNodes()`
- `addGlobalSceneSettings()`

## 步骤11：创建统一导出

**文件**：`src/parse/tree/index.ts`

**内容**：导出所有模块的函数

## 步骤12：创建新的FBXTreeParser

**文件**：`src/parse/tree/FBXTreeParser.ts`

**目的**：整合所有模块，保持向后兼容

## 步骤13：更新主加载器

**文件**：`src/FBXLoaderRefactored.ts`

**修改**：更新导入和使用方式

## 步骤14：测试验证

**测试点**：
1. 类型检查通过：`pnpm check:ts`
2. Lint检查通过：`pnpm lint`
3. Demo正常运行
4. FBX文件加载正确

## 回滚计划

如果任何步骤出现问题：
```bash
git checkout -- src/parse/FBX-tree-parser.ts
rm -rf src/parse/tree/
```

## 验证命令

每个步骤后运行：
```bash
pnpm check:ts  # 类型检查
pnpm lint      # 代码风格检查
```

## 当前状态

- [x] 步骤1：创建目录结构
- [x] 步骤2：类型守护工具整理
- [x] 步骤3：连接解析功能
- [x] 步骤4：图像解析功能
- [x] 步骤5：纹理解析功能
- [x] 步骤6：材质解析功能
- [x] 步骤7：变形器解析功能
- [x] 步骤8：场景构建功能
- [x] 步骤9：模型解析功能
- [x] 步骤10：变换工具
- [x] 步骤11：统一导出
- [x] 步骤12：新FBXTreeParser
- [x] 步骤13：更新主加载器
- [x] 步骤14：测试验证（已通过 TS/Lint；Demo 正常）

## 变更说明（附加）

- 已完全删除旧文件 `src/parse/FBX-tree-parser.ts`，实现迁移至 `src/parse/tree/FBXTreeParser.ts`。
- 所有引用已统一到 `parse/tree` 入口或 `parse/tree/index.ts` 导出。
