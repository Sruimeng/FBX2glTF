/**
 * @file parse/FBX-geometry-parser.ts
 * @description FBX几何解析器
 */

import * as THREE from 'three';
import type { ParseContext } from '../types/core/fbx-types';

/**
 * FBX几何解析器
 */
export class GeometryParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  /**
   * 解析几何数据
   */
  parse (deformers: any): Map<number, THREE.BufferGeometry> {
    const geometryMap = new Map<number, THREE.BufferGeometry>();

    if (this.context.fbxTree.Objects && 'Geometry' in this.context.fbxTree.Objects) {
      const geometryNodes = (this.context.fbxTree.Objects as any).Geometry;

      for (const nodeID in geometryNodes) {
        const geometryNode = geometryNodes[nodeID];
        const id = parseInt(nodeID);

        // 简化的几何解析逻辑
        const geometry = this.parseGeometryNode(geometryNode);

        if (geometry) {
          geometryMap.set(id, geometry);
        }
      }
    }

    return geometryMap;
  }

  /**
   * 解析几何节点
   */
  private parseGeometryNode (geometryNode: any): THREE.BufferGeometry | null {
    const geometry = new THREE.BufferGeometry();
    
    console.log(`🔷 解析几何节点: ${geometryNode.attrName || 'Unknown'}`);

    // 解析顶点数据
    if (geometryNode.Vertices) {
      const vertices = geometryNode.Vertices.a || [];
      console.log(`  顶点数量: ${vertices.length / 3}`);
      
      if (vertices.length >= 3) {
        const positions = new Float32Array(vertices);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      }
    }

    // 解析法线数据
    if (geometryNode.Normals) {
      const normals = geometryNode.Normals.a || [];
      console.log(`  法线数量: ${normals.length / 3}`);
      
      if (normals.length >= 3) {
        const normalArray = new Float32Array(normals);
        geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
      }
    }

    // 解析UV数据
    if (geometryNode.LayerElementUV) {
      const uvs = geometryNode.LayerElementUV.UV?.a || [];
      console.log(`  UV数量: ${uvs.length / 2}`);
      
      if (uvs.length >= 2) {
        const uvArray = new Float32Array(uvs);
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
      }
    }

    // 解析索引数据
    if (geometryNode.PolygonVertexIndex) {
      const indices = geometryNode.PolygonVertexIndex.a || [];
      console.log(`  索引数量: ${indices.length}`);
      
      if (indices.length > 0) {
        geometry.setIndex(indices);
      }
    }

    // 计算边界框
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }
}