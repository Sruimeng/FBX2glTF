// 变形器解析器
import { Matrix4 } from 'three';
import type {
  FBXDeformer,
  FBXSkeleton,
  RawBone,
  FBXMorphTarget,
  FBXRawTargets,
} from '../../constants';
import type { ParseContext } from '../types/common';

export interface Deformers {
  skeletons: Record<number, FBXSkeleton>,
  morphTargets: Record<number, FBXMorphTarget>,
}

export class DeformerParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  // 解析变形器
  parse (): Deformers {
    const skeletons: Record<number, FBXSkeleton> = {};
    const morphTargets: Record<number, FBXMorphTarget> = {};

    const fbxTree = this.context.fbxTree;

    if (!fbxTree || !fbxTree.Objects) {
      return { skeletons, morphTargets };
    }

    const objects = fbxTree.Objects;
    const deformers = objects.Deformer;

    if (deformers) {
      // 解析骨架
      this.parseSkeletons(deformers, skeletons);

      // 解析变形目标
      this.parseMorphTargets(deformers, morphTargets);
    }

    return { skeletons, morphTargets };
  }

  // 解析骨架
  private parseSkeletons (deformers: Record<string, FBXDeformer>, skeletons: Record<number, FBXSkeleton>): void {

    // 首先找到所有骨架
    const skeletonMap = new Map<number, FBXSkeleton>();

    for (const nodeID in deformers) {
      const deformer = deformers[nodeID];

      if (deformer.attrType === 'Cluster') {
        const skeleton = this.parseSkeleton(deformer);

        if (skeleton) {
          skeletonMap.set(skeleton.geometryID, skeleton);
        }
      }
    }

    // 组织骨架层次结构
    for (const [geometryID, skeleton] of skeletonMap) {
      skeletons[geometryID] = skeleton;
    }
  }

  // 解析单个骨架
  private parseSkeleton (deformer: FBXDeformer): FBXSkeleton | null {
    const deformerId = deformer.id || 0;

    // 查找关联的几何体
    const geometryId = this.findGeometryId(deformerId);

    if (!geometryId) {return null;}

    // 解析骨骼数据
    const rawBones: RawBone[] = [];

    if (deformer.Indexes && deformer.Weights) {
      const indices = deformer.Indexes.a;
      const weights = deformer.Weights.a;

      // 创建变换矩阵
      let transformLink = new Matrix4();

      if (deformer.TransformLink) {
        transformLink = this.parseMatrix(deformer.TransformLink.a);
      }

      // 创建原始骨骼
      const rawBone: RawBone = {
        ID: deformerId,
        indices: indices,
        weights: weights,
        transformLink: transformLink,
      };

      rawBones.push(rawBone);
    }

    return {
      ID: deformerId.toString(),
      rawBones: rawBones,
      bones: [],
      geometryID: geometryId,
    };
  }

  // 解析变形目标
  private parseMorphTargets (deformers: Record<string, FBXDeformer>, morphTargets: Record<number, FBXMorphTarget>): void {

    for (const nodeID in deformers) {
      const deformer = deformers[nodeID];

      if (deformer.attrType === 'BlendShape' || deformer.attrType === 'Morph') {
        const morphTarget = this.parseMorphTarget(deformer);

        if (morphTarget) {
          morphTargets[parseInt(nodeID)] = morphTarget;
        }
      }
    }
  }

  // 解析单个变形目标
  private parseMorphTarget (deformer: FBXDeformer): FBXMorphTarget | null {
    const connections = this.context.connections;
    const deformerId = deformer.id || 0;

    // 查找关联的几何体
    const geometryId = this.findGeometryId(deformerId);

    if (!geometryId) {return null;}

    // 解析变形目标数据
    const rawTargets: FBXRawTargets[] = [];

    // 查找子变形器
    const deformerConnections = connections.get(deformerId);

    if (deformerConnections) {
      // 这里需要进一步解析子变形器数据
      // 简化实现，实际需要更复杂的逻辑
    }

    return {
      id: deformerId.toString(),
      rawTargets: rawTargets,
    };
  }

  // 查找几何体ID
  private findGeometryId (deformerId: number): number | null {
    const connections = this.context.connections;
    const deformerConnections = connections.get(deformerId);

    if (deformerConnections) {
      for (const connection of deformerConnections.parents) {
        // 检查父对象是否为几何体
        // 这里需要根据实际FBX结构进行判断
        if (connection.relationship === 'Deformer') {
          return connection.ID;
        }
      }
    }

    return null;
  }

  // 解析矩阵
  private parseMatrix (matrixArray: number[]): Matrix4 {
    const matrix = new Matrix4();

    matrix.fromArray(matrixArray);

    return matrix;
  }
}