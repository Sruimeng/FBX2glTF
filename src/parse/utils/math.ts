// 数学工具函数
import { FBXEulerOrder } from '../types';

// 获取欧拉角顺序
export function getEulerOrder (order: FBXEulerOrder): string {
  order = order || 0;

  if (order === FBXEulerOrder.SphericXYZ) {
    console.warn('THREE.FBXLoader: unsupported Euler Order: Spherical XYZ. Animations and rotations may be incorrect.');

    return FBXEulerOrder[0];
  }

  return FBXEulerOrder[order];
}

// FBX时间转换为秒
export function convertFBXTimeToSeconds (time: number): number {
  // Convert an FBX time value to seconds
  // An FBX time value is a 64-bit integer representing the number of 46186158000 Hz ticks
  return time / 46186158000;
}

// 获取数据
export function getData (polygonVertexIndex: number, polygonIndex: number, vertexIndex: number, infoObject: any): number| number[] {
  let index: number | number[];

  switch (infoObject.mappingType) {
    case 'ByPolygonVertex':
      index = polygonVertexIndex;

      break;
    case 'ByPolygon':
      index = polygonIndex;

      break;
    case 'ByVertice':
      index = vertexIndex;

      break;
    case 'AllSame':
      index = infoObject.indices[0];

      break;
    default:
      console.warn('THREE.FBXLoader: unknown attribute mapping type ' + infoObject.mappingType);
      index = 0;
  }

  if (infoObject.referenceType === 'IndexToDirect') {
    index = infoObject.indices[index as number];
  }

  return index;
}
