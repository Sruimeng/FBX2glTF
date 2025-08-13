// 解析器管理器
import type { TextureLoader, LoadingManager } from 'three';
import { ConnectionParser } from '../parsers/ConnectionParser';
import { AnimationParser } from '../parsers/AnimationParser';
import { GeometryParser } from '../parsers/GeometryParser';
import { MaterialParser, TextureParser, ImageParser } from '../parsers/MaterialParser';
import { SceneParser } from '../parsers/SceneParser';
import { DeformerParser } from '../parsers/DeformerParser';
import type { ParseContext } from '../types';

export class ParserManager {
  private context: ParseContext;
  private textureLoader: TextureLoader;
  private manager: LoadingManager;

  constructor (
    context: ParseContext,
    textureLoader: TextureLoader,
    manager: LoadingManager
  ) {
    this.context = context;
    this.textureLoader = textureLoader;
    this.manager = manager;
  }

  // 创建所有解析器
  createParsers () {
    return {
      connection: new ConnectionParser(this.context),
      image: new ImageParser(this.context),
      texture: new TextureParser(this.context, this.textureLoader, this.manager),
      material: new MaterialParser(this.context, this.textureLoader, this.manager),
      deformer: new DeformerParser(this.context),
      geometry: new GeometryParser(this.context),
      animation: new AnimationParser(this.context),
      scene: new SceneParser(this.context),
    };
  }

  // 获取解析上下文
  getContext (): ParseContext {
    return this.context;
  }

  // 更新解析上下文
  updateContext (updates: Partial<ParseContext>): void {
    this.context = { ...this.context, ...updates };
  }
}