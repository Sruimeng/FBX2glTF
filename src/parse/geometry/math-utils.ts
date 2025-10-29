import { Vector2, Vector3, ShapeUtils } from 'three';

/**
 * 法线、切线和副切线
 */
export interface NormalTangentBitangent {
  bitangent: Vector3,
  normal: Vector3,
  tangent: Vector3,
}

/**
 * 数学计算工具类
 */
export class MathUtils {
  /**
   * 使用 Newell 方法计算法线
   * See https://www.khronos.org/opengl/wiki/Calculating_a_Surface_Normal
   */
  static getNormalNewell (vertices: Vector3[]): Vector3 {
    const normal = new Vector3(0.0, 0.0, 0.0);

    for (let i = 0; i < vertices.length; i++) {
      const current = vertices[i];
      const next = vertices[(i + 1) % vertices.length];

      normal.x += (current.y - next.y) * (current.z + next.z);
      normal.y += (current.z - next.z) * (current.x + next.x);
      normal.z += (current.x - next.x) * (current.y + next.y);
    }

    normal.normalize();

    return normal;
  }

  /**
   * 获取法线、切线和副切线
   */
  static getNormalTangentAndBitangent (vertices: Vector3[]): NormalTangentBitangent {
    const normalVector = MathUtils.getNormalNewell(vertices);

    // 避免向上向量与法线向量相等或几乎相等
    const up = Math.abs(normalVector.z) > 0.5 ? new Vector3(0.0, 1.0, 0.0) : new Vector3(0.0, 0.0, 1.0);
    const tangent = up.cross(normalVector).normalize();
    const bitangent = normalVector.clone().cross(tangent).normalize();

    return {
      bitangent: bitangent,
      normal: normalVector,
      tangent: tangent,
    };
  }

  /**
   * 将顶点投影到由法线切线和副法线定义的2D平面
   */
  static flattenVertex (vertex: Vector3, normalTangent: Vector3, normalBitangent: Vector3): Vector2 {
    return new Vector2(vertex.dot(normalTangent), vertex.dot(normalBitangent));
  }

  /**
   * 三角化多边形面
   */
  static triangulateFace (vertices: Vector3[]): number[][] {
    if (vertices.length > 3) {
      // 使用 earcut 三角化 n-gon
      const { bitangent, tangent } = MathUtils.getNormalTangentAndBitangent(vertices);
      const triangulationInput: Vector2[] = [];

      for (const vertex of vertices) {
        triangulationInput.push(MathUtils.flattenVertex(vertex, tangent, bitangent));
      }

      return ShapeUtils.triangulateShape(triangulationInput, []);
    } else {
      // 普通三角形，跳过 earcut 三角化步骤
      return [[0, 1, 2]];
    }
  }

  /**
   * 处理蒙皮权重，限制最多4个权重
   */
  static processSkinWeights (weights: number[], weightIndices: number[]): {
    processedWeights: number[],
    processedWeightIndices: number[],
  } {
    if (weights.length > 4) {
      console.warn(
        'THREE.FBXLoader: Vertex has more than 4 skinning weights assigned to vertex. Deleting additional weights.',
      );

      const wIndex = [0, 0, 0, 0];
      const Weight = [0, 0, 0, 0];

      weights.forEach(function (weight, weightIndex) {
        let currentWeight = weight;
        let currentIndex = weightIndices[weightIndex];

        Weight.forEach(function (comparedWeight, comparedWeightIndex, comparedWeightArray) {
          if (currentWeight > comparedWeight) {
            comparedWeightArray[comparedWeightIndex] = currentWeight;
            currentWeight = comparedWeight;

            const tmp = wIndex[comparedWeightIndex];

            wIndex[comparedWeightIndex] = currentIndex;
            currentIndex = tmp;
          }
        });
      });

      weightIndices = wIndex;
      weights = Weight;
    }

    // 如果权重数组长度小于4，用0填充
    while (weights.length < 4) {
      weights.push(0);
      weightIndices.push(0);
    }

    return {
      processedWeights: weights,
      processedWeightIndices: weightIndices,
    };
  }
}