import type { IParsingContext } from '../types';
import type { Document } from '@gltf-transform/core';
import { Matrix4, Vector3, Quaternion } from 'three';
import { createDocument } from './document-builder.js';

export interface GLBParsingOptions {
  embedImages?: boolean,
  flipY?: boolean,
  premultiplyAlpha?: boolean,
  yUp?: boolean,
}

export class GLBParsingContext {
  readonly base: IParsingContext;
  readonly document: Document;
  readonly options: GLBParsingOptions;

  // Only expose math classes from three.js
  readonly math = { Matrix4, Vector3, Quaternion };

  constructor (base: IParsingContext, options: GLBParsingOptions = {}) {
    this.base = base;
    this.options = options;
    this.document = createDocument({ options });
  }

  get fbxTree () { return this.base.fbxTree; }
  get connections () { return this.base.connections; }
  get loadingManager () { return this.base.loadingManager; }

  getConnections (id: number) { return this.base.getConnections(id); }
  getNodesByType<T> (nodeType: string) { return this.base.getNodesByType<T>(nodeType); }
}
