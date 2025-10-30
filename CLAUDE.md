# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 FBX 到 glTF 转换工具的 TypeScript 库，基于 Three.js 构建。项目支持将 FBX 文件格式转换为 glTF 格式，主要用于 3D 模型资产的转换处理。

**包名**: `@sruimeng/fbx2gltf`  
**主入口**: `src/index.ts`  
**主要导出**: `FBXLoaderRefactored`

## 开发命令

### 构建相关
```bash
pnpm build              # 完整构建（清理+声明文件+模块构建）
pnpm build:module       # 使用 Rollup 构建模块文件
pnpm build:declaration  # 生成 TypeScript 声明文件
pnpm build:docs         # 构建并生成 TypeDoc 文档
pnpm clean              # 清理 dist 目录
```

### 开发和预览
```bash
pnpm dev                # 启动 Vite 开发服务器
pnpm preview            # 构建并启动预览服务器
```

### 代码质量
```bash
pnpm lint               # ESLint 检查
pnpm lint:fix           # ESLint 自动修复
pnpm check:ts           # TypeScript 类型检查
```

## 项目架构

### 当前架构（重构中）

项目正在从单体架构向模块化架构迁移。当前存在两种结构：

**旧架构**：
- `src/parse/FBX-tree-parser.ts` - 单体解析器（1400+ 行，承担所有解析职责）
- `src/constants.ts` - 所有类型定义的集合
- `global` 对象 - 全局状态管理

**新架构**（正在实施）：
```
src/
├── types/              # 类型定义层
│   ├── core/          # 核心接口和上下文
│   ├── nodes/         # FBX 节点类型
│   └── enums/         # 枚举定义
├── parse/              # 基础解析器
│   ├── FBX-binary-parser.ts
│   ├── FBX-text-parser.ts
│   └── FBX-tree-parser.ts (待重构)
└── FBXLoaderRefactored.ts  # 主加载器
```

### 核心组件

1. **FBXLoaderRefactored**: 主加载器类，继承自 Three.js Loader
2. **BinaryParser**: 二进制 FBX 文件解析器
3. **TextParser**: 文本 FBX 文件解析器  
4. **FBXTreeParser**: FBX 树结构解析器（正重构中）
5. **几何体解析器**: `FBX-geometry-parser.ts`
6. **动画解析器**: `FBX-animation-parser.ts`

### 依赖关系

- **Three.js**: 核心 3D 渲染库
- **@gltf-transform/core**: glTF 转换核心功能
- **zod**: 运行时类型验证
- **fflate**: 文件压缩/解压缩

## 重构进展

项目正在进行重大架构重构，详见 `docs/gmini.md`。

### 重构目标
- 消除 `FBX-tree-parser.ts` 这个"上帝类"
- 移除 `global` 对象，使用 ParsingContext
- 建立清晰的类型系统
- 实现高内聚、低耦合的模块化架构

### 新的模块结构（计划中）
```
src/
├── parsers/           # 解析器层
│   ├── core/         # 核心基础设施
│   ├── FBX-*-parser.ts  # 各功能解析器
│   └── FBX-scene-parser.ts  # 场景组装器
├── types/            # 结构化类型定义
└── utils/            # 工具函数
```

## 构建系统

### Rollup 配置
- 生成三种格式：ES Module (`dist/index.mjs`)、CommonJS (`dist/index.js`)、UMD (`dist/index.min.js`)
- 使用 SWC 进行 TypeScript 编译以提升构建速度
- 支持代码压缩和 source map

### Vite 配置
- 开发服务器端口：8080
- 支持 iOS 9+ 的 legacy 构建
- 使用 SWC 插件进行快速编译

## 代码规范

### 提交规范
- 使用 Conventional Commits 规范
- 配置：`@commitlint/config-conventional`

### TypeScript 配置
- 严格模式启用
- 路径别名：`@sruim/fbx2gltf/*` 指向 `src/*`
- 目标：ESNext，模块：ESNext

## 注意事项

### 开发时
1. 项目使用 `pnpm` 作为包管理器
2. 构建前会自动执行 `pnpm clean`
3. 类型检查使用独立的 `tsconfig.check.json`
4. 暂时没有单元测试（test 目录为空）

### 重构期间
1. 注意新旧架构的共存状态
2. 优先使用新创建的类型和模块
3. 避免在旧模块中添加新功能
4. 参考 `docs/gmini.md` 了解重构计划

### 兼容性
- 支持 FBX 文件格式 >= 7.0 (ASCII) 或 >= 6400 (Binary)
- 浏览器支持：iOS 9+
- Node.js 支持：通过 CommonJS 构建支持