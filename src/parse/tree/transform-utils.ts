import type { EulerOrder, Object3D, SkinnedMesh } from 'three';
import { AmbientLight, Color, Matrix4, Skeleton, Vector3 } from 'three';
import type { FBXModelNode, IParsingContext, FBXSkeleton, Object3DWithID } from '../../types';
import { extractMaterialValue, extractMatrixArray, extractNodeId, extractNumberArray, hasTarget } from '../../types/parsers/type-guards';
import { getEulerOrder } from '../utils';
import type { BufferGeometry } from 'three';

// parse the model node for transform data
export function getTransformData (model: Object3D, modelNode: FBXModelNode): void {
  const transformData: { inheritType?: number, eulerOrder?: EulerOrder, translation?: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number], preRotation?: [number, number, number], postRotation?: [number, number, number], scalingOffset?: [number, number, number], scalingPivot?: [number, number, number], rotationOffset?: [number, number, number], rotationPivot?: [number, number, number] } = {};

  if ('InheritType' in modelNode) {
    const inheritTypeValue = extractMaterialValue(modelNode.InheritType);

    if (typeof inheritTypeValue === 'string' || typeof inheritTypeValue === 'number') {
      transformData.inheritType = parseInt(String(inheritTypeValue));
    }
  }

  if ('RotationOrder' in modelNode) {
    const value = modelNode.RotationOrder.value;

    if (typeof value !== 'number') {
      throw new Error('THREE.FBXLoader: Invalid rotation order value');
    }
    transformData.eulerOrder = getEulerOrder(value) as EulerOrder;
  } else {
    transformData.eulerOrder = getEulerOrder(0) as EulerOrder;
  }

  if ('Lcl_Translation' in modelNode) {
    // 如果scale需要从100调整为1，position也需要相应调整
    const translationArray = extractNumberArray(modelNode.Lcl_Translation.value);

    if (translationArray && translationArray.length >= 3) {
      let scaleAdjustmentFactor = 1;

      if ('Lcl_Scaling' in modelNode) {
        const scaleArray = extractNumberArray(modelNode.Lcl_Scaling.value);

        if (scaleArray && scaleArray.length >= 3) {
          const scaleX = scaleArray[0];
          const scaleY = scaleArray[1];
          const scaleZ = scaleArray[2];

          if (scaleX === 100 || scaleY === 100 || scaleZ === 100) {
            scaleAdjustmentFactor = 100;
          }
        }
      }

      transformData.translation = [
        translationArray[0] / scaleAdjustmentFactor,
        translationArray[1] / scaleAdjustmentFactor,
        translationArray[2] / scaleAdjustmentFactor,
      ];
    }
  }

  if ('PreRotation' in modelNode) {
    const valueArray = extractNumberArray(modelNode.PreRotation.value);

    if (valueArray && valueArray.length >= 3) {
      transformData.preRotation = [
        Number(valueArray[0].toFixed(4)),
        Number(valueArray[1].toFixed(4)),
        Number(valueArray[2].toFixed(4)),
      ];
    }
  }

  if ('Lcl_Rotation' in modelNode) {
    const valueArray = extractNumberArray(modelNode.Lcl_Rotation.value);

    if (valueArray && valueArray.length >= 3) {
      transformData.rotation = [
        Number(valueArray[0].toFixed(4)),
        Number(valueArray[1].toFixed(4)),
        Number(valueArray[2].toFixed(4)),
      ];
    }
  }

  if ('PostRotation' in modelNode) {
    const valueArray = extractNumberArray(modelNode.PostRotation.value);

    if (valueArray && valueArray.length >= 3) {
      transformData.postRotation = [
        Number(valueArray[0].toFixed(4)),
        Number(valueArray[1].toFixed(4)),
        Number(valueArray[2].toFixed(4)),
      ];
    }
  }

  if ('Lcl_Scaling' in modelNode) {
    const scaleArray = extractNumberArray(modelNode.Lcl_Scaling.value);

    if (scaleArray && scaleArray.length >= 3) {
      transformData.scale = [
        scaleArray[0] === 100 ? 1 : scaleArray[0],
        scaleArray[1] === 100 ? 1 : scaleArray[1],
        scaleArray[2] === 100 ? 1 : scaleArray[2],
      ];
    }
  }

  if ('ScalingOffset' in modelNode) {
    const scalingOffsetArray = extractNumberArray(modelNode.ScalingOffset.value);

    if (scalingOffsetArray) {
      transformData.scalingOffset = scalingOffsetArray as [number, number, number];
    }
  }

  if ('ScalingPivot' in modelNode) {
    const scalingPivotArray = extractNumberArray(modelNode.ScalingPivot.value);

    if (scalingPivotArray) {
      transformData.scalingPivot = scalingPivotArray as [number, number, number];
    }
  }

  if ('RotationOffset' in modelNode) {
    const rotationOffsetArray = extractNumberArray(modelNode.RotationOffset.value);

    if (rotationOffsetArray) {
      transformData.rotationOffset = rotationOffsetArray as [number, number, number];
    }
  }

  if ('RotationPivot' in modelNode) {
    const rotationPivotArray = extractNumberArray(modelNode.RotationPivot.value);

    if (rotationPivotArray) {
      transformData.rotationPivot = rotationPivotArray as [number, number, number];
    }
  }

  model.userData.transformData = transformData;
}

