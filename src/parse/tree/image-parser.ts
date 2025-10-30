import type { FBXVideoNode, IFBXTree } from '../../types';

// Parse context.fbxTree.Objects.Video for embedded image data
// These images are connected to textures in context.fbxTree.Objects.Textures
// via context.fbxTree.Connections.
export function parseImages (fbxTree: IFBXTree): Record<number, string> {
  const images: Record<number, string> = {};
  const blobs: Record<string, string | undefined> = {};

  if (!fbxTree.Objects) {
    throw new Error('FBXTree.Objects is undefined');
  }

  if ('Video' in fbxTree.Objects) {
    const videoNodes = fbxTree.Objects.Video;

    for (const nodeID in videoNodes) {
      const videoNode = videoNodes[nodeID];

      const id = parseInt(nodeID);

      images[id] = videoNode.RelativeFilename || videoNode.Filename;

      // raw image data is in videoNode.Content
      if ('Content' in videoNode) {
        const content = videoNode.Content;
        const arrayBufferContent = content instanceof ArrayBuffer && content.byteLength > 0;
        const base64Content = typeof content === 'string' && content !== '';

        if (arrayBufferContent || base64Content) {
          const image = parseImage(videoNode);

          blobs[videoNode.RelativeFilename || videoNode.Filename] = image;
        }
      }
    }
  }

  for (const id in images) {
    const filename = images[id];

    if (blobs[filename] !== undefined) {
      images[id] = blobs[filename]!;
    } else {
      images[id] = images[id]?.split('\\').pop() || images[id] || '';
    }
  }

  return images;
}

// Parse embedded image data in context.fbxTree.Video.Content
export function parseImage (videoNode: FBXVideoNode): string | undefined {
  const content = videoNode.Content;
  const fileName = videoNode.RelativeFilename || videoNode.Filename;
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();

  let type;

  switch (extension) {
    case 'bmp':
      type = 'image/bmp';

      break;
    case 'jpg':
    case 'jpeg':
      type = 'image/jpeg';

      break;
    case 'png':
      type = 'image/png';

      break;
    case 'webp':
      type = 'image/webp';

      break;
    case 'tif':
      type = 'image/tiff';

      break;
    case 'tga':
      type = 'image/tga';

      break;
    default:
      console.warn('FBXLoader: Image type "' + extension + '" is not supported.');

      return undefined;
  }

  if (typeof content === 'string') {
    // ASCII format

    return 'data:' + type + ';base64,' + content;
  } else {
    // Binary Format

    const array = new Uint8Array(content);

    return window.URL.createObjectURL(new Blob([array], { type: type }));
  }
}