import { Matrix4 } from 'three';
import type {
  IFBXTree,
  FBXConnectionNode,
  FBXMeshNode,
  FBXRawTargets,
  FBXConnectionReference,
  FBXMorphTarget,
  FBXSkeleton,
  Deformers,
} from '../../types';

/**
 * 解析 Deformer 节点，生成 skeletons 与 morphTargets 映射
 */
export function parseDeformers (
  fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
): Deformers {
  const skeletons: Record<number, FBXSkeleton> = {};
  const morphTargets: Record<number, FBXMorphTarget> = {};
  const objects = fbxTree.Objects;

  if (!objects) {
    throw new Error('No objects found in fbxTree.');
  }

  if ('Deformer' in objects) {
    const DeformerNodes = objects.Deformer;

    for (const nodeID in DeformerNodes) {
      const deformerNode = DeformerNodes[nodeID];
      const relationships = connections.get(parseInt(nodeID));

      if (!relationships) {
        throw new Error('No relationships found for nodeID: ' + nodeID);
      }

      if (deformerNode?.attrType === 'Skin') {
        const skeleton = parseSkeleton(
          relationships,
          DeformerNodes as Record<number, FBXMeshNode>,
        );

        // 设置 ID 与几何体关联
        skeleton.ID = nodeID;

        if (relationships.parents.length > 1) {
          console.warn('THREE.FBXLoader: skeleton attached to more than one geometry is not supported.');
        }

        skeleton.geometryID = relationships.parents[0].ID;
        skeletons[parseInt(nodeID)] = skeleton;
      } else if (deformerNode?.attrType === 'BlendShape') {
        const morphTarget: FBXMorphTarget = {
          id: nodeID,
          rawTargets: undefined,
          skeleton: undefined,
        };

        morphTarget.rawTargets = parseMorphTargets(
          relationships,
          DeformerNodes as Record<number, FBXMeshNode>,
          connections,
        );

        morphTargets[parseInt(nodeID)] = morphTarget;
      }
    }
  }

  return {
    morphTargets,
    skeletons,
  };
}

/**
 * 解析单个 Skin/Cluster 形成 FBXSkeleton 原始骨骼数据
 */
export function parseSkeleton (
  relationships: FBXConnectionNode,
  deformerNodes: Record<number, FBXMeshNode>,
): FBXSkeleton {
  const rawBones: { ID: number, indices: number[], transformLink: Matrix4, weights: number[] }[] = [];

  relationships.children.forEach(child => {
    const boneNode = deformerNodes[child.ID];

    if (!boneNode || !boneNode.TransformLink) {
      throw new Error('THREE.FBXLoader: No bone node found for child ID: ' + child.ID);
    }

    if (boneNode.attrType !== 'Cluster') {
      return;
    }

    const rawBone = {
      ID: child.ID,
      indices: [] as number[],
      transformLink: new Matrix4().fromArray(boneNode.TransformLink.a),
      weights: [] as number[],
    };

    if (boneNode.Indexes && boneNode.Weights) {
      rawBone.indices = boneNode.Indexes.a;
      rawBone.weights = boneNode.Weights.a;
    }

    rawBones.push(rawBone);
  });

  return {
    bones: [],
    geometryID: 0,
    ID: '',
    rawBones,
  };
}

/**
 * 解析 BlendShapeChannel 形成原始 MorphTargets
 */
export function parseMorphTargets (
  relationships: FBXConnectionNode,
  deformerNodes: Record<number, FBXMeshNode>,
  connections: Map<number, FBXConnectionNode>,
): FBXRawTargets[] | undefined {
  const rawMorphTargets: FBXRawTargets[] = [];

  for (let i = 0; i < relationships.children.length; i++) {
    const child = relationships.children[i];
    const morphTargetNode = deformerNodes[child.ID];
    const nodeName = morphTargetNode.attrName || 'target' + i;
    const nodeID = morphTargetNode.id || i;
    const rawMorphTarget: FBXRawTargets = {
      fullWeights: morphTargetNode.FullWeights.a,
      geoID: 0,
      id: nodeID,
      initialWeight: morphTargetNode.DeformPercent,
      name: nodeName,
    };

    if (morphTargetNode.attrType !== 'BlendShapeChannel') {
      return;
    }

    let id = child.ID;

    if (typeof child.ID !== 'number') {
      id = parseInt(child.ID);
    }

    rawMorphTarget.geoID
      = connections.get(id)?.children.filter((c: FBXConnectionReference) => c.relationship === undefined)[0]?.ID || 0;

    rawMorphTargets.push(rawMorphTarget);
  }

  return rawMorphTargets;
}

