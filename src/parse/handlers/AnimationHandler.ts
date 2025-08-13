// 动画处理器
import type {
  KeyframeTrack,
} from 'three';
import {
  AnimationClip,
  Vector3,
  Quaternion,
  VectorKeyframeTrack,
  QuaternionKeyframeTrack,
  NumberKeyframeTrack,
} from 'three';
import type { AnimationCurve, AnimationNode } from '../types';

export class AnimationHandler {
  // 处理动画片段
  static processAnimationClips (clips: AnimationClip[]): AnimationClip[] {
    return clips.map(clip => this.optimizeAnimationClip(clip));
  }

  // 优化动画片段
  private static optimizeAnimationClip (clip: AnimationClip): AnimationClip {
    // 优化轨道
    const optimizedTracks = clip.tracks.map(track => this.optimizeTrack(track));

    return new AnimationClip(clip.name, clip.duration, optimizedTracks);
  }

  // 优化动画轨道
  private static optimizeTrack (track: KeyframeTrack): KeyframeTrack {
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
  private static getValueSize (track: KeyframeTrack): number {
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
  private static arraysEqual (a: number[], b: number[]): boolean {
    if (a.length !== b.length) {return false;}

    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > 1e-6) {return false;}
    }

    return true;
  }

  // 验证动画片段
  static validateAnimationClip (clip: AnimationClip): boolean {
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
  static calculateClipDuration (clip: AnimationClip): number {
    let maxDuration = 0;

    for (const track of clip.tracks) {
      const trackDuration = track.times[track.times.length - 1];

      maxDuration = Math.max(maxDuration, trackDuration);
    }

    return maxDuration;
  }

  // 标准化动画时间
  static normalizeAnimationTime (clip: AnimationClip, startTime: number = 0): AnimationClip {
    const normalizedTracks = clip.tracks.map(track => {
      const normalizedTimes = track.times.map(time => time - startTime);

      return new (track as any).constructor(track.name, normalizedTimes, track.values);
    });

    const duration = this.calculateClipDuration(clip) - startTime;

    return new AnimationClip(clip.name, duration, normalizedTracks);
  }

  // 合并动画片段
  static mergeAnimationClips (clips: AnimationClip[], name: string): AnimationClip {
    const allTracks: any[] = [];

    for (const clip of clips) {
      allTracks.push(...clip.tracks);
    }

    // 按轨道名称分组
    const trackGroups = new Map<string, any[]>();

    for (const track of allTracks) {
      if (!trackGroups.has(track.name)) {
        trackGroups.set(track.name, []);
      }
      trackGroups.get(track.name)!.push(track);
    }

    // 合并相同名称的轨道
    const mergedTracks: any[] = [];

    for (const [trackName, tracks] of trackGroups) {
      if (tracks.length === 1) {
        mergedTracks.push(tracks[0]);
      } else {
        // 合并多个轨道
        const mergedTrack = this.mergeTracks(tracks);

        mergedTracks.push(mergedTrack);
      }
    }

    const duration = Math.max(...clips.map(clip => clip.duration));

    return new AnimationClip(name, duration, mergedTracks);
  }

  // 合并轨道
  private static mergeTracks (tracks: KeyframeTrack[]): KeyframeTrack {
    if (tracks.length === 0) {
      throw new Error('Cannot merge empty tracks array');
    }

    const firstTrack = tracks[0];
    const valueSize = this.getValueSize(firstTrack);

    // 按时间排序所有关键帧
    const allKeyframes: Array<{ time: number, values: number[] }> = [];

    for (const track of tracks) {
      const trackValueSize = this.getValueSize(track);

      if (trackValueSize !== valueSize) {
        throw new Error('Cannot merge tracks with different value sizes');
      }

      for (let i = 0; i < track.times.length; i++) {
        allKeyframes.push({
          time: track.times[i],
          values: Array.from(track.values.slice(i * trackValueSize, (i + 1) * trackValueSize)),
        });
      }
    }

    allKeyframes.sort((a, b) => a.time - b.time);

    // 提取排序后的时间和值
    const times = allKeyframes.map(kf => kf.time);
    const values = allKeyframes.flatMap(kf => kf.values);

    // 创建新的轨道实例
    if (firstTrack instanceof VectorKeyframeTrack) {
      return new VectorKeyframeTrack(firstTrack.name, times, values);
    } else if (firstTrack instanceof QuaternionKeyframeTrack) {
      return new QuaternionKeyframeTrack(firstTrack.name, times, values);
    } else if (firstTrack instanceof NumberKeyframeTrack) {
      return new NumberKeyframeTrack(firstTrack.name, times, values);
    } else {
      // 默认返回第一个轨道
      return firstTrack;
    }
  }
}