// Set LookAt properties for cameras and lights
export function setLookAtProperties (model: Object3D, modelNode: FBXModelNode, context: IParsingContext): void {
  const connections = context.connections;
  const fbxTree = context.fbxTree;

  if (!connections || !fbxTree) {
    throw new Error('Global connections or FBX tree is undefined');
  }
  if ('LookAtProperty' in modelNode) {
    const children = connections.get((model as Object3DWithID).ID)?.children ?? [];

    children.forEach(child => {
      if (child.relationship === 'LookAtProperty') {
        const modelNode = fbxTree.Objects?.Model;

        if (!modelNode) {
          throw new Error('Model node is undefined');
        }
        const lookAtTarget = modelNode[child.ID];

        if ('Lcl_Translation' in lookAtTarget) {
          const posArray = extractNumberArray(lookAtTarget.Lcl_Translation.value);

          if (posArray && posArray.length >= 3) {
            let scaleAdjustmentFactor = 1;

            if ('Lcl_Scaling' in lookAtTarget) {
              const scaleArray = extractNumberArray(lookAtTarget.Lcl_Scaling.value);

              if (scaleArray && scaleArray.length >= 3) {
                const scaleX = scaleArray[0];
                const scaleY = scaleArray[1];
                const scaleZ = scaleArray[2];

                if (scaleX === 100 || scaleY === 100 || scaleZ === 100) {
                  scaleAdjustmentFactor = 100;
                }
              }
            }

            const pos = [
              posArray[0] / scaleAdjustmentFactor,
              posArray[1] / scaleAdjustmentFactor,
              posArray[2] / scaleAdjustmentFactor,
            ];

            if (hasTarget(model)) {
              model.target.position.fromArray(pos);
              const sceneGraph = context.sceneGraph;

              sceneGraph.add(model.target);
            } else {
              model.lookAt(new Vector3().fromArray(pos));
            }
          }
        }
      }
    });
  }
}

// Bind skeletons to skinned meshes
export function bindSkeleton (
  skeletons: Record<string, FBXSkeleton>,
  geometryMap: Map<number, BufferGeometry>,
  modelMap: Map<number, Object3D>,
  context: IParsingContext,
): void {
  const fbxTree = context.fbxTree;
  const connections = context.connections;

  if (!fbxTree || !connections) {
    throw new Error('Global fbxTree or connections is undefined');
  }

  const bindMatrices = parsePoseNodes(context);

  for (const ID in skeletons) {
    const skeleton = skeletons[ID];

    const parents = connections.get(parseInt(skeleton.ID))?.parents || [];

    parents.forEach(parent => {
      if (geometryMap.has(parent.ID)) {
        const geoID = parent.ID;
        const geoRelationships = connections.get(geoID) || { parents: [] };

        geoRelationships.parents.forEach(geoConnParent => {
          if (modelMap.has(geoConnParent.ID)) {
            const model = modelMap.get(geoConnParent.ID);

            if (model && model.type === 'SkinnedMesh') {
              const skinnedMesh = model as SkinnedMesh;

              skinnedMesh.bind(new Skeleton(skeleton.bones), bindMatrices[geoConnParent.ID]);
            }
          }
        });
      }
    });
  }
}

// Parse bind pose matrices from Pose nodes
export function parsePoseNodes (context: IParsingContext): Record<string, Matrix4> {
  const bindMatrices: Record<string, Matrix4> = {};
  const fbxTree = context.fbxTree;
  const connections = context.connections;

  if (!fbxTree || !connections || !fbxTree.Objects) {
    throw new Error('Global fbxTree or connections is undefined');
  }

  if ('Pose' in fbxTree.Objects) {
    const BindPoseNode = fbxTree.Objects.Pose;

    for (const nodeID in BindPoseNode) {
      const bindPoseNode = BindPoseNode[nodeID];

      if (bindPoseNode.attrType === 'BindPose' && bindPoseNode.NbPoseNodes > 0) {
        const poseNodes = bindPoseNode.PoseNode;

        if (Array.isArray(poseNodes)) {
          poseNodes.forEach(poseNode => {
            const nodeId = extractNodeId(poseNode);
            const matrixArray = extractMatrixArray(poseNode);

            bindMatrices[nodeId || 0] = new Matrix4().fromArray(matrixArray);
          });
        } else {
          const node = extractNodeId(poseNodes);
          const matrixArray = extractMatrixArray(poseNodes);

          if (!node) {
            throw new Error('THREE.FBXLoader: No node found for poseNode.');
          }

          bindMatrices[node] = new Matrix4().fromArray(matrixArray);
        }
      }
    }
  }

  return bindMatrices;
}

// Add global scene settings like ambient color and unit scale
export function addGlobalSceneSettings (context: IParsingContext): void {
  const fbxTree = context.fbxTree;

  if (!fbxTree || !fbxTree.GlobalSettings) {
    throw new Error('Global FBXTree is undefined');
  }
  if ('GlobalSettings' in fbxTree) {
    if ('AmbientColor' in fbxTree.GlobalSettings) {
      const ambientColorArray = extractNumberArray(fbxTree.GlobalSettings.AmbientColor.value);

      if (ambientColorArray && ambientColorArray.length >= 3) {
        const r = ambientColorArray[0];
        const g = ambientColorArray[1];
        const b = ambientColorArray[2];

        if (r !== 0 || g !== 0 || b !== 0) {
          const color = new Color().setRGB(r, g, b);

          context.sceneGraph.add(new AmbientLight(color, 1));
        }
      }
    }

    if ('UnitScaleFactor' in fbxTree.GlobalSettings) {
      context.sceneGraph.userData.unitScaleFactor = fbxTree.GlobalSettings.UnitScaleFactor.value;
    }
  }
}
