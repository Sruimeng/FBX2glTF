# 📋 FBX 加载器重构实施指南

## 📖 概述
1. **Global 对象重构** - 消除全局状态依赖
2. **类型系统重构** - 建立清晰的类型架构  
3. **上帝类重构** - 拆分 `FBX-tree-parser.ts`

---

## 🎯 第一阶段：Global 对象重构

### 1.1 当前 Global 对象分析

#### 当前 Global 结构
```typescript
// src/constants.ts
export interface Global {
  connections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree,
  sceneGraph: Group,
  wireframe?: boolean,
}

export const global: Global = {
  connections: new Map(),
  fbxTree: {},
  sceneGraph: new Group(),
};
```

#### 使用情况分析
通过代码扫描发现 `global` 对象在以下文件中被广泛使用：

- **FBXLoaderRefactored.ts**: 设置 `fbxTree`
- **FBX-animation-parser.ts**: 8处使用 `global.fbxTree`, `global.connections`, `global.sceneGraph`
- **FBX-geometry-parser.ts**: 3处使用 `global.fbxTree`, `global.connections`
- **FBX-tree-parser.ts**: 20+处使用，是最主要的依赖者

### 1.2 解析上下文设计

#### 创建解析上下文接口
```typescript
// src/types/core/context.ts
import type { LoadingManager } from 'three';
import type { Group } from 'three';
import type { FBXConnectionNode, IFBXTree } from '../nodes';

/**
 * FBX 解析上下文接口
 * 提供解析过程中需要的所有数据和工具
 */
export interface IParsingContext {
  readonly fbxTree: IFBXTree;
  readonly connections: Map<number, FBXConnectionNode>;
  readonly sceneGraph: Group;
  readonly loadingManager: LoadingManager;
  readonly wireframe?: boolean;
}

/**
 * 解析上下文实现
 * 不可变的数据中心，替代 global 对象
 */
export class ParsingContext implements IParsingContext {
  private readonly _fbxTree: IFBXTree;
  private readonly _connections: Map<number, FBXConnectionNode>;
  private readonly _sceneGraph: Group;
  private readonly _loadingManager: LoadingManager;
  private readonly _wireframe?: boolean;

  constructor(
    fbxTree: IFBXTree,
    connections: Map<number, FBXConnectionNode>,
    loadingManager: LoadingManager,
    wireframe?: boolean
  ) {
    // 冻结对象，防止意外修改
    this._fbxTree = Object.freeze(fbxTree);
    this._connections = Object.freeze(connections);
    this._loadingManager = loadingManager;
    this._wireframe = wireframe;
    
    // 创建场景图
    this._sceneGraph = new Group();
  }

  // Getters
  get fbxTree(): IFBXTree { return this._fbxTree; }
  get connections(): Map<number, FBXConnectionNode> { return this._connections; }
  get sceneGraph(): Group { return this._sceneGraph; }
  get loadingManager(): LoadingManager { return this._loadingManager; }
  get wireframe(): boolean | undefined { return this._wireframe; }

  // 便捷方法
  /**
   * 根据 ID 获取 FBX 节点
   */
  getNodeById<T = unknown>(id: number): T | undefined {
    return this._fbxTree.Objects?.[id] as T;
  }

  /**
   * 获取指定 ID 的连接关系
   */
  getConnections(id: number): FBXConnectionNode | undefined {
    return this._connections.get(id);
  }

  /**
   * 根据类型获取所有节点
   */
  getNodesByType<T = unknown>(nodeType: string): Map<number, T> {
    const nodes = new Map<number, T>();
    const objects = this._fbxTree.Objects;

    if (!objects) return nodes;

    Object.entries(objects).forEach(([id, node]) => {
      if ((node as any).attrType === nodeType) {
        nodes.set(parseInt(id), node as T);
      }
    });

    return nodes;
  }

  /**
   * 获取与指定节点关联的所有子节点
   */
  getConnectedNodes(parentId: number): FBXConnectionNode[] {
    const connections: FBXConnectionNode[] = [];
    
    this._connections.forEach((connection) => {
      if (connection.parent === parentId) {
        connections.push(connection);
      }
    });

    return connections;
  }

  /**
   * 查找节点的父节点
   */
  getParentNode(childId: number): FBXConnectionNode | null {
    for (const connection of this._connections.values()) {
      if (connection.child === childId) {
        return connection;
      }
    }
    return null;
  }
}
```

