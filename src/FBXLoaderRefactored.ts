import { FileLoader, Group, Loader, LoaderUtils, TextureLoader } from 'three';
import { convertArrayBufferToString, getFbxVersion, isFbxFormatASCII, isFbxFormatBinary } from './util';
import { BinaryParser } from './parse/FBX-binary-parser';
import { FBXTreeParser } from './parse/FBX-tree-parser';
import { TextParser } from './parse/FBX-text-parser';
import type { ModelLoaderResult } from '../types';

/**
 * 重构后的 FBX 加载器
 *
 * 使用新的模块化解析器架构，提供更好的类型安全性和可维护性
 *
 * ```js
 * const loader = new FBXLoaderRefactored();
 * const object = await loader.loadAsync( 'models/fbx/stanford-bunny.fbx' );
 * scene.add( object );
 * ```
 */
export class FBXLoaderRefactored extends Loader {
  /**
   * 构造函数
   */
  constructor () {
    super();
  }

  /**
   * 从 URL 加载 FBX 文件
   */
  override load (
    url: string,
    onLoad: (group: ModelLoaderResult) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: unknown) => void,
  ): void {
    const path = this.path === '' ? LoaderUtils.extractUrlBase(url) : this.path;

    const loader = new FileLoader(this.manager);

    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(
      url,
      async (buffer: string | ArrayBuffer) => {
        try {

          const result = await this.parse(buffer as ArrayBuffer, path);

          onLoad(result);
        } catch (error) {
          if (onError) {
            onError(error);
          } else {
            console.error('FBXLoaderRefactored:', error);
          }
          this.manager.itemError(url);
        }
      },
      onProgress,
      onError,
    );
  }

  /**
   * 解析 FBX 数据
   */
  async parse (
    FBXBuffer: ArrayBuffer | string,
    path: string,
  ): Promise<ModelLoaderResult> {
    try {
      // 解析 FBX 树结构
      let fbxTree: any;

      if (isFbxFormatBinary(FBXBuffer as ArrayBuffer)) {
        fbxTree = new BinaryParser().parse(FBXBuffer as ArrayBuffer);
      } else {
        const FBXText = convertArrayBufferToString(FBXBuffer as ArrayBuffer);

        if (!isFbxFormatASCII(FBXText)) {
          throw new Error('FBXLoaderRefactored: Unknown format.');
        }

        if (getFbxVersion(FBXText) < 7000) {
          throw new Error(
            'FBXLoaderRefactored: FBX version not supported, FileVersion: ' + getFbxVersion(FBXText),
          );
        }

        fbxTree = new TextParser().parse(FBXText);
      }

      // 创建纹理加载器
      const textureLoader = new TextureLoader(this.manager)
        .setPath(this.resourcePath || path)
        .setCrossOrigin(this.crossOrigin);

      // 创建解析上下文
      const context = {
        fbxTree,
        connections: (fbxTree).connections || {},
        sceneGraph: new Group(),
      };

      // 使用重构后的解析器
      const treeParser = new FBXTreeParser(context, textureLoader, this.manager);
      const result = await treeParser.parse();

      return result;

    } catch (error) {
      console.error('FBXLoaderRefactored: Failed to parse FBX file', error);
      throw error;
    }
  }

  /**
   * 异步加载方法
   */
  override async loadAsync (url: string): Promise<ModelLoaderResult> {
    return new Promise((resolve, reject) => {
      this.load(
        url,
        result => resolve(result),
        undefined,
        error => reject(error)
      );
    });
  }
}
