// FBX主加载器
import { TextureLoader, Group, Loader, FileLoader, LoaderUtils } from 'three';
import type { LoadingManager } from 'three';
import { global, type IFBXTree } from '../../constants';
import type { ParseContext } from '../types';
import { validateFBXTree, validateParseContext, validateParseResult } from '../utils/validation';
import { ConnectionParser } from '../parsers/ConnectionParser';
import { AnimationParser } from '../parsers/AnimationParser';
import { GeometryParser } from '../parsers/GeometryParser';
import { MaterialParser, TextureParser, ImageParser } from '../parsers/MaterialParser';
import { SceneParser } from '../parsers/SceneParser';
import { DeformerParser } from '../parsers/DeformerParser';
// import { FBXTreeParser } from '../FBX-tree-parser'; // 暂时注释掉，未使用

// 从原始FBX-loader导入解析器类和工具函数
import {
  BinaryParser,
  TextParser,
  isFbxFormatBinary,
  isFbxFormatASCII,
  getFbxVersion,
  convertArrayBufferToString,
} from '../../FBX-loader';

export class FBXLoader extends Loader {
  private textureLoader: TextureLoader;

  constructor (manager?: LoadingManager) {
    super(manager);
    this.textureLoader = new TextureLoader(this.manager);
  }

  // 加载方法
  override load (url: string, onLoad: (group: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: unknown) => void): void {
    const path = (this.path === '') ? LoaderUtils.extractUrlBase(url) : this.path;

    const loader = new FileLoader(this.manager);

    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(url, (buffer: string | ArrayBuffer) => {
      try {
        const group = this.parse(buffer as ArrayBuffer, path);

        onLoad(group);
      } catch (error) {
        if (onError) {
          onError(error);
        } else {
          console.error(error);
        }
        this.manager.itemError(url);
      }
    }, onProgress, onError);
  }

  // 主解析方法
  parse (buffer: ArrayBuffer, path: string): Group {
    // 设置资源路径
    this.textureLoader.setPath(this.resourcePath || path).setCrossOrigin(this.crossOrigin);

    // 使用原始的FBXTreeParser（暂时回退到原始实现）
    global.fbxTree = this.parseFBXBuffer(buffer);

    const fbxTree = global.fbxTree;

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

      // 将动画添加到场景
      const scene = context.sceneGraph;

      scene.animations = animations;

      // 验证解析结果
      const resultErrors = validateParseResult({
        scene,
        animations,
        geometries: geometryResult.geometries,
        materials: materialResult.materials,
        textures: materialResult.textures,
      });

      if (resultErrors.length > 0) {
        console.warn('Parse result validation warnings:', resultErrors);
      }

      return scene;
    } catch (error) {
      console.error('FBX parsing failed:', error);
      throw error;
    }
  }

  // 获取纹理加载器
  getTextureLoader (): TextureLoader {
    return this.textureLoader;
  }

  // 解析FBX缓冲区
  private parseFBXBuffer (buffer: ArrayBuffer): IFBXTree {
    // 检查是否为二进制格式
    if (isFbxFormatBinary(buffer)) {
      return new BinaryParser().parse(buffer);
    }

    // 处理ASCII格式
    const FBXText = convertArrayBufferToString(buffer);

    if (!isFbxFormatASCII(FBXText)) {
      throw new Error('FBXLoader: Unknown format.');
    }

    if (getFbxVersion(FBXText) < 7000) {
      throw new Error(`FBXLoader: FBX version not supported, FileVersion: ${getFbxVersion(FBXText)}`);
    }

    return new TextParser().parse(FBXText);
  }
}