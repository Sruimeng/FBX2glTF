import type { EulerOrder } from 'three';
import { BufferGeometry, Vector4 } from 'three';
import type {
  Deformers,
  FBXConnectionNode,
  FBXGeometryNode,
  FBXMorphTarget,
  FBXSkeleton,
  IParsingContext,
  FBXModelNode,
} from '../../types';
import { BaseParser } from '../../types';
import { generateTransform, getEulerOrder } from '../utils';
import { NURBSCurve } from '../../curves/NURBS-curve';
import { GeometryProcessor } from './geometry-processor';
import type {
  ModelInfo,
  GeometryParseResult,
} from './types';

/**
 * FBX几何解析器
 * 负责解析FBX文件中的几何体数据，包括网格、NURBS曲线等
 */
export class GeometryParser extends BaseParser<Deformers, { geoInfoMap: Map<number, ModelInfo>, geometryMap: Map<number, BufferGeometry> }> {
  private processor: GeometryProcessor;

  constructor (context: IParsingContext) {
    super(context);
    this.processor = new GeometryProcessor(context);
  }

  /**
   * 安全地转换字符串为 EulerOrder
   */
  private convertToEulerOrder (orderString: string): EulerOrder | undefined {
    const validEulerOrders: EulerOrder[] = ['XYZ', 'YZX', 'ZXY', 'XZY', 'YXZ', 'ZYX'];

    return validEulerOrders.find(order => order === orderString);
  }

  /**
   * 解析 FBXTree.Objects.Geometry 中的节点
   */
  parse (deformers: Deformers, _context: IParsingContext): { geoInfoMap: Map<number, ModelInfo>, geometryMap: Map<number, BufferGeometry> } {
    const geometryMap = new Map<number, BufferGeometry>();
    const geoInfoMap = new Map<number, ModelInfo>();
    const fbxTree = this.context.fbxTree;
    const connections = this.context.connections;

    if (!fbxTree || !connections) {
      throw new Error('FBXTree or connections is not defined');
    }
    const objects = fbxTree.Objects;

    if (!objects) {
      throw new Error('Objects is not defined in FBXTree');
    }

    if ('Geometry' in objects) {
      const geoNodes = objects.Geometry;

      for (const nodeID in geoNodes) {
        if (!geoNodes[nodeID]) { continue; }
        const relationships = connections.get(parseInt(nodeID)) || { children: [], parents: [] };
        const result = this.parseGeometry(relationships, geoNodes[nodeID], deformers);

        if (result) {
          const { geometry, modelInfo } = result;

          geometryMap.set(parseInt(nodeID), geometry);
          geoInfoMap.set(parseInt(nodeID), modelInfo);
        }
      }
    }

    // 报告警告
    if (this.processor.getNegativeMaterialIndices() === true) {
      console.warn(
        'THREE.FBXLoader: The FBX file contains invalid (negative) material indices. The asset might not render as expected.',
      );
    }

    return { geoInfoMap, geometryMap };
  }

  /**
   * 解析 FBXTree.Objects.Geometry 中的单个节点
   */
  parseGeometry (relationships: FBXConnectionNode, geoNode: FBXGeometryNode, deformers: Deformers): GeometryParseResult | undefined {
    switch (geoNode.attrType) {
      case 'Mesh':
        return this.parseMeshGeometry(relationships, geoNode, deformers);
      case 'NurbsCurve':
        return this.parseNurbsGeometry(geoNode) || {
          geometry: new BufferGeometry(),
          modelInfo: {
            isPBR: false,
            isTextured: false,
            isUVMapped: false,
            polygons: 0,
            quads: 0,
            triangles: 0,
            vertices: 0,
          },
        };
    }
  }

