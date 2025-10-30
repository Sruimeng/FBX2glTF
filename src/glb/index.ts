import type { IParsingContext } from '../types';
import type { Document } from '@gltf-transform/core';
import { GLBParsingContext, type GLBParsingOptions } from './context';
import { writeGLB } from './glb-writer';
import { populateDocumentFromFBX } from './node-mapper.js';
import { populateMeshesFromFBX } from './mesh-mapper.js';

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

  // Phase 2: 基于 FBXTree/Connections 的数学-only 节点映射
  populateDocumentFromFBX(glbContext);

  // Phase 3: 解析几何并生成 Mesh/Primitive/Accessor，挂载到节点上
  populateMeshesFromFBX(glbContext);

  // 写出 GLB 二进制（包含节点与网格）
  const glb = await writeGLB(document, { embedImages: options.embedImages });

  return { document, glb };
}
