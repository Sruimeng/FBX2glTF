// 动画解析器
import {
  PropertyBinding,
  Matrix4,
  AnimationClip,
  Vector3,
  Quaternion,
  VectorKeyframeTrack,
  Euler,
  QuaternionKeyframeTrack,
  NumberKeyframeTrack,
} from 'three';
import { convertFBXTimeToSeconds } from '../utils';
import type {
  AnimationCurve,
  CurveNode,
  AnimationNode,
  RawClip,
} from '../types';
import type { ParseContext } from '../types';

export class AnimationParser {
  private context: ParseContext;

  constructor (context: ParseContext) {
    this.context = context;
  }

  // 解析动画数据
  parse (): AnimationClip[] {
    const animationClips: AnimationClip[] = [];
    const rawClips = this.parseClips();

    if (rawClips) {
      for (const key in rawClips) {
        const rawClip = rawClips[key];
        const clip = this.addClip(rawClip);

        animationClips.push(clip);
      }
    }

    return this.processAnimationClips(animationClips);
  }

  // 解析动画片段
  private parseClips (): Record<string, RawClip> | undefined {
    const objects = this.context.fbxTree.Objects;

    if (!objects || objects.AnimationCurve === undefined) {
      return undefined;
    }

    const curveNodesMap = this.parseAnimationCurveNodes();

    this.parseAnimationCurves(curveNodesMap);
    const layersMap = this.parseAnimationLayers(curveNodesMap);
    const rawClips = this.parseAnimStacks(layersMap);

    return rawClips;
  }

  // 解析动画曲线节点
  private parseAnimationCurveNodes (): Map<number, CurveNode> {
    const objects = this.context.fbxTree.Objects;

    if (!objects) {return new Map();}
    const rawCurveNodes = objects.AnimationCurveNode || {};
    const curveNodesMap = new Map<number, CurveNode>();

    for (const nodeID in rawCurveNodes) {
      const rawCurveNode = rawCurveNodes[nodeID];

      if (rawCurveNode.attrName && rawCurveNode.attrName.match(/S|R|T|DeformPercent/) !== null) {
        const curveNode: CurveNode = {
          id: rawCurveNode.id || 0,
          attr: rawCurveNode.attrName || '',
          curves: {},
        };

        curveNodesMap.set(curveNode.id, curveNode);
      }
    }

    return curveNodesMap;
  }

  // 解析动画曲线
  private parseAnimationCurves (curveNodesMap: Map<number, CurveNode>): void {
    const objects = this.context.fbxTree.Objects;

    if (!objects) {return;}
    const rawCurves = objects.AnimationCurve || {};

    for (const nodeID in rawCurves) {
      const animationCurve: AnimationCurve = {
        id: rawCurves[nodeID].id || 0,
        times: rawCurves[nodeID].KeyTime.a.map(convertFBXTimeToSeconds),
        values: rawCurves[nodeID].KeyValueFloat.a,
      };

      const relationships = this.context.connections.get(animationCurve.id);

      if (relationships !== undefined) {
        const parent = relationships.parents[0];

        if (parent && typeof parent.ID !== 'undefined') {
          const animationCurveID = parent.ID;
          const animationCurveRelationship = parent.relationship;

          if (typeof animationCurveRelationship === 'string') {
            const curveNode = curveNodesMap.get(animationCurveID);

            if (curveNode) {
              if (animationCurveRelationship.match(/X/)) {
                curveNode.curves.x = animationCurve;
              } else if (animationCurveRelationship.match(/Y/)) {
                curveNode.curves.y = animationCurve;
              } else if (animationCurveRelationship.match(/Z/)) {
                curveNode.curves.z = animationCurve;
              } else if (animationCurveRelationship.match(/DeformPercent/)) {
                curveNode.curves.morph = animationCurve;
              }
            }
          }
        }
      }
    }
  }

