import { FileLoader, Loader, LoaderUtils, TextureLoader } from 'three';
import { convertArrayBufferToString, getFbxVersion, isFbxFormatASCII, isFbxFormatBinary } from './util';
import { BinaryParser } from './parse/FBX-binary-parser';
import { FBXTreeParser } from './parse/FBX-tree-parser';
import { TextParser } from './parse/text';
import { ParsingContext } from './types';

/**
 * A loader for the FBX format.
 *
 * Requires FBX file to be >= 7.0 and in ASCII or >= 6400 in Binary format.
 * Versions lower than this may load but will probably have errors.
 *
 * Needs Support:
 * - Morph normals / blend shape normals
 *
 * FBX format references:
 * - [C++ SDK reference]{@link https://help.autodesk.com/view/FBX/2017/ENU/?guid=__cpp_ref_index_html}
 *
 * Binary format specification:
 * - [FBX binary file format specification]{@link https://code.blender.org/2013/08/fbx-binary-file-format-specification/}
 *
 * ```js
 * const loader = new FBXLoader();
 * const object = await loader.loadAsync( 'models/fbx/stanford-bunny.fbx' );
 * scene.add( object );
 * ```
 *
 * @augments Loader
 * @three_import import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
 */
export class FBXLoaderRefactored extends Loader<any> {
  result?: any;
  private _parsingContext?: ParsingContext;

  /**
   * 获取当前解析上下文
   */
  get context (): ParsingContext | undefined {
    return this._parsingContext;
  }
  /**
   * Constructs a new FBX loader.
   *
   * @param {LoaderOptions} [options] - The loading options.
   */
  constructor (options?: any) {
    const { manager } = options || {};

    super(manager);
  }

  /**
   * Starts loading from the given URL and passes the loaded FBX asset
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(Group)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  override load (
    url: string,
    onLoad: (group: any) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: unknown) => void,
  ) {
    const path = this.path === '' ? LoaderUtils.extractUrlBase(url) : this.path;

    const loader = new FileLoader(this.manager);

    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(
      url,
      async (buffer: string | ArrayBuffer) => {
        return onLoad(await this.parse(buffer as ArrayBuffer, path));

        // try {
        //   onLoad(scope.parse(buffer, path));
        // }
        // catch (e) {
        //   if (onError) {
        //     onError(e);
        //   }
        //   else {
        //     console.error(e);
        //   }

        //   scope.manager.itemError(url);
        // }
      },
      onProgress,
      onError,
    );
  }

  /**
   * Parses the given FBX data and returns the resulting group.
   *
   * @param {ArrayBuffer} FBXBuffer - The raw FBX data as an array buffer.
   * @param {string} path - The URL base path.
   * @return {Group} An object representing the parsed asset.
   */
  async parse (FBXBuffer: ArrayBuffer | string, path: string): Promise<any> {
    // 1. 解析 FBX 树结构
    const fbxTree = this.parseFBXTree(FBXBuffer);

    // 2. 构建连接映射
    const connections = this.buildConnections(fbxTree);

    // 3. 创建解析上下文 (替代 global state)
    this._parsingContext = new ParsingContext(
      fbxTree,
      connections,
      this.manager,
      false // wireframe 默认 false
    );

    // 4. 使用 FBXTreeParser 进行解析 (后续会被 SceneParser 替代)
    const textureLoader = new TextureLoader(this.manager)
      .setPath(this.resourcePath || path)
      .setCrossOrigin(this.crossOrigin);

    return new FBXTreeParser(textureLoader, this.manager, this._parsingContext).parse({ null: null }, this._parsingContext);
  }

  /**
   * 解析 FBX 树结构
   */
  private parseFBXTree (FBXBuffer: ArrayBuffer | string): any {
    // 先创建一个临时的上下文用于树解析
    const tempContext = new ParsingContext({}, new Map(), this.manager, false);

    if (isFbxFormatBinary(FBXBuffer as ArrayBuffer)) {
      return new BinaryParser(tempContext).parse(FBXBuffer as ArrayBuffer, tempContext);
    } else {
      const FBXText = convertArrayBufferToString(FBXBuffer as ArrayBuffer);

      if (!isFbxFormatASCII(FBXText)) {
        throw new Error('THREE.FBXLoader: Unknown format.');
      }

      if (getFbxVersion(FBXText) < 7000) {
        throw new Error(
          'THREE.FBXLoader: FBX version not supported, FileVersion: ' + getFbxVersion(FBXText),
        );
      }

      return new TextParser(tempContext).parse(FBXText);
    }
  }

  /**
   * 构建连接映射
   */
  private buildConnections (fbxTree: any): Map<number, any> {
    const connections = new Map<number, any>();

    if (fbxTree.Connections?.connections) {
      fbxTree.Connections.connections.forEach(([child, parent, connectionType]: [number, number, string]) => {
        connections.set(child, {
          children: [],
          parents: [{ ID: parent, connectionType }],
        });
      });
    }

    return connections;
  }
}