### 1.3 抽象解析器基类设计

#### 解析器接口定义
```typescript
// src/types/core/parser.ts
import type { LoadingManager } from 'three';
import type { IParsingContext } from './context';

/**
 * 解析器基础接口
 */
export interface IParser<TInput, TOutput> {
  parse(input: TInput, context: IParsingContext): TOutput;
}

/**
 * 异步解析器接口
 */
export interface IAsyncParser<TInput, TOutput> extends IParser<TInput, TOutput> {
  parse(input: TInput, context: IParsingContext): Promise<TOutput>;
}

/**
 * 解析器抽象基类
 * 提供通用功能和工具方法
 */
export abstract class BaseParser<TInput, TOutput> implements IParser<TInput, TOutput> {
  protected context: IParsingContext;

  constructor(context: IParsingContext) {
    if (!context) {
      throw new Error('ParsingContext is required');
    }
    this.context = context;
  }

  /**
   * 子类必须实现的解析方法
   */
  abstract parse(input: TInput, context: IParsingContext): TOutput;

  /**
   * 统一的日志记录
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.constructor.name}]`;
    switch (level) {
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * 输入验证钩子
   */
  protected validateInput(input: TInput): void {
    // 默认实现，子类可重写
    if (input === undefined || input === null) {
      throw new Error('Input cannot be null or undefined');
    }
  }

  /**
   * 获取当前上下文的便捷方法
   */
  protected get fbxTree() { return this.context.fbxTree; }
  protected get connections() { return this.context.connections; }
  protected get sceneGraph() { return this.context.sceneGraph; }
  protected get loadingManager() { return this.context.loadingManager; }
  protected get wireframe() { return this.context.wireframe; }

  /**
   * 便捷方法：根据ID获取节点
   */
  protected getNodeById<T = unknown>(id: number): T | undefined {
    return this.context.getNodeById<T>(id);
  }

  /**
   * 便捷方法：获取节点连接
   */
  protected getConnections(id: number): FBXConnectionNode | undefined {
    return this.context.getConnections(id);
  }

  /**
   * 便捷方法：根据类型获取节点
   */
  protected getNodesByType<T = unknown>(nodeType: string): Map<number, T> {
    return this.context.getNodesByType<T>(nodeType);
  }
}

/**
 * 异步解析器抽象基类
 */
export abstract class AsyncBaseParser<TInput, TOutput> extends BaseParser<TInput, TOutput> implements IAsyncParser<TInput, TOutput> {
  
  /**
   * 子类必须实现的异步解析方法
   */
  abstract parse(input: TInput, context: IParsingContext): Promise<TOutput>;

  /**
   * 异步输入验证
   */
  protected async validateInputAsync(input: TInput): Promise<void> {
    // 默认调用同步验证
    this.validateInput(input);
  }
}
```

### 1.4 Global 重构实施步骤

#### 步骤1：创建新的类型架构
```bash
# 创建目录结构
mkdir -p src/types/core
mkdir -p src/types/nodes
mkdir -p src/types/enums
mkdir -p src/parsers/core
```

#### 步骤2：实现解析上下文
创建文件 `src/types/core/context.ts`（代码如上所示）

#### 步骤3：实现解析器基类
创建文件 `src/types/core/parser.ts`（代码如上所示）

#### 步骤4：重构 FBXLoaderRefactored
```typescript
// src/FBXLoaderRefactored.ts (重构后)
import { Loader } from 'three';
import { convertArrayBufferToString, getFbxVersion, isFbxFormatASCII, isFbxFormatBinary } from './util';
import { BinaryParser } from './parse/FBX-binary-parser';
import { TextParser } from './parse/FBX-text-parser';
import { ParsingContext } from './types/core/context';
import { SceneParser } from './parsers/FBX-scene-parser';

export class FBXLoaderRefactored extends Loader {
  private _parsingContext?: ParsingContext;

  constructor(manager?: LoadingManager) {
    super(manager);
  }

  async parse(data: ArrayBuffer): Promise<ModelLoaderResult> {
    // 1. 解析 FBX 树结构
    const fbxTree = this.parseFBXTree(data);
    
    // 2. 构建连接映射
    const connections = this.buildConnections(fbxTree);
    
    // 3. 创建解析上下文 (替代 global)
    this._parsingContext = new ParsingContext(
      fbxTree,
      connections,
      this.manager,
      false // wireframe 默认 false
    );

    // 4. 使用场景解析器进行完整解析
    const sceneParser = new SceneParser(this._parsingContext);
    return await sceneParser.parse();
  }