  // 解析动画层
  private parseAnimationLayers (curveNodesMap: Map<number, CurveNode>): Map<number, AnimationNode[]> {
    const objects = this.context.fbxTree.Objects;
    const animationLayer = objects?.AnimationLayer;
    const models = objects?.Model;
    const connections = this.context.connections;
    const sceneGraph = this.context.sceneGraph;

    if (!animationLayer || !connections || !models || !sceneGraph || !objects) {
      throw new Error('FBXTree.Objects.AnimationLayer is undefined');
    }

    const rawLayers = animationLayer;
    const layersMap = new Map<number, AnimationNode[]>();

    for (const nodeID in rawLayers) {
      const layerCurveNodes: AnimationNode[] = [];
      const connection = connections.get(parseInt(nodeID));

      if (connection !== undefined) {
        const children = connection.children;

        children.forEach((child: any, i: any) => {
          if (curveNodesMap.has(child.ID)) {
            const curveNode = curveNodesMap.get(child.ID);

            if (!curveNode) {return;}

            if (curveNode.curves.x !== undefined ||
                curveNode.curves.y !== undefined ||
                curveNode.curves.z !== undefined) {

              if (layerCurveNodes[i] === undefined) {
                const modelID = connections.get(child.ID)?.parents.filter((parent: any) => {
                  return parent.relationship !== undefined;
                })[0].ID;

                if (modelID !== undefined) {
                  const rawModel = models[modelID.toString()];

                  if (rawModel === undefined) {
                    console.warn('THREE.FBXLoader: Encountered a unused curve.', child);

                    return;
                  }

                  const node: AnimationNode = {
                    modelName: rawModel.attrName ? PropertyBinding.sanitizeNodeName(rawModel.attrName) : '',
                    ID: rawModel.id || 0,
                    initialPosition: [0, 0, 0],
                    initialRotation: [0, 0, 0],
                    initialScale: [1, 1, 1],
                  };

                  sceneGraph.traverse(child => {
                    if ((child).ID === rawModel.id) {
                      node.transform = child.matrix;
                      if (child.userData.transformData) {
                        node.eulerOrder = child.userData.transformData.eulerOrder;
                      }
                    }
                  });

                  if (!node.transform) {
                    node.transform = new Matrix4();
                  }

                  if ('PreRotation' in rawModel && rawModel.PreRotation) {
                    node.preRotation = rawModel.PreRotation.value;
                  }
                  if ('PostRotation' in rawModel && rawModel.PostRotation) {
                    node.postRotation = rawModel.PostRotation.value;
                  }

                  layerCurveNodes[i] = node;
                }
              }

              if (layerCurveNodes[i]) {
                this.assignCurveNodeToAnimationNode(layerCurveNodes[i], curveNode);
              }
            }
          }
        });

        layersMap.set(parseInt(nodeID), layerCurveNodes);
      }
    }

    return layersMap;
  }

  // 分配曲线节点到动画节点
  private assignCurveNodeToAnimationNode (animationNode: AnimationNode, curveNode: CurveNode): void {
    switch (curveNode.attr) {
      case 'T':
        animationNode.T = curveNode;

        break;
      case 'R':
        animationNode.R = curveNode;

        break;
      case 'S':
        animationNode.S = curveNode;

        break;
      case 'DeformPercent':
        animationNode.DeformPercent = curveNode;

        break;
      default:
        break;
    }
  }

  // 解析动画堆栈
  private parseAnimStacks (layersMap: Map<number, AnimationNode[]>): Record<string, RawClip> {
    const rawStacks = this.context.fbxTree.Objects?.AnimationStack;
    const connections = this.context.connections;

    if (!rawStacks || !connections) {
      throw new Error('FBXTree.Objects.AnimationStack or global.connections is undefined');
    }

    const rawClips: Record<string, RawClip> = {};

    for (const nodeID in rawStacks) {
      const children = connections.get(parseInt(nodeID))?.children || [];

      if (children.length > 1) {
        console.warn('THREE.FBXLoader: Encountered an animation stack with multiple layers, this is currently not supported. Ignoring subsequent layers.');
      }

      const layer = layersMap.get(children[0].ID);

      if (!layer) {
        throw new Error('Layer not found for nodeID: ' + nodeID);
      }

      rawClips[nodeID] = {
        name: rawStacks[nodeID].attrName || '',
        layer: layer,
      };
    }

    return rawClips;
  }

  // 添加动画片段
  private addClip (rawClip: RawClip): AnimationClip {
    const tracks: (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] = [];

    rawClip.layer.forEach(rawTracks => {
      tracks.push(...this.generateTracks(rawTracks));
    });

    return new AnimationClip(rawClip.name, -1, tracks);
  }

