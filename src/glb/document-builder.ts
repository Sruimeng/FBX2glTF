import { Document } from '@gltf-transform/core';

export interface DocumentBuilderOptions {
  embedImages?: boolean,
  flipY?: boolean,
  premultiplyAlpha?: boolean,
  yUp?: boolean,
}

export function createDocument ({ options }: { options?: DocumentBuilderOptions }): Document {
  const document = new Document();

  // Create a default scene
  const scene = document.createScene('Scene');

  document.getRoot().setDefaultScene(scene);

  // Additional configuration will be added incrementally in subsequent phases
  return document;
}