  private parseFBXTree(data: ArrayBuffer): IFBXTree {
    const isBinary = isFbxFormatBinary(data);
    
    if (isBinary) {
      const binaryParser = new BinaryParser();
      return binaryParser.parse(data);
    } else {
      const text = convertArrayBufferToString(data);
      const textParser = new TextParser();
      return textParser.parse(text);
    }
  }

  private buildConnections(fbxTree: IFBXTree): Map<number, FBXConnectionNode> {
    const connections = new Map<number, FBXConnectionNode>();
    
    if (fbxTree.Connections?.connections) {
      fbxTree.Connections.connections.forEach(([child, parent, connectionType]) => {
        connections.set(child, {
          child,
          parent,
          connectionType
        });
      });
    }
    
    return connections;
  }

  // 保留向后兼容的方法
  get context(): ParsingContext | undefined {
    return this._parsingContext;
  }
}
```

#### 步骤5：渐进式迁移现有解析器
以动画解析器为例：

```typescript
// src/parse/FBX-animation-parser.ts (重构后)
import { BaseParser } from '../types/core/parser';
import type { IParsingContext } from '../types/core/context';

// 旧的函数改为方法
export class AnimationParser extends BaseParser<void, AnimationClip[]> {
  
  parse(_input: void, context: IParsingContext): AnimationClip[] {
    // 替换 global.fbxTree.Objects
    const objects = context.fbxTree.Objects;
    // 替换 global.connections
    const connections = context.connections;
    // 替换 global.sceneGraph
    const sceneGraph = context.sceneGraph;

    // 原有逻辑保持不变...
    
    return animations;
  }

  // 将原有的函数改为私有方法
  private parseAnimationCurve(...params: any[]) {
    // 替换 global 为 this.context
    const objects = this.context.fbxTree.Objects;
    // ...
  }
}
```

---

## 🏗️ 第二阶段：类型系统重构

### 2.1 新的类型架构

#### 核心类型 (`src/types/core/index.ts`)
```typescript
export * from './parser';
export * from './context';

// 解析结果类型
export interface ModelLoaderResult {
  scene: Group;
  animations: AnimationClip[];
  modelInfo?: {
    name: string;
    version: string;
    author?: string;
  };
}

// 解析选项
export interface ParsingOptions {
  wireframe?: boolean;
  generateMipmaps?: boolean;
  flipY?: boolean;
  premultiplyAlpha?: boolean;
}
```

#### 节点类型重构 (`src/types/nodes/`)
```typescript
// src/types/nodes/index.ts
export * from './geometry';
export * from './material';
export * from './texture';
export * from './animation';
export * from './model';
export * from './connection';

// src/types/nodes/geometry.ts
export interface FBXGeometryNode {
  id: number;
  attrName: string;
  attrType: string;
  vertices?: number[];
  normals?: number[];
  uvs?: number[][];
  indices?: number[];
  // ... 其他几何属性
}

// src/types/nodes/material.ts
export interface FBXMaterialNode {
  id: number;
  attrName: string;
  attrType: string;
  Lambert?: MaterialProperties;
  Phong?: MaterialProperties;
  // ... 材质属性
}

// src/types/nodes/connection.ts
export interface FBXConnectionNode {
  child: number;
  parent: number;
  connectionType: string;
}
```

### 2.2 类型迁移策略

#### 迁移映射表
```typescript
// src/types/migration.ts
// 重新导出旧类型，保持向后兼容
export {
  // 从 constants.ts 迁移的核心类型
  IFBXTree,
  FBXConnectionNode,
  FBXMaterialNode,
  // ... 其他类型
} from '../constants';

// 新类型优先导出
export type {
  IParsingContext,
  IParser,
  IAsyncParser,
  ModelLoaderResult,
} from './core';

// 提供类型别名帮助迁移
export type GlobalContext = IParsingContext;
export type FBXLoaderResult = ModelLoaderResult;
```

### 2.3 类型验证工具

```typescript
// src/utils/validation.ts
import { z } from 'zod';

// FBX 节点基础验证模式
export const fbxNodeSchema = z.object({
  id: z.number(),
  attrName: z.string(),
  attrType: z.string(),
});

