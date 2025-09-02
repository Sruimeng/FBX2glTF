// FBX 主加载器（简化版）
import { TextureLoader, Group, Loader } from 'three';
import type { LoadingManager } from 'three';
import type { ParseContext, ParserResult } from '../types';
import { global } from '../types';
import { DeformerParser, SceneParser, ConnectionParser, AnimationParser, GeometryParser, MaterialParser, TextureParser, ImageParser, BinaryParser, TextParser } from '../parsers';
import { convertArrayBufferToString, getFbxVersion, isFbxFormatASCII, isFbxFormatBinary, LoaderUtils, validateFBXTree, validateParseContext, validateParseResult } from '../utils';

export class FBXLoader extends Loader {
  private textureLoader: TextureLoader;

  constructor (manager?: LoadingManager) {
    super(manager);
    this.textureLoader = new TextureLoader(this.manager);
  }

  // 加载方法
  override async load (url: string, onLoad: (group: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: unknown) => void): Promise<void> {
    const path = (this.path === '') ? LoaderUtils.extractUrlBase(url) : this.path;
    const result = await LoaderUtils.loadBinaryFromUrl(path + url);
    const group = this.parse(result.data, path);

    onLoad(group);
    console.info('FBX loaded successfully', group);

  }

  // 主解析方法
  parse (buffer: ArrayBuffer, path: string): Group {
    // 设置资源路径
    this.textureLoader.setPath(this.resourcePath || path).setCrossOrigin(this.crossOrigin);

    // 解析FBX缓冲区
    const fbxTree = this.parseFBXBuffer(buffer);

    // 验证FBX树结构
    const validationErrors = validateFBXTree(fbxTree);

    if (validationErrors.length > 0) {
      throw new Error(`FBX tree validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
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
      throw new Error(`Parse context validation failed: ${contextErrors.map(e => e.message).join(', ')}`);
    }

    // 执行解析流程
    const result = this.executeParsing(context);

    // 验证解析结果
    const resultErrors = validateParseResult(result);

    if (resultErrors.length > 0) {
      console.warn('Parse result validation warnings:', resultErrors);
    }

    return result.scene;
  }

  // 执行解析流程
  private executeParsing (context: ParseContext): ParserResult {
    try {
      // 1. 解析连接关系
      const connectionParser = new ConnectionParser(context);

      context.connections = connectionParser.parse();
      global.connections = context.connections;

      // 2. 解析图像
      const imageParser = new ImageParser(context);
      const images = imageParser.parse();

      // 3. 解析纹理
      const textureParser = new TextureParser(context, this.textureLoader, this.manager);
      const textures = textureParser.parse(images);

      // 4. 解析材质
      const materialParser = new MaterialParser(context, this.textureLoader, this.manager);
      const materialResult = materialParser.parse(textures);

      // 5. 解析变形器
      const deformerParser = new DeformerParser(context);
      const deformers = deformerParser.parse();

      // 6. 解析几何体
      const geometryParser = new GeometryParser(context);
      const geometryResult = geometryParser.parse(deformers);

      // 7. 解析动画
      const animationParser = new AnimationParser(context);
      const animations = animationParser.parse();

      // 8. 解析场景
      const sceneParser = new SceneParser(context);

      sceneParser.parse(deformers, geometryResult.geometries, materialResult.materials);

      // 将动画添加到场景
      const scene = context.sceneGraph;

      scene.animations = animations;

      return {
        scene,
        animations,
        geometries: geometryResult.geometries,
        materials: materialResult.materials,
        textures: materialResult.textures,
      };
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
  private parseFBXBuffer (buffer: ArrayBuffer): any {
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
