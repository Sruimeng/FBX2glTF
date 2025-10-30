import type { Document } from '@gltf-transform/core';
import { WebIO } from '@gltf-transform/core';

export interface GLBWriterOptions {
  embedImages?: boolean,
}

export async function writeGLB (document: Document, _options: GLBWriterOptions = {}): Promise<ArrayBuffer> {
  // 使用 WebIO 以支持浏览器/离线环境
  const io = new WebIO();
  const binary = await io.writeBinary(document);

  // Create a fresh ArrayBuffer and copy the bytes to avoid SharedArrayBuffer unions
  const out = new ArrayBuffer(binary.byteLength);

  new Uint8Array(out).set(binary);

  return out;
}