// 几何体节点验证模式
export const geometryNodeSchema = fbxNodeSchema.extend({
  vertices: z.array(z.number()).optional(),
  indices: z.array(z.number()).optional(),
});

// 类型守卫函数
export function isValidFBXNode(node: unknown): node is FBXNode {
  return fbxNodeSchema.safeParse(node).success;
}

export function isValidGeometryNode(node: unknown): node is FBXGeometryNode {
  return geometryNodeSchema.safeParse(node).success;
}
```

---

## 🎯 第三阶段：上帝类重构

### 3.1 FBX-tree-parser.ts 分析

当前 `FBX-tree-parser.ts` 的主要职责：
1. 连接关系解析 (parseConnections)
2. 图像数据解析 (parseImages) 
3. 纹理解析 (parseTextures)
4. 材质解析 (parseMaterials)
5. 变形器解析 (parseDeformers)
6. 几何体解析 (调用已有解析器)
7. 场景构建 (buildSceneGraph)
8. 模型解析 (parseModels)
9. 动画解析 (调用已有解析器)

### 3.2 解析器拆分设计

#### 图像解析器
```typescript
// src/parsers/FBX-image-parser.ts
import { AsyncBaseParser } from '../types/core/parser';
import type { IParsingContext } from '../types/core/context';

export class ImageParser extends AsyncBaseParser<void, Map<number, string>> {
  
  async parse(_input: void, context: IParsingContext): Promise<Map<number, string>> {
    this.log('开始解析图像数据');
    
    const imageMap = new Map<number, string>();
    const videoNodes = this.getNodesByType<FBXVideoNode>('Video');
    
    for (const [id, videoNode] of videoNodes) {
      if (videoNode.Content) {
        const blob = new Blob([videoNode.Content]);
        const url = URL.createObjectURL(blob);
        imageMap.set(id, url);
      }
    }
    
    this.log(`解析完成，共 ${imageMap.size} 张图像`);
    return imageMap;
  }
}
```

#### 纹理解析器
```typescript
// src/parsers/FBX-texture-parser.ts
import { AsyncBaseParser } from '../types/core/parser';
import type { IParsingContext } from '../types/core/context';
import { TextureLoader } from 'three';

export class TextureParser extends AsyncBaseParser<Map<number, string>, Map<number, Texture>> {
  private textureLoader: TextureLoader;

  constructor(context: IParsingContext) {
    super(context);
    this.textureLoader = new TextureLoader(context.loadingManager);
  }

  async parse(imageMap: Map<number, string>, context: IParsingContext): Promise<Map<number, Texture>> {
    this.log('开始解析纹理');
    
    const textureMap = new Map<number, Texture>();
    const textureNodes = this.getNodesByType<FBXTextureNode>('Texture');
    
    for (const [id, textureNode] of textureNodes) {
      try {
        // 查找关联的图像
        const connections = this.getConnectedNodes(id);
        const videoId = connections.find(c => c.connectionType === 'Texture')?.child;
        
        if (videoId && imageMap.has(videoId)) {
          const imageUrl = imageMap.get(videoId)!;
          const texture = await this.loadTexture(imageUrl);
          textureMap.set(id, texture);
        }
      } catch (error) {
        this.log(`纹理 ${id} 解析失败: ${error}`, 'warn');
      }
    }
    
    this.log(`解析完成，共 ${textureMap.size} 个纹理`);
    return textureMap;
  }

  private async loadTexture(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }
}
```

#### 材质解析器
```typescript
// src/parsers/FBX-material-parser.ts
import { BaseParser } from '../types/core/parser';
import { 
  MeshStandardMaterial, 
  MeshPhongMaterial,
  Color,
  DoubleSide 
} from 'three';

export class MaterialParser extends BaseParser<Map<number, Texture>, Map<number, Material>> {
  
  parse(textureMap: Map<number, Texture>, context: IParsingContext): Map<number, Material> {
    this.log('开始解析材质');
    
    const materialMap = new Map<number, Material>();
    const materialNodes = this.getNodesByType<FBXMaterialNode>('Material');
    
    for (const [id, materialNode] of materialNodes) {
      try {
        const material = this.createMaterial(materialNode, textureMap);
        materialMap.set(id, material);
      } catch (error) {
        this.log(`材质 ${id} 解析失败: ${error}`, 'warn');
      }
    }
    
    this.log(`解析完成，共 ${materialMap.size} 个材质`);
    return materialMap;
  }

