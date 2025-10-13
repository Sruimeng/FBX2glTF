import { FileLoader, Group, Loader, LoaderUtils, TextureLoader } from 'three';
import type { LoaderOptions, ModelLoaderResult } from '../types';
import { convertArrayBufferToString, getFbxVersion, isFbxFormatASCII, isFbxFormatBinary } from './util';
import { BinaryParser } from './parse/FBX-binary-parser';
import { FBXTreeParser } from './parse/FBX-tree-parser';
import { TextParser } from './parse/FBX-text-parser';
import {
  global,
} from './constants';

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
class FBXLoader extends Loader<ModelLoaderResult> {
  result?: ModelLoaderResult;
  /**
   * Constructs a new FBX loader.
   *
   * @param {LoaderOptions} [options] - The loading options.
   */
  constructor (options?: LoaderOptions) {
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
    onLoad: (group: ModelLoaderResult) => void,
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
  parse (FBXBuffer: ArrayBuffer | string, path: string) {
    if (isFbxFormatBinary(FBXBuffer as ArrayBuffer)) {
      global.fbxTree = new BinaryParser().parse(FBXBuffer as ArrayBuffer);
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

      global.fbxTree = new TextParser().parse(FBXText);
    }

    const textureLoader = new TextureLoader(this.manager)
      .setPath(this.resourcePath || path)
      .setCrossOrigin(this.crossOrigin);

    const context = {
      fbxTree: global.fbxTree,
      connections: global.connections,
      sceneGraph: new Group(),
    };

    return new FBXTreeParser(context, textureLoader, this.manager).parse();
  }
}

export { FBXLoader };