  // 生成动画轨道
  private generateTracks (rawTracks: AnimationNode): (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] {
    const tracks: (VectorKeyframeTrack | QuaternionKeyframeTrack | NumberKeyframeTrack)[] = [];

    let initialPosition: Vector3 | [number, number, number] = new Vector3();
    let initialScale: Vector3 | [number, number, number] = new Vector3();

    if (rawTracks.transform) {
      rawTracks.transform.decompose(initialPosition, new Quaternion(), initialScale);
    }

    initialPosition = initialPosition.toArray();
    initialScale = initialScale.toArray();

    if (rawTracks.T !== undefined && Object.keys(rawTracks.T.curves).length > 0) {
      const positionTrack = this.generateVectorTrack(
        rawTracks.modelName,
        rawTracks.T.curves,
        initialPosition,
        'position'
      );

      if (positionTrack !== undefined) {
        tracks.push(positionTrack);
      }
    }

    if (rawTracks.R !== undefined && Object.keys(rawTracks.R.curves).length > 0) {
      const rotationTrack = this.generateRotationTrack(
        rawTracks.modelName,
        rawTracks.R.curves,
        rawTracks.preRotation ?? [0, 0, 0],
        rawTracks.postRotation ?? [0, 0, 0],
        rawTracks.eulerOrder || 'ZYX'
      );

      if (rotationTrack !== undefined) {
        tracks.push(rotationTrack);
      }
    }

    if (rawTracks.S !== undefined && Object.keys(rawTracks.S.curves).length > 0) {
      const scaleTrack = this.generateVectorTrack(
        rawTracks.modelName,
        rawTracks.S.curves,
        initialScale,
        'scale'
      );

      if (scaleTrack !== undefined) {
        tracks.push(scaleTrack);
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

  // 生成向量轨道
  private generateVectorTrack (
    modelName: string,
    curves: { x?: AnimationCurve, y?: AnimationCurve, z?: AnimationCurve },
    initialValue: [number, number, number],
    type: string
  ): VectorKeyframeTrack {
    const times = this.getTimesForAllAxes(curves);
    const values = this.getKeyframeTrackValues(times, curves, initialValue);

    return new VectorKeyframeTrack(modelName + '.' + type, times, values);
  }

  // 生成旋转轨道
  private generateRotationTrack (
    modelName: string,
    curves: { x?: AnimationCurve, y?: AnimationCurve, z?: AnimationCurve },
    preRotation: [number, number, number],
    postRotation: [number, number, number],
    eulerOrder: string
  ): QuaternionKeyframeTrack {
    const times = this.getTimesForAllAxes(curves);
    const values = this.getKeyframeTrackValues(times, curves, [0, 0, 0]);

    const quaternionValues: number[] = [];
    const quaternion = new Quaternion();
    const euler = new Euler();

    for (let i = 0; i < values.length; i += 3) {
      euler.set(values[i], values[i + 1], values[i + 2], eulerOrder as any);
      quaternion.setFromEuler(euler);
      quaternion.toArray(quaternionValues, (i / 3) * 4);
    }

    return new QuaternionKeyframeTrack(modelName + '.quaternion', times, quaternionValues);
  }

  // 生成变形轨道
  private generateMorphTrack (rawTracks: AnimationNode): NumberKeyframeTrack {
    const curves = rawTracks.DeformPercent?.curves.morph;

    if (!curves) {
      throw new Error('curves is undefined');
    }

    const values = curves.values.map(val => val / 100) || [];
    const object = this.context.sceneGraph.getObjectByName(rawTracks.modelName);
    const morphNum = (object as any).morphTargetDictionary[rawTracks.morphName ?? ''];

    return new NumberKeyframeTrack(
      rawTracks.modelName + '.morphTargetInfluences[' + morphNum + ']',
      curves.times,
      values
    );
  }

  // 获取所有轴的时间
  private getTimesForAllAxes (curves: {
    x?: AnimationCurve,
    y?: AnimationCurve,
    z?: AnimationCurve,
    morph?: AnimationCurve,
  }): number[] {
    let times: number[] = [];

    if (curves.x !== undefined) {times = times.concat(curves.x.times);}
    if (curves.y !== undefined) {times = times.concat(curves.y.times);}
    if (curves.z !== undefined) {times = times.concat(curves.z.times);}

    times = times.sort((a, b) => a - b);

    // 去重
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

  // 获取关键帧轨道值
  private getKeyframeTrackValues (
    times: number[],
    curves: {
      x?: AnimationCurve,
      y?: AnimationCurve,
      z?: AnimationCurve,
      morph?: AnimationCurve,
    },
    initialValue: [number, number, number]
  ): number[] {
    const prevValue = [...initialValue];
    const values: number[] = [];

    times.forEach(time => {
      let xIndex = -1;
      let yIndex = -1;
      let zIndex = -1;

      if (curves.x) {xIndex = curves.x.times.indexOf(time);}
      if (curves.y) {yIndex = curves.y.times.indexOf(time);}
      if (curves.z) {zIndex = curves.z.times.indexOf(time);}

      // X值
      if (xIndex !== -1) {
        const xValue = curves.x?.values[xIndex] || 0;

        values.push(xValue);
        prevValue[0] = xValue;
      } else {
        values.push(prevValue[0]);
      }

      // Y值
      if (yIndex !== -1) {
        const yValue = curves.y?.values[yIndex] || 0;

        values.push(yValue);
        prevValue[1] = yValue;
      } else {
        values.push(prevValue[1]);
      }

      // Z值
      if (zIndex !== -1) {
        const zValue = curves.z?.values[zIndex] || 0;

        values.push(zValue);
        prevValue[2] = zValue;
      } else {
        values.push(prevValue[2]);
      }
    });

    return values;
  }

  // 处理动画片段（原Handler功能）
  private processAnimationClips (clips: AnimationClip[]): AnimationClip[] {
    return clips.map(clip => this.optimizeAnimationClip(clip));
  }

  // 优化动画片段
  private optimizeAnimationClip (clip: AnimationClip): AnimationClip {
    // 优化轨道
    const optimizedTracks = clip.tracks.map(track => this.optimizeTrack(track));

    return new AnimationClip(clip.name, clip.duration, optimizedTracks);
  }

  // 优化动画轨道
  private optimizeTrack (track: any): any {
    // 移除重复的关键帧
    const times = track.times;
    const values = track.values;
    const valueSize = this.getValueSize(track);

    const optimizedTimes: number[] = [];
    const optimizedValues: number[] = [];

    for (let i = 0; i < times.length; i++) {
      const isDuplicate = i > 0 &&
        times[i] === times[i - 1] &&
        this.arraysEqual(
          Array.from(values.slice(i * valueSize, (i + 1) * valueSize)),
          Array.from(values.slice((i - 1) * valueSize, i * valueSize))
        );

      if (!isDuplicate) {
        optimizedTimes.push(times[i]);
        optimizedValues.push(...Array.from(values.slice(i * valueSize, (i + 1) * valueSize)));
      }
    }

    // 创建新的轨道实例
    if (track instanceof VectorKeyframeTrack) {
      return new VectorKeyframeTrack(track.name, optimizedTimes, optimizedValues);
    } else if (track instanceof QuaternionKeyframeTrack) {
      return new QuaternionKeyframeTrack(track.name, optimizedTimes, optimizedValues);
    } else if (track instanceof NumberKeyframeTrack) {
      return new NumberKeyframeTrack(track.name, optimizedTimes, optimizedValues);
    } else {
      // 默认返回原轨道
      return track;
    }
  }

  // 获取轨道值大小
  private getValueSize (track: any): number {
    if (track instanceof VectorKeyframeTrack) {
      return 3;
    } else if (track instanceof QuaternionKeyframeTrack) {
      return 4;
    } else if (track instanceof NumberKeyframeTrack) {
      return 1;
    }

    return 1;
  }

  // 检查数组是否相等
  private arraysEqual (a: number[], b: number[]): boolean {
    if (a.length !== b.length) {return false;}

    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > 1e-6) {return false;}
    }

    return true;
  }

  // 验证动画片段
  public validateAnimationClip (clip: AnimationClip): boolean {
    if (!clip.tracks || clip.tracks.length === 0) {
      console.warn(`Animation clip "${clip.name}" has no tracks`);

      return false;
    }

    for (const track of clip.tracks) {
      if (!track.times || track.times.length === 0) {
        console.warn(`Track "${track.name}" has no keyframes`);

        return false;
      }

      if (!track.values || track.values.length === 0) {
        console.warn(`Track "${track.name}" has no values`);

        return false;
      }

      if (track.times.length * (track as any).valueSize !== track.values.length) {
        console.warn(`Track "${track.name}" has mismatched times and values length`);

        return false;
      }
    }

    return true;
  }

  // 计算动画片段持续时间
  public calculateClipDuration (clip: AnimationClip): number {
    let maxDuration = 0;

    for (const track of clip.tracks) {
      const trackDuration = track.times[track.times.length - 1];

      maxDuration = Math.max(maxDuration, trackDuration);
    }

    return maxDuration;
  }
}