  private createMaterial(materialNode: FBXMaterialNode, textureMap: Map<number, Texture>): Material {
    const properties = materialNode.Lambert || materialNode.Phong || {};
    
    // 基础材质属性
    const materialParams = {
      color: this.parseColor(properties.DiffuseColor),
      emissive: this.parseColor(properties.EmissiveColor),
      specular: this.parseColor(properties.SpecularColor),
      shininess: properties.Shininess?.value || 30,
      transparent: properties.Opacity?.value < 1,
      opacity: properties.Opacity?.value || 1,
      side: DoubleSide
    };

    // 查找关联的纹理
    const connections = this.getConnectedNodes(materialNode.id);
    const textureId = connections.find(c => c.connectionType === 'Texture')?.child;
    
    if (textureId && textureMap.has(textureId)) {
      (materialParams as any).map = textureMap.get(textureId);
    }

    // 根据材质类型创建
    return materialNode.Phong 
      ? new MeshPhongMaterial(materialParams)
      : new MeshStandardMaterial(materialParams);
  }

  private parseColor(colorProperty?: any): Color {
    if (!colorProperty?.value) return new Color(0xffffff);
    
    const values = Array.isArray(colorProperty.value) 
      ? colorProperty.value 
      : [colorProperty.value];
      
    return new Color(...values.slice(0, 3));
  }
}
```

#### 场景解析器（调度中心）
```typescript
// src/parsers/FBX-scene-parser.ts
import { AsyncBaseParser } from '../types/core/parser';
import { Group } from 'three';
import { ImageParser } from './FBX-image-parser';
import { TextureParser } from './FBX-texture-parser';
import { MaterialParser } from './FBX-material-parser';
import { GeometryParser } from './FBX-geometry-parser';
import { AnimationParser } from './FBX-animation-parser';

export class SceneParser extends AsyncBaseParser<void, ModelLoaderResult> {
  
  async parse(_input: void, context: IParsingContext): Promise<ModelLoaderResult> {
    this.log('开始场景解析');
    
    // 1. 解析图像（如果存在）
    const imageParser = new ImageParser(context);
    const imageMap = await imageParser.parse(void 0, context);
    
    // 2. 解析纹理（基于图像）
    const textureParser = new TextureParser(context);
    const textureMap = await textureParser.parse(imageMap, context);
    
    // 3. 解析材质（基于纹理）
    const materialParser = new MaterialParser(context);
    const materialMap = materialParser.parse(textureMap, context);
    
    // 4. 解析几何体
    const geometryParser = new GeometryParser(context);
    const { geometryMap, geoInfoMap } = geometryParser.parse(void 0, context);
    
    // 5. 构建场景图
    this.buildSceneGraph(context, materialMap, geometryMap);
    
    // 6. 解析动画
    const animationParser = new AnimationParser(context);
    const animations = animationParser.parse(void 0, context);
    
    this.log('场景解析完成');
    
    return {
      scene: context.sceneGraph,
      animations,
      modelInfo: this.extractModelInfo(context.fbxTree)
    };
  }

  private buildSceneGraph(
    context: IParsingContext, 
    materialMap: Map<number, Material>,
    geometryMap: Map<number, BufferGeometry>
  ): void {
    const modelNodes = context.getNodesByType<FBXModelNode>('Model');
    
    for (const [id, modelNode] of modelNodes) {
      const model = this.createModel(modelNode, materialMap, geometryMap, context);
      if (model) {
        context.sceneGraph.add(model);
      }
    }
  }

  private createModel(
    modelNode: FBXModelNode,
    materialMap: Map<number, Material>,
    geometryMap: Map<number, BufferGeometry>,
    context: IParsingContext
  ): Object3D | null {
    // 查找关联的几何体和材质
    const connections = context.getConnectedNodes(modelNode.id);
    
    const geometryId = connections.find(c => c.connectionType === 'Geometry')?.child;
    const materialId = connections.find(c => c.connectionType === 'Material')?.child;
    
    if (!geometryId) return null;
    
    const geometry = geometryMap.get(geometryId);
    const material = materialId ? materialMap.get(materialId) : undefined;
    
    if (!geometry) return null;
    
    const mesh = new Mesh(geometry, material);
    mesh.name = modelNode.attrName;
    
    // 设置变换
    if (modelNode.properties) {
      mesh.position.fromArray(modelNode.properties.slice(4, 7));
      mesh.rotation.fromArray(modelNode.properties.slice(8, 11));
      mesh.scale.fromArray(modelNode.properties.slice(12, 15));
    }
    
    return mesh;
  }

