import type { LoadingManager, Texture, TextureLoader } from 'three';
import { RepeatWrapping, ClampToEdgeWrapping, Texture as ThreeTexture } from 'three';
import type { FBXTextureNode, FBXConnectionNode, IFBXTree } from '../../types';
import { extractNumberArray, setObjectID } from '../../types';

// Parse nodes in context.fbxTree.Objects.Texture
// These contain details such as UV scaling, cropping, rotation etc and are connected
// to images in context.fbxTree.Objects.Video
export async function parseTextures (
  fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
  images: Record<number, string>,
  manager: LoadingManager,
  textureLoader: TextureLoader
): Promise<Map<number, Texture>> {
  const textureMap = new Map();

  if (!fbxTree.Objects) {
    throw new Error('FBXTree Objects is undefined');
  }

  if ('Texture' in fbxTree.Objects) {
    const textureNodes = fbxTree.Objects.Texture;

    for (const nodeID in textureNodes) {
      const texture = await parseTexture(
        textureNodes[nodeID],
        images,
        connections,
        manager,
        textureLoader
      );

      if (!texture) {continue;}
      textureMap.set(parseInt(nodeID), texture);
    }
  }

  return textureMap;
}

// Parse individual node in context.fbxTree.Objects.Texture
export async function parseTexture (
  textureNode: FBXTextureNode,
  images: Record<number, string>,
  connections: Map<number, FBXConnectionNode>,
  manager: LoadingManager,
  textureLoader: TextureLoader
): Promise<Texture | undefined> {
  const texture = await loadTexture(textureNode, images, connections, manager, textureLoader);

  if (!texture) {
    return;
  }

  setObjectID(texture, textureNode.id);

  texture.name = textureNode.attrName;

  const wrapModeU = textureNode.WrapModeU;
  const wrapModeV = textureNode.WrapModeV;

  const valueU = wrapModeU !== undefined ? wrapModeU.value : 0;
  const valueV = wrapModeV !== undefined ? wrapModeV.value : 0;

  // http://download.autodesk.com/us/fbx/SDKdocs/FBX_SDK_Help/files/fbxsdkref/class_k_fbx_texture.html#889640e63e2e681259ea81061b85143a
  // 0: repeat(default), 1: clamp

  texture.wrapS = valueU === 0 ? RepeatWrapping : ClampToEdgeWrapping;
  texture.wrapT = valueV === 0 ? RepeatWrapping : ClampToEdgeWrapping;

  if ('Scaling' in textureNode) {
    const values = extractNumberArray(textureNode.Scaling.value);

    if (values && values.length >= 2) {
      texture.repeat.x = values[0];
      texture.repeat.y = values[1];
    }
  }

  if ('Translation' in textureNode) {
    const values = extractNumberArray(textureNode.Translation.value);

    if (values && values.length >= 2) {
      texture.offset.x = values[0];
      texture.offset.y = values[1];
    }
  }

  return texture;
}

// load a texture specified as a blob or data URI, or via an external URL using TextureLoader
export async function loadTexture (
  textureNode: FBXTextureNode,
  images: Record<number, string>,
  connections: Map<number, FBXConnectionNode>,
  manager: LoadingManager,
  textureLoader: TextureLoader
): Promise<Texture | undefined> {
  const extension = (textureNode.FileName.split('.').pop() || '').toLowerCase();

  let loader = manager.getHandler(`.${extension}`);

  if (loader === null) {
    loader = textureLoader;
  }

  const loaderPath = loader.path;

  if (!loaderPath) {
    loader.setPath(textureLoader.path);
  }

  const children = connections.get(textureNode.id)?.children;

  if (!children || children.length === 0) {
    console.warn('FBXLoader: No children found for texture node');

    return new ThreeTexture();
  }
  const child = children[0];

  let fileName;

  if (child !== undefined && images[child.ID] !== undefined) {
    fileName = images[child.ID];

    if (fileName.indexOf('blob:') === 0 || fileName.indexOf('data:') === 0) {
      loader.setPath('');
    }
  }

  if (fileName === undefined) {
    console.warn('FBXLoader: Undefined filename, creating placeholder texture.');

    return new ThreeTexture();
  }

  let texture;

  try {
    if ('loadAsync' in loader && typeof loader.loadAsync === 'function') {
      const loadedTexture = await loader.loadAsync(fileName);

      if (loadedTexture && typeof loadedTexture === 'object' && 'isTexture' in loadedTexture) {
        texture = loadedTexture as Texture;
      }
    } else {
      console.warn('FBXLoader: Loader does not support async loading');
    }
  } catch (error) {
    console.warn('FBXLoader: Error loading texture', fileName, error);
  }

  // revert to initial path
  loader.setPath(loaderPath);

  return texture;
}