  /**
   * 解析网格几何体
   */
  parseMeshGeometry (
    relationships: FBXConnectionNode,
    geoNode: FBXGeometryNode,
    deformers: Deformers,
  ): GeometryParseResult | undefined {
    const skeletons = deformers.skeletons;
    const morphTargets: FBXMorphTarget[] = [];
    const fbxTreeObjects = this.context.fbxTree.Objects;

    if (!fbxTreeObjects) {
      throw new Error('Objects is not defined in FBXTree');
    }

    const models = fbxTreeObjects.Model;

    if (!models) {
      throw new Error('Model is not defined in FBXTree.Objects');
    }

    const modelNodes = relationships.parents.map(parent => {
      return models[parent.ID.toString()];
    });

    // 如果几何体没有与任何模型关联，则不创建几何体
    if (modelNodes.length === 0) {
      return;
    }

    const skeleton = relationships.children.reduce<FBXSkeleton | null>((skeleton, child) => {
      const childID = child.ID;

      if (childID !== undefined && skeletons[childID]) {
        skeleton = skeletons[childID];
      }

      return skeleton;
    }, null);

    relationships.children.forEach(child => {
      if (deformers.morphTargets[child.ID] !== undefined) {
        morphTargets.push(deformers.morphTargets[child.ID]);
      }
    });

    // 假设一个模型并从中获取 preRotation
    const modelNode = modelNodes[0];
    const transformData = this.extractTransformData(modelNode);
    const transform = generateTransform(transformData);

    return this.processor.genGeometry(geoNode, skeleton, morphTargets, transform);
  }

  /**
   * 提取变换数据
   */
  private extractTransformData (modelNode: FBXModelNode): {
    eulerOrder?: EulerOrder,
    inheritType?: number,
    translation?: number[],
    rotation?: number[],
    scale?: number[],
  } {
    const transformData: {
      eulerOrder?: EulerOrder,
      inheritType?: number,
      translation?: number[],
      rotation?: number[],
      scale?: number[],
    } = {};

    if ('RotationOrder' in modelNode && modelNode.RotationOrder) {
      const value = modelNode.RotationOrder.value;

      if (typeof value === 'number') {
        const eulerOrderString = getEulerOrder(value);

        transformData.eulerOrder = this.convertToEulerOrder(eulerOrderString);
      }
    }

    if ('InheritType' in modelNode && modelNode.InheritType) {
      const inheritTypeValue = modelNode.InheritType.value;

      transformData.inheritType = typeof inheritTypeValue === 'number' ? inheritTypeValue : parseInt(String(inheritTypeValue));
    }

    if ('GeometricTranslation' in modelNode && modelNode.GeometricTranslation) {
      const translation = modelNode.GeometricTranslation.value;

      if (Array.isArray(translation)) {
        transformData.translation = translation;
      }
    }

    if ('GeometricRotation' in modelNode && modelNode.GeometricRotation) {
      const rotation = modelNode.GeometricRotation.value;

      if (Array.isArray(rotation)) {
        transformData.rotation = rotation;
      }
    }

    if ('GeometricScaling' in modelNode && modelNode.GeometricScaling) {
      const scale = modelNode.GeometricScaling.value;

      if (Array.isArray(scale)) {
        transformData.scale = scale;
      }
    }

    return transformData;
  }

  /**
   * 生成 NURBS 几何体
   */
  parseNurbsGeometry (geoNode: FBXGeometryNode): GeometryParseResult | undefined {
    const order = parseInt(geoNode.Order || '0');

    if (isNaN(order)) {
      console.error(
        'THREE.FBXLoader: Invalid Order %s given for geometry ID: %s',
        geoNode.Order,
        geoNode.id,
      );

      return undefined;
    }

    const degree = order - 1;
    const knots = geoNode.KnotVector?.a || [];
    const controlPoints: Vector4[] = [];
    const pointsValues = geoNode.Points?.a || [];

    for (let i = 0, l = pointsValues.length; i < l; i += 4) {
      controlPoints.push(new Vector4().fromArray(pointsValues, i));
    }

    let startKnot: number | undefined;
    let endKnot: number | undefined;

    if (geoNode.Form === 'Closed') {
      controlPoints.push(controlPoints[0]);
    } else if (geoNode.Form === 'Periodic') {
      startKnot = degree;
      endKnot = knots.length - 1 - startKnot;

      for (let i = 0; i < degree; ++i) {
        controlPoints.push(controlPoints[i]);
      }
    }

    const curve = new NURBSCurve(degree, knots, controlPoints, startKnot, endKnot);
    const points = curve.getPoints(controlPoints.length * 12);

    return {
      geometry: new BufferGeometry().setFromPoints(points),
      modelInfo: {
        isPBR: false,
        isTextured: false,
        isUVMapped: false,
        polygons: 0,
        quads: 0,
        triangles: 0,
        vertices: points.length,
      },
    };
  }
}