  private extractModelInfo(fbxTree: IFBXTree) {
    return {
      name: fbxTree.FBXHeaderExtension?.SceneInfo?.Title || 'Unknown',
      version: fbxTree.FBXHeaderExtension?.FBXVersion?.toString() || '0',
      author: fbxTree.FBXHeaderExtension?.SceneInfo?.Author
    };
  }
}
```

### 3.3 重构实施步骤

#### 步骤1：创建解析器目录
```bash
mkdir -p src/parsers/core
```

#### 步骤2：实现各功能解析器
按照上面的代码示例，逐个创建：
- `FBX-image-parser.ts`
- `FBX-texture-parser.ts`  
- `FBX-material-parser.ts`
- `FBX-scene-parser.ts`

#### 步骤3：重构现有解析器
- 将 `FBX-geometry-parser.ts` 改为继承 `BaseParser`
- 将 `FBX-animation-parser.ts` 改为继承 `BaseParser`

#### 步骤4：更新主入口
```typescript
// src/index.ts
export { FBXLoaderRefactored } from './FBXLoaderRefactored';
export type { ModelLoaderResult, IParsingContext } from './types/core';
export { ParsingContext } from './types/core/context';
```

---

## 📊 迁移时间表

### 第1周：Global 对象重构
- **Day 1-2**: 创建解析上下文和基类
- **Day 3-4**: 重构 FBXLoaderRefactored
- **Day 5**: 迁移一个解析器作为示例

### 第2周：类型系统重构  
- **Day 1-2**: 重组类型定义
- **Day 3-4**: 创建类型验证工具
- **Day 5**: 更新所有导入

### 第3-4周：上帝类重构
- **Week 3**: 实现各功能解析器
- **Week 4**: 集成测试和优化

---

## 🧪 测试策略

### 单元测试示例
```typescript
// test/parsers/TextureParser.test.ts
import { TextureParser } from '../../src/parsers/FBX-texture-parser';
import { createMockContext } from '../helpers/context';

describe('TextureParser', () => {
  let parser: TextureParser;
  let mockContext: IParsingContext;

  beforeEach(() => {
    mockContext = createMockContext();
    parser = new TextureParser(mockContext);
  });

  it('should parse textures correctly', async () => {
    const imageMap = new Map([[1, 'blob:test-image-url']]);
    const textureMap = await parser.parse(imageMap, mockContext);
    
    expect(textureMap.size).toBeGreaterThan(0);
  });

  it('should handle missing images gracefully', async () => {
    const emptyImageMap = new Map();
    const textureMap = await parser.parse(emptyImageMap, mockContext);
    
    expect(textureMap.size).toBe(0);
  });
});
```

### 集成测试
```typescript
// test/integration/FBXLoader.test.ts
import { FBXLoaderRefactored } from '../../src/FBXLoaderRefactored';

describe('FBX Integration', () => {
  it('should parse complete FBX file', async () => {
    const loader = new FBXLoaderRefactored();
    const fbxData = loadTestFile('sample.fbx');
    
    const result = await loader.parse(fbxData);
    
    expect(result.scene).toBeDefined();
    expect(result.animations).toBeDefined();
    expect(result.modelInfo).toBeDefined();
  });
});
```

---

## 🎯 重构收益

### 代码质量提升
- **可测试性**: 每个解析器可独立测试
- **可维护性**: 职责分离，修改影响范围小
- **可扩展性**: 新功能只需添加新解析器
- **类型安全**: 编译期发现更多错误

### 开发效率提升
- **调试便利**: 问题定位更精确
- **协作友好**: 团队成员可并行开发不同模块
- **文档清晰**: 代码结构自文档化

---

## ⚠️ 注意事项

### 向后兼容
- 保持现有 API 不变
- 旧类型通过 re-export 支持
- 渐进式迁移，不破坏现有功能

### 性能考虑
- 解析上下文使用不可变对象
- 避免不必要的数据复制
- 异步解析器提升大文件处理性能

### 错误处理
- 统一的错误处理机制
- 详细的错误日志
- 优雅的降级策略

---

## 📚 参考资源

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Three.js Documentation](https://threejs.org/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---

*本文档将随着重构进展持续更新*