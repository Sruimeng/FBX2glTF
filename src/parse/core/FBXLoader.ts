// FBX主加载器
import { TextureLoader, LoadingManager, Group } from 'three';
import { global } from '../../constants';
import type { ParseContext, ParserResult } from '../types';
import { validateFBXTree, validateParseContext, validateParseResult } from '../utils/validation';
import { ConnectionParser } from '../parsers/ConnectionParser';
import { AnimationParser } from '../parsers/AnimationParser';
import { GeometryParser } from '../parsers/GeometryParser';
import { MaterialParser, TextureParser, ImageParser } from '../parsers/MaterialParser';
import { SceneParser } from '../parsers/SceneParser';
import { DeformerParser } from '../parsers/DeformerParser';

export class FBXLoader {
  private textureLoader: TextureLoader;
  private manager: LoadingManager;

  constructor (textureLoader?: TextureLoader, manager?: LoadingManager) {
    this.textureLoader = textureLoader || new TextureLoader();
    this.manager = manager || new LoadingManager();
  }

  // 主解析方法
  parse (fbxTree: any): ParserResult {
    // 验证FBX树结构
    const validationErrors = validateFBXTree(fbxTree);

    if (validationErrors.length > 0) {
      throw new Error(`FBX tree validation failed: ${validationErrors.map((e: any) => e.message).join(', ')}`);
    }

    // 设置全局FBX树
    global.fbxTree = fbxTree;

    // 创建解析上下文
    const context: ParseContext = {
      fbxTree,
      connections: new Map(),
      sceneGraph: new Group(),
    };

    // 验证解析上下文
    const contextErrors = validateParseContext(context);

    if (contextErrors.length > 0) {
      throw new Error(`Parse context validation failed: ${contextErrors.map((e: any) => e.message).join(', ')}`);
    }

    // 创建解析器
    const connectionParser = new ConnectionParser(context);
    const imageParser = new ImageParser(context);
    const textureParser = new TextureParser(context, this.textureLoader, this.manager);
    const materialParser = new MaterialParser(context, this.textureLoader, this.manager);
    const deformerParser = new DeformerParser(context);
    const geometryParser = new GeometryParser(context);
    const animationParser = new AnimationParser(context);
    const sceneParser = new SceneParser(context);

    // 解析步骤
    try {
      // 1. 解析连接关系
      context.connections = connectionParser.parse();
      global.connections = context.connections;

      // 2. 解析图像
      const images = imageParser.parse();

      // 3. 解析纹理
      const textures = textureParser.parse(images);

      // 4. 解析材质
      const materialResult = materialParser.parse(textures);

      // 5. 解析变形器
      const deformers = deformerParser.parse();

      // 6. 解析几何体
      const geometryResult = geometryParser.parse(deformers);

      // 7. 解析动画
      const animations = animationParser.parse();

      // 8. 解析场景
      sceneParser.parse(deformers, geometryResult.geometries, materialResult.materials);

      // 构建结果
      const result: ParserResult = {
        scene: context.sceneGraph,
        animations,
        geometries: geometryResult.geometries,
        materials: materialResult.materials,
        textures: materialResult.textures,
      };

      // 验证解析结果
      const resultErrors = validateParseResult(result);

      if (resultErrors.length > 0) {
        console.warn('Parse result validation warnings:', resultErrors);
      }

      return result;
    } catch (error) {
      console.error('FBX parsing failed:', error);
      throw error;
    }
  }

  // 获取纹理加载器
  getTextureLoader (): TextureLoader {
    return this.textureLoader;
  }

  // 获取加载管理器
  getManager (): LoadingManager {
    return this.manager;
  }

  // 设置纹理加载器
  setTextureLoader (textureLoader: TextureLoader): void {
    this.textureLoader = textureLoader;
  }

  // 设置加载管理器
  setManager (manager: LoadingManager): void {
    this.manager = manager;
  }
}