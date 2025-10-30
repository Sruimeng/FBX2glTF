import type { IParsingContext } from '../types';
import type { Document } from '@gltf-transform/core';
import { GLBParsingContext, type GLBParsingOptions } from './context';
import { writeGLB } from './glb-writer';

export interface FBXToGLBOptions extends GLBParsingOptions {
  embedImages?: boolean,
}

export interface FBXToGLBResult {
  document: Document,
  glb: ArrayBuffer,
}

export async function convertFBXToGLB (context: IParsingContext, options: FBXToGLBOptions = {}): Promise<FBXToGLBResult> {
  const glbContext = new GLBParsingContext(context, options);

  // Phase 1: minimal pipeline — empty scene Document
  const document = glbContext.document;

  // Phase 1: write GLB binary (no meshes yet)
  const glb = await writeGLB(document, { embedImages: options.embedImages });

  return { document, glb };
}
