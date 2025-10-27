import type { EulerOrder } from 'three';
import type {
  Object3D,
} from 'three';
import {
  AnimationClip,
  Euler,
  MathUtils,
  Matrix4,
  NumberKeyframeTrack,
  PropertyBinding,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from 'three';
import { convertFBXTimeToSeconds, getEulerOrder } from './utils';
import { BaseParser, type IParsingContext, type AnimationCurve, type AnimationCurveRelationship, type AnimationNode, type CurveNode, type RawClip } from '../types';
import type { FBXAnimationCurveNode, FBXAnimationStack } from '../types/nodes';

interface FBXAnimationCurve {
  id?: number,
  KeyTime?: { a: number[] },
  KeyValueFloat?: { a: number[] },
}

interface ProcessedAnimationCurve extends AnimationCurve {
  id: number,
  times: number[],
  values: number[],
}

// 扩展 Object3D 接口以包含 ID 属性
interface Object3DWithID extends Object3D {
  ID?: number,
}

// parse animation data from FBXTree
export class AnimationParser extends BaseParser<null, AnimationClip[]> {
  constructor (context: IParsingContext) {
    super(context);
  }

  private getConnectionID (connection: { parents: { ID: number }[] } | { children: { ID: number }[] } | undefined): number | undefined {
    if (!connection) {
      return undefined;
    }
    // 处理 parents 情况
    if ('parents' in connection && connection.parents && connection.parents.length > 0) {
      return connection.parents[0].ID;
    }
    // 处理 children 情况
    if ('children' in connection && connection.children && connection.children.length > 0) {
      return connection.children[0].ID;
    }

    return undefined;
  }

  // take raw animation clips and turn them into three.js animation clips
  parse (_input: null, context: IParsingContext) {
    const animationClips = [];

    const rawClips = this.parseClips();

    if (rawClips !== undefined) {
      for (const key in rawClips) {
        const rawClip = rawClips[key];

        const clip = this.addClip(rawClip);

        animationClips.push(clip);
      }
    }

    return animationClips;
  }

  parseClips (): Record<string, RawClip> | undefined {
    const objects = this.context.fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }
    // since the actual transformation data is stored in FBXTree.Objects.AnimationCurve,
    // if this is undefined we can safely assume there are no animations
    if (objects.AnimationCurve === undefined) {
      return undefined;
    }

    const curveNodesMap = this.parseAnimationCurveNodes();

    this.parseAnimationCurves(curveNodesMap);

    const layersMap = this.parseAnimationLayers(curveNodesMap);
    const rawClips = this.parseAnimStacks(layersMap);

    return rawClips;
  }

  // parse nodes in FBXTree.Objects.AnimationCurveNode
  // each AnimationCurveNode holds data for an animation transform for a model (e.g. left arm rotation )
  // and is referenced by an AnimationLayer
  parseAnimationCurveNodes (): Map<number, CurveNode> {
    const objects = this.context.fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }
    const rawCurveNodes = objects.AnimationCurveNode;

    const curveNodesMap: Map<number, CurveNode> = new Map();

    for (const nodeID in rawCurveNodes) {
      const rawCurveNode: FBXAnimationCurveNode = rawCurveNodes[nodeID];
      const attrName = rawCurveNode.attrName || '';
      const id = rawCurveNode.id || rawCurveNode.ID || 0;

      if (attrName.match(/S|R|T|DeformPercent/) !== null) {
        const curveNode: CurveNode = {
          attr: attrName,
          curves: {
            morph: {
              id: 0,
              times: [],
              values: [],
            },
            x: {
              id: 0,
              times: [],
              values: [],
            },
            y: {
              id: 0,
              times: [],
              values: [],
            },
            z: {
              id: 0,
              times: [],
              values: [],
            },
          },
          id,
        };

        curveNodesMap.set(curveNode.id, curveNode);
      }
    }

    return curveNodesMap;
  }

  // parse nodes in FBXTree.Objects.AnimationCurve and connect them up to
  // previously parsed AnimationCurveNodes. Each AnimationCurve holds data for a single animated
  // axis ( e.g. times and values of x rotation)
  parseAnimationCurves (curveNodesMap: Map<number, CurveNode>) {
    const objects = this.context.fbxTree.Objects;

    if (!objects) {
      throw new Error('FBXTree.Objects is undefined');
    }
    const rawCurves = objects.AnimationCurve;

    // TODO: Many values are identical up to roundoff error, but won't be optimised
    // e.g. position times: [0, 0.4, 0. 8]
    // position values: [7.23538335023477e-7, 93.67518615722656, -0.9982695579528809, 7.23538335023477e-7, 93.67518615722656, -0.9982695579528809, 7.235384487103147e-7, 93.67520904541016, -0.9982695579528809]
    // clearly, this should be optimised to
    // times: [0], positions [7.23538335023477e-7, 93.67518615722656, -0.9982695579528809]
    // this shows up in nearly every FBX file, and generally time array is length > 100

    for (const nodeID in rawCurves) {
      const rawCurve: FBXAnimationCurve = rawCurves[nodeID];
      const id = rawCurve.id || 0;
      const animationCurve: ProcessedAnimationCurve = {
        id,
        times: rawCurve.KeyTime ? rawCurve.KeyTime.a.map(convertFBXTimeToSeconds) : [],
        values: rawCurve.KeyValueFloat ? rawCurve.KeyValueFloat.a : [],
      };

      const relationships = this.context.connections.get(animationCurve.id);

      if (relationships !== undefined) {
        const parent = relationships.parents[0];

        if (parent && typeof parent.ID !== 'undefined') {
          const animationCurveID = parent.ID;
          const animationCurveRelationship = parent.relationship;

          // 检查 relationship 是否是字符串
          if (typeof animationCurveRelationship === 'string') {
            // 检查 curveNodesMap 中是否存在该 ID
            const curveNode = curveNodesMap.get(animationCurveID);

            if (curveNode) {
              if (animationCurveRelationship.match(/X/)) {
                if (curveNode.curves) {
                  curveNode.curves.x = animationCurve;
                }
              } else if (animationCurveRelationship.match(/Y/)) {
                if (curveNode.curves) {
                  curveNode.curves.y = animationCurve;
                }
              } else if (animationCurveRelationship.match(/Z/)) {
                if (curveNode.curves) {
                  curveNode.curves.z = animationCurve;
                }
              } else if (animationCurveRelationship.match(/DeformPercent/)) {
                if (curveNode.curves) {
                  curveNode.curves.morph = animationCurve;
                }
              }
            }
          }
        }
      }
    }
  }

  // parse nodes in FBXTree.Objects.AnimationLayer. Each layers holds references
  // to various AnimationCurveNodes and is referenced by an AnimationStack node
  // note: theoretically a stack can have multiple layers, however in practice there always seems to be one per stack
  parseAnimationLayers (curveNodesMap: Map<number, CurveNode>): Map<number, AnimationNode[]> {
    const objects = this.context.fbxTree.Objects;

    const animationLayer = objects?.AnimationLayer;
    const models = objects?.Model;
    const connections = this.context.connections;
    const sceneGraph = this.context.sceneGraph;

    if (!animationLayer || !connections || !models || !sceneGraph || !objects) {
      throw new Error('FBXTree.Objects.AnimationLayer is undefined');
    }

    const rawLayers = animationLayer;

    const layersMap = new Map();

    for (const nodeID in rawLayers) {
      const layerCurveNodes: AnimationNode[] = [];

      const connection = connections.get(parseInt(nodeID));

      if (connection !== undefined) {
        // all the animationCurveNodes used in the layer
        const children = connection.children;

        children.forEach((child, i) => {
          if (curveNodesMap.has(child.ID)) {
            const curveNode = curveNodesMap.get(child.ID);

            if (!curveNode) {
              return;
            }
            // check that the curves are defined for at least one axis, otherwise ignore the curveNode
            if (
              curveNode.curves?.x !== undefined
              || curveNode.curves?.y !== undefined
              || curveNode.curves?.z !== undefined
            ) {
              if (layerCurveNodes[i] === undefined) {
                const connectionParents = connections.get(child.ID)?.parents;
                const validParent = connectionParents?.find(parent => parent.relationship !== undefined);
                const modelID = validParent?.ID;

                if (modelID !== undefined) {
                  const rawModel = models[modelID.toString()];

                  if (rawModel === undefined) {
                    console.warn('THREE.FBXLoader: Encountered a unused curve.', child);

                    return;
                  }
                  const rawModelID = rawModel.id || 0;
                  const node: AnimationNode = {
                    ID: rawModelID,
                    initialPosition: [0, 0, 0],
                    initialRotation: [0, 0, 0],
                    initialScale: [1, 1, 1],
                    modelName: rawModel.attrName
                      ? PropertyBinding.sanitizeNodeName(rawModel.attrName)
                      : '',
                  };

                  sceneGraph.traverse((child: Object3DWithID) => {
                    if (child.ID === rawModel.id) {
                      node.transform = child.matrix;

                      if (child.userData.transformData) {
                        node.eulerOrder = child.userData.transformData.eulerOrder;
                      }
                    }
                  });

                  if (!node.transform) {
                    node.transform = new Matrix4();
                  }

                  // if the animated model is pre rotated, we'll have to apply the pre rotations to every
                  // animation value as well
                  if ('PreRotation' in rawModel && rawModel.PreRotation?.value) {
                    const value = rawModel.PreRotation.value;

                    if (Array.isArray(value) && value.length >= 3) {
                      node.preRotation = [value[0], value[1], value[2]];
                    }
                  }
                  if ('PostRotation' in rawModel && rawModel.PostRotation?.value) {
                    const value = rawModel.PostRotation.value;

                    if (Array.isArray(value) && value.length >= 3) {
                      node.postRotation = [value[0], value[1], value[2]];
                    }
                  }
                  layerCurveNodes[i] = node;
                }
              }

              if (layerCurveNodes[i]) {
                switch (curveNode.attr) {
                  case 'T':
                    layerCurveNodes[i].T = curveNode;

                    break;
                  case 'R':
                    layerCurveNodes[i].R = curveNode;

                    break;
                  case 'S':
                    layerCurveNodes[i].S = curveNode;

                    break;
                  case 'DeformPercent':
                    layerCurveNodes[i].DeformPercent = curveNode;

                    break;
                  default:
                    break;
                }
                // layerCurveNodes[ i ][ curveNode.attr ] = curveNode;
              }
            } else if (curveNode.curves?.morph !== undefined) {
              if (layerCurveNodes[i] === undefined) {
                const deformerID = this.getConnectionID(connections.get(child.ID)) || 0;
                const morpherID = this.getConnectionID(connections.get(deformerID)) || 0;
                const geoID = this.getConnectionID(connections.get(morpherID)) || 0;

                // assuming geometry is not used in more than one model
                const modelID = this.getConnectionID(connections.get(geoID)) || 0;
                const models = objects.Model;

                if (!models) {
                  throw new Error('FBXTree.Objects.Model is undefined');
                }
                const rawModel = models[modelID];

                const node: AnimationNode = {
                  ID: 0,
                  initialPosition: [],
                  initialRotation: [],
                  initialScale: [],
                  modelName: rawModel.attrName
                    ? PropertyBinding.sanitizeNodeName(rawModel.attrName)
                    : '',
                  morphName: objects.Deformer?.[deformerID]?.attrName,
                };

                layerCurveNodes[i] = node;
              }
              if (layerCurveNodes[i] !== undefined) {
                switch (curveNode.attr) {
                  case 'T':
                    layerCurveNodes[i].T = curveNode;

                    break;
                  case 'R':
                    layerCurveNodes[i].R = curveNode;

                    break;
                  case 'S':
                    layerCurveNodes[i].S = curveNode;

                    break;
                  case 'DeformPercent':
                    layerCurveNodes[i].DeformPercent = curveNode;

                    break;
                  default:
                    break;
                }
              }
              // layerCurveNodes[ i ][ attr ] = curveNode;
              // layerCurveNodes[ i ]
              // [ attr ] = curveNode;
            }
          }
        });

        layersMap.set(parseInt(nodeID), layerCurveNodes);
      }
    }

    return layersMap;
  }

  // parse nodes in FBXTree.Objects.AnimationStack. These are the top level node in the animation
  // hierarchy. Each Stack node will be used to create an AnimationClip
  parseAnimStacks (layersMap: Map<number, AnimationNode[]>) {
    const rawStacks = this.context.fbxTree.Objects?.AnimationStack as Record<string, FBXAnimationStack>;
    const connections = this.context.connections;

    if (!rawStacks || !connections) {
      throw new Error('FBXTree.Objects.AnimationStack or this.context.connections is undefined');
    }

    // connect the stacks (clips) up to the layers
    const rawClips: Record<string, RawClip> = {};

    for (const nodeID in rawStacks) {
      const children = connections.get(parseInt(nodeID))?.children || [];
      const rawStack: FBXAnimationStack = rawStacks[nodeID];

      if (children.length > 1) {
        // it seems like stacks will always be associated with a single layer. But just in case there are files
        // where there are multiple layers per stack, we'll display a warning
        console.warn(
          'THREE.FBXLoader: Encountered an animation stack with multiple layers, this is currently not supported. Ignoring subsequent layers.',
        );
      }

      const connectionID = this.getConnectionID({ children: [children[0]] });
      const layer = connectionID ? layersMap.get(connectionID) : undefined;

      if (!layer) {
        throw new Error('Layer not found for nodeID: ' + nodeID);
      }

      rawClips[nodeID] = {
        layer: layer,
        name: rawStack.attrName || '',
      };
    }

    return rawClips;
  }

  addClip (rawClip: RawClip) {
    let tracks: (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] = [];

    rawClip.layer.forEach(rawTracks => {
      tracks = tracks.concat(this.generateTracks(rawTracks));
    });

    return new AnimationClip(rawClip.name, -1, tracks);
  }

  generateTracks (rawTracks: AnimationNode) {
    const tracks: (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] = [];

    let initialPosition: Vector3 | [number, number, number] = new Vector3();
    let initialScale: Vector3 | [number, number, number] = new Vector3();

    if (rawTracks.transform) {
      rawTracks.transform.decompose(initialPosition, new Quaternion(), initialScale);
    }

    initialPosition = initialPosition.toArray();
    initialScale = initialScale.toArray();

    if (rawTracks.T !== undefined && Object.keys(rawTracks.T.curves ?? {}).length > 0) {
      const positionTrack = this.generateVectorTrack(
        rawTracks.modelName,
        rawTracks.T.curves as AnimationCurveRelationship,
        initialPosition,
        'position',
      );

      if (positionTrack !== undefined) {
        tracks.push(positionTrack);
      }
    }

    if (rawTracks.R !== undefined && Object.keys(rawTracks.R.curves ?? {}).length > 0) {
      if (rawTracks.R.curves) {
        const rotationTrack = this.generateRotationTrack(
          rawTracks.modelName,
          rawTracks.R.curves,
          rawTracks.preRotation ?? [0, 0, 0],
          rawTracks.postRotation ?? [0, 0, 0],
          rawTracks.eulerOrder || 'ZYX',
        );

        if (rotationTrack !== undefined) {
          tracks.push(rotationTrack);
        }
      }
    }

    if (rawTracks.S !== undefined && Object.keys(rawTracks.S.curves ?? {}).length > 0) {
      if (rawTracks.S.curves) {
        const scaleTrack = this.generateVectorTrack(
          rawTracks.modelName,
          rawTracks.S.curves,
          initialScale,
          'scale',
        );

        if (scaleTrack !== undefined) {
          tracks.push(scaleTrack);
        }
      }
    }

    if (rawTracks.DeformPercent !== undefined) {
      const morphTrack = this.generateMorphTrack(rawTracks);

      if (morphTrack !== undefined) {
        tracks.push(morphTrack);
      }
    }

    return tracks;
  }

  generateVectorTrack (
    modelName: string,
    curves: { x: AnimationCurve, y: AnimationCurve, z: AnimationCurve },
    initialValue: [number, number, number],
    type: string,
  ) {
    // 确保所有必需的曲线都存在
    if (!curves.x || !curves.y || !curves.z) {
      return undefined;
    }
    const times = this.getTimesForAllAxes(curves);
    const values = this.getKeyframeTrackValues(times, curves, initialValue);

    const numberValues: number[] = values.map(v => typeof v === 'number' ? v : Number(v));

    return new VectorKeyframeTrack(modelName + '.' + type, times, numberValues);
  }

  generateRotationTrack (
    modelName: string,
    curves: { x?: AnimationCurve, y?: AnimationCurve, z?: AnimationCurve },
    preRotation: [number, number, number],
    postRotation: [number, number, number],
    eulerOrder: EulerOrder,
  ) {
    let times;
    let values;
    let preRotationQuat: number[] | Euler | Quaternion = preRotation;
    let postRotationQuat: number[] | Euler | Quaternion = postRotation;

    if (curves.x !== undefined && curves.y !== undefined && curves.z !== undefined) {
      const result = this.interpolateRotations(curves.x, curves.y, curves.z, eulerOrder);

      times = result[0];
      values = result[1];
    }

    // For Maya models using "Joint Orient", Euler order only applies to rotation, not pre/post-rotations
    const eulerOrderStr = getEulerOrder(0);
    const defaultEulerOrder: EulerOrder = eulerOrderStr as EulerOrder;

    if (preRotationQuat !== undefined) {
      preRotationQuat = preRotationQuat.map(MathUtils.degToRad);
      // preRotation.push(defaultEulerOrder);

      preRotationQuat = new Euler(
        preRotationQuat[0],
        preRotationQuat[1],
        preRotationQuat[2],
        defaultEulerOrder,
      );
      preRotationQuat = new Quaternion().setFromEuler(preRotationQuat);
    }

    if (postRotationQuat !== undefined) {
      postRotationQuat = postRotationQuat.map(MathUtils.degToRad);
      // postRotationQuat.push(defaultEulerOrder);

      postRotationQuat = new Euler(
        postRotationQuat[0],
        postRotationQuat[1],
        postRotationQuat[2],
        defaultEulerOrder,
      );
      postRotationQuat = new Quaternion().setFromEuler(postRotationQuat).invert();

      // postRotation = new Euler().fromArray(postRotation);
      // postRotation = new Quaternion().setFromEuler(postRotation).invert();
    }

    const quaternion = new Quaternion();
    const euler = new Euler();

    const quaternionValues: number[] = [];

    if (!values || !times) {
      return new QuaternionKeyframeTrack(modelName + '.quaternion', [0], [0]);
    }

    for (let i = 0; i < values.length; i += 3) {
      euler.set(values[i], values[i + 1], values[i + 2], eulerOrder);
      quaternion.setFromEuler(euler);

      if (preRotationQuat !== undefined) {
        quaternion.premultiply(preRotationQuat);
      }
      if (postRotationQuat !== undefined) {
        quaternion.multiply(postRotationQuat);
      }

      // Check unroll
      if (i > 2) {
        const prevQuat = new Quaternion().fromArray(quaternionValues, ((i - 3) / 3) * 4);

        if (prevQuat.dot(quaternion) < 0) {
          quaternion.set(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
        }
      }

      quaternion.toArray(quaternionValues, (i / 3) * 4);
    }

    return new QuaternionKeyframeTrack(modelName + '.quaternion', times, quaternionValues);
  }

  generateMorphTrack (rawTracks: AnimationNode) {
    const curves = rawTracks.DeformPercent?.curves?.morph;

    if (!curves) {
      throw new Error('curves is undefined');
    }
    const sceneGraph = this.context.sceneGraph;

    if (!sceneGraph) {
      throw new Error('sceneGraph is undefined');
    }
    const values
      = curves.values.map(val => {
        return val / 100;
      }) || [];
    const sceneObject = sceneGraph.getObjectByName(rawTracks.modelName);

    if (!sceneObject || !('morphTargetDictionary' in sceneObject)) {
      throw new Error(`Morph target dictionary not found for model: ${rawTracks.modelName}`);
    }

    const morphTargetDictionary = sceneObject.morphTargetDictionary as Record<string, number>;
    const morphNum = morphTargetDictionary[rawTracks.morphName ?? ''] ?? 0;

    return new NumberKeyframeTrack(
      rawTracks.modelName + '.morphTargetInfluences[' + morphNum + ']',
      curves.times,
      values,
    );
  }

  // For all animated objects, times are defined separately for each axis
  // Here we'll combine the times into one sorted array without duplicates
  getTimesForAllAxes (curves: {
    morph?: AnimationCurve,
    x?: AnimationCurve,
    y?: AnimationCurve,
    z?: AnimationCurve,
  }) {
    let times: number[] = [];

    // first join together the times for each axis, if defined
    if (curves.x !== undefined) {
      times = times.concat(curves.x.times);
    }
    if (curves.y !== undefined) {
      times = times.concat(curves.y.times);
    }
    if (curves.z !== undefined) {
      times = times.concat(curves.z.times);
    }

    // then sort them
    times = times.sort(function (a, b) {
      return a - b;
    });

    // and remove duplicates
    if (times.length > 1) {
      let targetIndex = 1;
      let lastValue = times[0];

      for (let i = 1; i < times.length; i++) {
        const currentValue = times[i];

        if (currentValue !== lastValue) {
          times[targetIndex] = currentValue;
          lastValue = currentValue;
          targetIndex++;
        }
      }

      times = times.slice(0, targetIndex);
    }

    return times;
  }

  getKeyframeTrackValues (
    times: number[],
    curves: {
      morph?: AnimationCurve,
      x: AnimationCurve,
      y: AnimationCurve,
      z: AnimationCurve,
    },
    initialValue: [number, number, number],
  ) {
    const prevValue = initialValue;

    const values: (number | undefined)[] = [];

    let xIndex = -1;
    let yIndex = -1;
    let zIndex = -1;

    times.forEach(function (time) {
      if (curves.x) {xIndex = curves.x.times.indexOf(time);}
      if (curves.y) {yIndex = curves.y.times.indexOf(time);}
      if (curves.z) {zIndex = curves.z.times.indexOf(time);}

      // if there is an x value defined for this frame, use that
      if (xIndex !== -1) {
        const xValue = curves.x.values[xIndex];

        values.push(xValue);
        prevValue[0] = xValue;
      } else {
        // otherwise use the x value from the previous frame
        values.push(prevValue[0]);
      }

      if (yIndex !== -1) {
        const yValue = curves.y.values[yIndex];

        values.push(yValue);
        prevValue[1] = yValue;
      } else {
        values.push(prevValue[1]);
      }

      if (zIndex !== -1) {
        const zValue = curves.z.values[zIndex];

        values.push(zValue);
        prevValue[2] = zValue;
      } else {
        values.push(prevValue[2]);
      }
    });

    return values;
  }

  // Rotations are defined as Euler angles which can have values  of any size
  // These will be converted to quaternions which don't support values greater than
  // PI, so we'll interpolate large rotations
  interpolateRotations (
    curvex: AnimationCurve,
    curvey: AnimationCurve,
    curvez: AnimationCurve,
    eulerOrder: EulerOrder,
  ) {
    const times = [];
    const values = [];

    // Add first frame
    times.push(curvex.times[0]);
    values.push(MathUtils.degToRad(curvex.values[0]));
    values.push(MathUtils.degToRad(curvey.values[0]));
    values.push(MathUtils.degToRad(curvez.values[0]));

    for (let i = 1; i < curvex.values.length; i++) {
      const initialValue: [number, number, number] = [
        curvex.values[i - 1],
        curvey.values[i - 1],
        curvez.values[i - 1],
      ];

      if (isNaN(initialValue[0]) || isNaN(initialValue[1]) || isNaN(initialValue[2])) {
        continue;
      }

      const initialValueRad = initialValue.map(MathUtils.degToRad);

      const currentValue: [number, number, number] = [
        curvex.values[i],
        curvey.values[i],
        curvez.values[i],
      ];

      if (isNaN(currentValue[0]) || isNaN(currentValue[1]) || isNaN(currentValue[2])) {
        continue;
      }

      const currentValueRad = currentValue.map(MathUtils.degToRad);

      const valuesSpan: [number, number, number] = [
        currentValue[0] - initialValue[0],
        currentValue[1] - initialValue[1],
        currentValue[2] - initialValue[2],
      ];

      const absoluteSpan: [number, number, number] = [
        Math.abs(valuesSpan[0]),
        Math.abs(valuesSpan[1]),
        Math.abs(valuesSpan[2]),
      ];

      if (absoluteSpan[0] >= 180 || absoluteSpan[1] >= 180 || absoluteSpan[2] >= 180) {
        const maxAbsSpan = Math.max(...absoluteSpan);

        const numSubIntervals = maxAbsSpan / 180;

        const E1 = new Euler(
          initialValueRad[0],
          initialValueRad[1],
          initialValueRad[2],
          eulerOrder,
        );
        const E2 = new Euler(
          currentValueRad[0],
          currentValueRad[1],
          currentValueRad[2],
          eulerOrder,
        );

        const Q1 = new Quaternion().setFromEuler(E1);
        const Q2 = new Quaternion().setFromEuler(E2);

        // Check unroll
        if (Q1.dot(Q2)) {
          Q2.set(-Q2.x, -Q2.y, -Q2.z, -Q2.w);
        }

        // Interpolate
        const initialTime = curvex.times[i - 1];
        const timeSpan = (curvex.times[i]) - initialTime;

        const Q = new Quaternion();
        const E = new Euler();

        for (let t = 0; t < 1; t += 1 / numSubIntervals) {
          Q.copy(Q1.clone().slerp(Q2.clone(), t));

          times.push(initialTime + t * timeSpan);
          E.setFromQuaternion(Q, eulerOrder);

          values.push(E.x);
          values.push(E.y);
          values.push(E.z);
        }
      } else {
        times.push(curvex.times[i]);
        values.push(MathUtils.degToRad(curvex.values[i]));
        values.push(MathUtils.degToRad(curvey.values[i]));
        values.push(MathUtils.degToRad(curvez.values[i]));
      }
    }

    return [times, values];
  }
}
