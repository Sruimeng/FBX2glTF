import type { BufferAttribute, EulerOrder } from 'three';
import { Matrix4 } from 'three';
import {
  BufferGeometry,
  Color,
  ColorManagement,
  Float32BufferAttribute,
  Matrix3,
  ShapeUtils,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type {
  Deformers,
  FBXEulerOrder,
  FBXGeometryNode,
  FBXLayerElementColor,
  FBXLayerElementNormal,
  FBXLayerElementUV,
  FBXMorphTarget,
  FBXSkeleton,
  UserDataTransform,
} from '../constants';
import type { ParseContext, FBXConnectionNode } from '../types/core';
import { generateTransform, getData, getEulerOrder } from './utils';
import { NURBSCurve } from '../curves/NURBS-curve';

interface GeoBufferInfo {
  buffer: number[],
  dataSize: number,
  indices: number[],
  mappingType: string,
  referenceType: string,
}
interface GeoInfo {
  baseVertexPositions?: number[],
  color?: GeoBufferInfo,
  material?: GeoBufferInfo,
  normal?: GeoBufferInfo,
  skeleton?: FBXSkeleton,
  uv?: {
    buffer: number[],
    dataSize: number,
    indices: number[],
    mappingType: string,
    referenceType: string,
  }[],
  vertexIndices?: number[],
  vertexPositions?: number[],
  weightTable?: {
    [key: number]: Array<{ id: number, weight: number }>,
  },
}

interface ModelInfo {
  id: number,
  name: string,
  type?: string,
  polygons: number,
  quads: number,
  triangles: number,
  vertices: number,
}

export class GeometryParser {
  private context: ParseContext;
  negativeMaterialIndices: boolean;
  modelInfo: ModelInfo = {
    id: 0,
    name: '',
    polygons: 0,
    quads: 0,
    triangles: 0,
    vertices: 0,
  };

  constructor (context: ParseContext) {
    this.context = context;
    this.negativeMaterialIndices = false;
  }

  // Parse nodes in FBXTree.Objects.Geometry
  parse (deformers: Deformers) {
    const geometryMap = new Map();
    const geoInfoMap = new Map();
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
        if (!geoNodes[nodeID]) {continue;}
        const relationships = connections.get(parseInt(nodeID)) || { children: [], parents: [] };
        const result = this.parseGeometry(relationships, geoNodes[nodeID], deformers);
        const { geometry, modelInfo } = result || {};

        geometryMap.set(parseInt(nodeID), geometry);
        geoInfoMap.set(parseInt(nodeID), modelInfo);
      }
    }

    // report warnings

    if (this.negativeMaterialIndices === true) {
      // Warning: negative material indices detected
    }

    return { geoInfoMap, geometryMap };
  }

  // Parse single node in FBXTree.Objects.Geometry
  parseGeometry (relationships: FBXConnectionNode, geoNode: FBXGeometryNode, deformers: Deformers) {
    switch (geoNode.attrType) {
      case 'Mesh':
        return this.parseMeshGeometry(relationships, geoNode, deformers);
      case 'NurbsCurve':
        return this.parseNurbsGeometry(geoNode);
      default:
        return { geometry: undefined, modelInfo: { id: 0, name: '', polygons: 0, quads: 0, triangles: 0, vertices: 0 } };
    }
  }

  // Parse single node mesh geometry in FBXTree.Objects.Geometry
  parseMeshGeometry (
    relationships: FBXConnectionNode,
    geoNode: FBXGeometryNode,
    deformers: Deformers,
  ) {
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

    // Debug information removed

    // don't create geometry if it is not associated with any models
    if (modelNodes.length === 0) {
      // Creating geometry without associated models

      // Create geometry anyway without model transformations
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

      // Use identity matrix as default transform
      const identityMatrix = new Matrix4();

      return this.genGeometry(geoNode, skeleton, morphTargets, identityMatrix);
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

    // Assume one model and get the preRotation from that
    // if there is more than one model associated with the geometry this may cause problems
    const modelNode = modelNodes[0];

    const transformData: UserDataTransform = {};

    if (modelNode && 'RotationOrder' in modelNode && modelNode.RotationOrder?.value) {
      const value = modelNode.RotationOrder.value;

      if (typeof value === 'number') {
        transformData.eulerOrder = getEulerOrder(value as FBXEulerOrder) as EulerOrder;
      }
    }
    if (modelNode && 'InheritType' in modelNode && modelNode.InheritType?.value) {
      transformData.inheritType = parseInt(String(modelNode.InheritType.value));
    }

    if (modelNode && 'GeometricTranslation' in modelNode && modelNode.GeometricTranslation?.value) {
      transformData.translation = modelNode.GeometricTranslation.value;
    }
    if (modelNode && 'GeometricRotation' in modelNode && modelNode.GeometricRotation?.value) {
      transformData.rotation = modelNode.GeometricRotation.value;
    }
    if (modelNode && 'GeometricScaling' in modelNode && modelNode.GeometricScaling?.value) {
      transformData.scale = modelNode.GeometricScaling.value;
    }

    const transform = generateTransform(transformData);

    return this.genGeometry(geoNode, skeleton, morphTargets, transform);
  }

  // Generate a BufferGeometry from a node in FBXTree.Objects.Geometry
  genGeometry (
    geoNode: FBXGeometryNode,
    skeleton: FBXSkeleton | null,
    morphTargets: FBXMorphTarget[],
    preTransform: Matrix4,
  ) {
    const geometry = new BufferGeometry();

    if (geoNode.attrName) {
      geometry.name = geoNode.attrName;
    }
    const geoInfo = this.parseGeoNode(geoNode, skeleton);
    const buffers = this.genBuffers(geoInfo);

    this.modelInfo.vertices = buffers.positionCount;
    const modelInfo = { ...this.modelInfo };

    this.modelInfo = {
      id: 0,
      name: '',
      polygons: 0,
      quads: 0,
      triangles: 0,
      vertices: 0,
    };

    const positionAttribute = new Float32BufferAttribute(buffers.vertex, 3);

    positionAttribute.applyMatrix4(preTransform);

    geometry.setAttribute('position', positionAttribute);

    if (buffers.colors.length > 0) {
      geometry.setAttribute('color', new Float32BufferAttribute(buffers.colors, 3));
    }

    if (skeleton) {
      geometry.setAttribute('skinIndex', new Uint16BufferAttribute(buffers.weightsIndices, 4));

      geometry.setAttribute('skinWeight', new Float32BufferAttribute(buffers.vertexWeights, 4));

      // used later to bind the skeleton to the model
      (geometry as BufferGeometry & { FBX_Deformer?: FBXSkeleton }).FBX_Deformer = skeleton;
    }

    if (buffers.normal.length > 0) {
      const normalMatrix = new Matrix3().getNormalMatrix(preTransform);

      const normalAttribute = new Float32BufferAttribute(buffers.normal, 3);

      normalAttribute.applyNormalMatrix(normalMatrix);

      geometry.setAttribute('normal', normalAttribute);
    } else {
      geometry.computeVertexNormals();
    }

    buffers.uvs.forEach(function (_, i) {
      const name = i === 0 ? 'uv' : `uv${i}`;
      const uv = buffers.uvs[i] as unknown as number[];

      geometry.setAttribute(name, new Float32BufferAttribute(uv, 2));
    });

    if (geoInfo.material && geoInfo.material.mappingType !== 'AllSame') {
      // Convert the material indices of each vertex into rendering groups on the geometry.
      let prevMaterialIndex = buffers.materialIndex[0];
      let startIndex = 0;

      buffers.materialIndex.forEach(function (currentIndex, i) {
        if (currentIndex !== prevMaterialIndex) {
          geometry.addGroup(startIndex, i - startIndex, prevMaterialIndex);

          prevMaterialIndex = currentIndex;
          startIndex = i;
        }
      });

      // the loop above doesn't add the last group, do that here.
      if (geometry.groups.length > 0) {
        const lastGroup = geometry.groups[geometry.groups.length - 1] as {
          count: number,
          materialIndex: number,
          start: number,
        };
        const lastIndex = lastGroup.start + lastGroup.count;

        if (lastIndex !== buffers.materialIndex.length) {
          geometry.addGroup(lastIndex, buffers.materialIndex.length - lastIndex, prevMaterialIndex);
        }
      }

      // case where there are multiple materials but the whole geometry is only
      // using one of them
      if (geometry.groups.length === 0) {
        geometry.addGroup(0, buffers.materialIndex.length, buffers.materialIndex[0]);
      }
    }

    this.addMorphTargets(geometry, geoNode, morphTargets, preTransform);

    return { geometry, modelInfo };
  }

  parseGeoNode (geoNode: FBXGeometryNode, skeleton: FBXSkeleton | null): GeoInfo {
    const geoInfo: GeoInfo = {};

    geoInfo.vertexPositions
      = geoNode.Vertices !== undefined ? (geoNode.Vertices.a) : [];
    geoInfo.vertexIndices
      = geoNode.PolygonVertexIndex !== undefined ? (geoNode.PolygonVertexIndex.a) : [];

    if (geoNode.LayerElementColor) {
      geoInfo.color = this.parseVertexColors(geoNode.LayerElementColor[0]);
    }

    if (geoNode.LayerElementMaterial) {
      geoInfo.material = this.parseMaterialIndices(
        geoNode.LayerElementMaterial[0] as unknown as Record<string, unknown>,
      );
    }

    if (geoNode.LayerElementNormal) {
      geoInfo.normal = this.parseNormals(geoNode.LayerElementNormal[0]);
    }

    if (geoNode.LayerElementUV) {
      geoInfo.uv = [];

      let i = 0;

      while (geoNode.LayerElementUV[i]) {
        if ((geoNode.LayerElementUV[i]).UV) {
          geoInfo.uv.push(this.parseUVs(geoNode.LayerElementUV[i]));
        }

        i++;
      }
    }

    geoInfo.weightTable = {};

    if (skeleton !== null && skeleton.rawBones) {
      geoInfo.skeleton = skeleton;

      skeleton.rawBones.forEach(function (rawBone, i) {
        // loop over the bone's vertex indices and weights
        rawBone.indices.forEach(function (index, j) {
          if (geoInfo.weightTable && geoInfo.weightTable[index] === undefined) {
            geoInfo.weightTable[index] = [];
          }

          if (geoInfo.weightTable) {
            (geoInfo.weightTable[index] as { id: number, weight: number }[]).push({
              id: i,
              weight: rawBone.weights[j],
            });
          }
        });
      });
    }

    return geoInfo;
  }

  genBuffers (geoInfo: GeoInfo) {
    const buffers = {
      colors: [],
      materialIndex: [],
      normal: [],
      positionCount: 0,
      uvs: [],
      vertex: [],
      vertexWeights: [],
      weightsIndices: [],
    };

    let polygonIndex = 0;
    let faceLength = 0;
    let displayedWeightsWarning = false;

    // these will hold data for a single face
    let facePositionIndexes: number[] = [];
    let faceNormals: number[] = [];
    let faceColors: number[] = [];
    let faceUVs: number[][] = [];
    let faceWeights: number[] = [];
    let faceWeightIndices: number[] = [];

    geoInfo.vertexIndices?.forEach((vertexIndex: number, polygonVertexIndex: number) => {
      let materialIndex: number | undefined;
      let endOfFace = false;

      // Face index and vertex index arrays are combined in a single array
      // A cube with quad faces looks like this:
      // PolygonVertexIndex: *24 {
      //  a: 0, 1, 3, -3, 2, 3, 5, -5, 4, 5, 7, -7, 6, 7, 1, -1, 1, 7, 5, -4, 6, 0, 2, -5
      //  }
      // Negative numbers mark the end of a face - first face here is 0, 1, 3, -3
      // to find index of last vertex bit shift the index: ^ - 1
      if (vertexIndex < 0) {
        vertexIndex = vertexIndex ^ -1; // equivalent to ( x * -1 ) - 1
        endOfFace = true;
      }

      let weightIndices: number[] = [];
      let weights: number[] = [];

      facePositionIndexes.push(vertexIndex * 3, vertexIndex * 3 + 1, vertexIndex * 3 + 2);

      if (geoInfo.color) {
        const data = getData(polygonVertexIndex, polygonIndex, vertexIndex, geoInfo.color) as [
          number,
          number,
          number,
        ];

        faceColors.push(data[0], data[1], data[2]);
      }

      if (geoInfo.skeleton && geoInfo.weightTable) {
        if (geoInfo.weightTable[vertexIndex] !== undefined) {
          (geoInfo.weightTable[vertexIndex] as { id: number, weight: number }[]).forEach(
            function (wt) {
              weights.push(wt.weight);
              weightIndices.push(wt.id);
            },
          );
        }

        if (weights.length > 4) {
          if (!displayedWeightsWarning) {
            // Warning: vertex has more than 4 skinning weights
            displayedWeightsWarning = true;
          }

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

        // if the weight array is shorter than 4 pad with 0s
        while (weights.length < 4) {
          weights.push(0);
          weightIndices.push(0);
        }

        for (let i = 0; i < 4; ++i) {
          faceWeights.push(weights[i]);
          faceWeightIndices.push(weightIndices[i]);
        }
      }

      if (geoInfo.normal) {
        const data = getData(polygonVertexIndex, polygonIndex, vertexIndex, geoInfo.normal) as [
          number,
          number,
          number,
        ];

        faceNormals.push(data[0], data[1], data[2]);
      }

      if (geoInfo.material && geoInfo.material.mappingType !== 'AllSame') {
        materialIndex = getData(
          polygonVertexIndex,
          polygonIndex,
          vertexIndex,
          geoInfo.material,
        )[0];

        if (materialIndex < 0) {
          this.negativeMaterialIndices = true;
          materialIndex = 0; // fallback
        }
      }

      if (geoInfo.uv) {
        geoInfo.uv.forEach((uv, i) => {
          const data = getData(polygonVertexIndex, polygonIndex, vertexIndex, uv) as [
            number,
            number,
          ];

          if (faceUVs[i] === undefined) {
            faceUVs[i] = [];
          }

          faceUVs[i].push(data[0]);
          faceUVs[i].push(data[1]);
        });
      }

      faceLength++;

      if (endOfFace) {
        this.genFace(
          buffers,
          geoInfo,
          facePositionIndexes,
          materialIndex ?? 0,
          faceNormals,
          faceColors,
          faceUVs,
          faceWeights,
          faceWeightIndices,
          faceLength,
        );

        polygonIndex++;
        faceLength = 0;

        // reset arrays for the next face
        facePositionIndexes = [];
        faceNormals = [];
        faceColors = [];
        faceUVs = [];
        faceWeights = [];
        faceWeightIndices = [];
      }
    });

    buffers.positionCount = (geoInfo.vertexPositions?.length ?? 0) / 3;

    return buffers;
  }

  // See https://www.khronos.org/opengl/wiki/Calculating_a_Surface_Normal
  getNormalNewell (vertices: Vector3[]): Vector3 {
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

  getNormalTangentAndBitangent (vertices: Vector3[]) {
    const normalVector = this.getNormalNewell(vertices);
    // Avoid up being equal or almost equal to normalVector
    const up
      = Math.abs(normalVector.z) > 0.5 ? new Vector3(0.0, 1.0, 0.0) : new Vector3(0.0, 0.0, 1.0);
    const tangent = up.cross(normalVector).normalize();
    const bitangent = normalVector.clone().cross(tangent).normalize();

    return {
      bitangent: bitangent,
      normal: normalVector,
      tangent: tangent,
    };
  }

  flattenVertex (vertex: Vector3, normalTangent: Vector3, normalBitangent: Vector3): Vector2 {
    return new Vector2(vertex.dot(normalTangent), vertex.dot(normalBitangent));
  }

  // Generate data for a single face in a geometry. If the face is a quad then split it into 2 tris
  genFace (
    buffers: {
      colors: number[],
      materialIndex: number[],
      normal: number[],
      uvs: number[][],
      vertex: number[],
      vertexWeights: number[],
      weightsIndices: number[],
    },
    geoInfo: GeoInfo,
    facePositionIndexes: number[],
    materialIndex: number,
    faceNormals: number[],
    faceColors: number[],
    faceUVs: number[][],
    faceWeights: number[],
    faceWeightIndices: number[],
    faceLength: number,
  ) {
    let triangles: number[][] = [];

    if (faceLength > 3) {
      if (faceLength === 4) {
        if (this.modelInfo) {
          this.modelInfo.quads++;
        }
      } else if (faceLength > 4) {
        if (this.modelInfo) {
          this.modelInfo.polygons++;
        }
      }
      // Triangulate n-gon using earcut
      const vertices = [];
      // in morphing scenario vertexPositions represent morphPositions
      // while baseVertexPositions represent the original geometry's positions
      const positions = geoInfo.baseVertexPositions || geoInfo.vertexPositions || [];

      for (let i = 0; i < facePositionIndexes.length; i += 3) {
        vertices.push(
          new Vector3(
            positions[facePositionIndexes[i]],
            positions[facePositionIndexes[i + 1]],
            positions[facePositionIndexes[i + 2]],
          ),
        );
      }

      const { bitangent, tangent } = this.getNormalTangentAndBitangent(vertices);
      const triangulationInput = [];

      for (const vertex of vertices) {
        triangulationInput.push(this.flattenVertex(vertex, tangent, bitangent));
      }

      // When vertices is an array of [0,0,0] elements (which is the case for vertices not participating in morph)
      // the triangulationInput will be an array of [0,0] elements
      // resulting in an array of 0 triangles being returned from ShapeUtils.triangulateShape
      // leading to not pushing into buffers.vertex the redundant vertices (the vertices that are not morphed).
      // That's why, in order to support morphing scenario, "positions" is looking first for baseVertexPositions,
      // so that we don't end up with an array of 0 triangles for the faces not participating in morph.
      triangles = ShapeUtils.triangulateShape(triangulationInput, []);
    } else {
      if (this.modelInfo) {
        this.modelInfo.triangles++;
      }
      // Regular triangle, skip earcut triangulation step
      triangles = [[0, 1, 2]];
    }

    if (geoInfo.vertexPositions === undefined) {
      throw new Error('vertexPositions is not defined in geoInfo');
    }

    for (const triangle of triangles) {
      const [i0 = -1, i1 = -1, i2 = -1] = triangle;

      buffers.vertex.push(geoInfo.vertexPositions[facePositionIndexes[i0 * 3]]);
      buffers.vertex.push(
        geoInfo.vertexPositions[facePositionIndexes[i0 * 3 + 1]],
      );
      buffers.vertex.push(
        geoInfo.vertexPositions[facePositionIndexes[i0 * 3 + 2]],
      );

      buffers.vertex.push(geoInfo.vertexPositions[facePositionIndexes[i1 * 3]]);
      buffers.vertex.push(
        geoInfo.vertexPositions[facePositionIndexes[i1 * 3 + 1]],
      );
      buffers.vertex.push(
        geoInfo.vertexPositions[facePositionIndexes[i1 * 3 + 2]],
      );

      buffers.vertex.push(geoInfo.vertexPositions[facePositionIndexes[i2 * 3]]);
      buffers.vertex.push(
        geoInfo.vertexPositions[facePositionIndexes[i2 * 3 + 1]],
      );
      buffers.vertex.push(
        geoInfo.vertexPositions[facePositionIndexes[i2 * 3 + 2]],
      );

      if (geoInfo.skeleton) {
        buffers.vertexWeights.push(faceWeights[i0 * 4]);
        buffers.vertexWeights.push(faceWeights[i0 * 4 + 1]);
        buffers.vertexWeights.push(faceWeights[i0 * 4 + 2]);
        buffers.vertexWeights.push(faceWeights[i0 * 4 + 3]);

        buffers.vertexWeights.push(faceWeights[i1 * 4]);
        buffers.vertexWeights.push(faceWeights[i1 * 4 + 1]);
        buffers.vertexWeights.push(faceWeights[i1 * 4 + 2]);
        buffers.vertexWeights.push(faceWeights[i1 * 4 + 3]);

        buffers.vertexWeights.push(faceWeights[i2 * 4]);
        buffers.vertexWeights.push(faceWeights[i2 * 4 + 1]);
        buffers.vertexWeights.push(faceWeights[i2 * 4 + 2]);
        buffers.vertexWeights.push(faceWeights[i2 * 4 + 3]);

        buffers.weightsIndices.push(faceWeightIndices[i0 * 4]);
        buffers.weightsIndices.push(faceWeightIndices[i0 * 4 + 1]);
        buffers.weightsIndices.push(faceWeightIndices[i0 * 4 + 2]);
        buffers.weightsIndices.push(faceWeightIndices[i0 * 4 + 3]);

        buffers.weightsIndices.push(faceWeightIndices[i1 * 4]);
        buffers.weightsIndices.push(faceWeightIndices[i1 * 4 + 1]);
        buffers.weightsIndices.push(faceWeightIndices[i1 * 4 + 2]);
        buffers.weightsIndices.push(faceWeightIndices[i1 * 4 + 3]);

        buffers.weightsIndices.push(faceWeightIndices[i2 * 4]);
        buffers.weightsIndices.push(faceWeightIndices[i2 * 4 + 1]);
        buffers.weightsIndices.push(faceWeightIndices[i2 * 4 + 2]);
        buffers.weightsIndices.push(faceWeightIndices[i2 * 4 + 3]);
      }

      if (geoInfo.color) {
        buffers.colors.push(faceColors[i0 * 3]);
        buffers.colors.push(faceColors[i0 * 3 + 1]);
        buffers.colors.push(faceColors[i0 * 3 + 2]);

        buffers.colors.push(faceColors[i1 * 3]);
        buffers.colors.push(faceColors[i1 * 3 + 1]);
        buffers.colors.push(faceColors[i1 * 3 + 2]);

        buffers.colors.push(faceColors[i2 * 3]);
        buffers.colors.push(faceColors[i2 * 3 + 1]);
        buffers.colors.push(faceColors[i2 * 3 + 2]);
      }

      if (geoInfo.material && geoInfo.material.mappingType !== 'AllSame') {
        buffers.materialIndex.push(materialIndex);
        buffers.materialIndex.push(materialIndex);
        buffers.materialIndex.push(materialIndex);
      }

      if (geoInfo.normal) {
        buffers.normal.push(faceNormals[i0 * 3]);
        buffers.normal.push(faceNormals[i0 * 3 + 1]);
        buffers.normal.push(faceNormals[i0 * 3 + 2]);

        buffers.normal.push(faceNormals[i1 * 3]);
        buffers.normal.push(faceNormals[i1 * 3 + 1]);
        buffers.normal.push(faceNormals[i1 * 3 + 2]);

        buffers.normal.push(faceNormals[i2 * 3]);
        buffers.normal.push(faceNormals[i2 * 3 + 1]);
        buffers.normal.push(faceNormals[i2 * 3 + 2]);
      }

      if (geoInfo.uv) {
        for (let j = 0; j < geoInfo.uv.length; j++) {
          if (buffers.uvs[j] === undefined) {
            buffers.uvs[j] = [];
          }

          (buffers.uvs[j]).push((faceUVs[j])[i0 * 2]);
          (buffers.uvs[j]).push((faceUVs[j])[i0 * 2 + 1]);

          (buffers.uvs[j]).push((faceUVs[j])[i1 * 2]);
          (buffers.uvs[j]).push((faceUVs[j])[i1 * 2 + 1]);

          (buffers.uvs[j]).push((faceUVs[j])[i2 * 2]);
          (buffers.uvs[j]).push((faceUVs[j])[i2 * 2 + 1]);
        }
      }
    }
  }

  addMorphTargets (
    parentGeo: BufferGeometry,
    parentGeoNode: FBXGeometryNode,
    morphTargets: FBXMorphTarget[],
    preTransform: Matrix4,
  ) {
    if (morphTargets.length === 0) {
      return;
    }

    parentGeo.morphTargetsRelative = true;

    parentGeo.morphAttributes.position = [];
    // parentGeo.morphAttributes.normal = []; // not implemented

    const fbxTree = this.context.fbxTree;
    const fbxGeometry = fbxTree.Objects?.Geometry;

    if (!fbxGeometry) {
      throw new Error('Objects.Geometry is not defined in FBXTree');
    }

    morphTargets.forEach(morphTarget => {
      const rawTargets = morphTarget.rawTargets;

      if (!rawTargets) {
        return;
      }
      rawTargets.forEach(rawTarget => {
        const morphGeoNode = fbxGeometry[(rawTarget.geoID ?? 0).toString()];

        if (morphGeoNode !== undefined) {
          this.genMorphGeometry(
            parentGeo,
            parentGeoNode,
            morphGeoNode,
            preTransform,
            rawTarget.name ?? '',
          );
        }
      });
    });
  }

  // a morph geometry node is similar to a standard  node, and the node is also contained
  // in FBXTree.Objects.Geometry, however it can only have attributes for position, normal
  // and a special attribute Index defining which vertices of the original geometry are affected
  // Normal and position attributes only have data for the vertices that are affected by the morph
  genMorphGeometry (
    parentGeo: BufferGeometry,
    parentGeoNode: FBXGeometryNode,
    morphGeoNode: FBXGeometryNode,
    preTransform: Matrix4,
    name: string,
  ) {
    const basePositions = parentGeoNode.Vertices !== undefined ? parentGeoNode.Vertices.a : [];
    const baseIndices
      = parentGeoNode.PolygonVertexIndex !== undefined ? parentGeoNode.PolygonVertexIndex.a : [];

    const morphPositionsSparse = (
      morphGeoNode.Vertices !== undefined ? morphGeoNode.Vertices.a : []
    );
    const morphIndices = (
      morphGeoNode.Indexes !== undefined ? morphGeoNode.Indexes.a : []
    );

    const length = (parentGeo.attributes.position?.count) * 3;
    const morphPositions = new Float32Array(length);

    for (let i = 0; i < morphIndices.length; i++) {
      const morphIndex = (morphIndices[i]) * 3;

      morphPositions[morphIndex] = morphPositionsSparse[i * 3];
      morphPositions[morphIndex + 1] = morphPositionsSparse[i * 3 + 1];
      morphPositions[morphIndex + 2] = morphPositionsSparse[i * 3 + 2];
    }

    // TODO: add morph normal support
    const morphGeoInfo: GeoInfo = {
      baseVertexPositions: basePositions,
      vertexIndices: baseIndices,
      vertexPositions: Array.from(morphPositions),
    };

    const morphBuffers = this.genBuffers(morphGeoInfo);

    const positionAttribute = new Float32BufferAttribute(morphBuffers.vertex, 3);

    positionAttribute.name = name || morphGeoNode.attrName;

    positionAttribute.applyMatrix4(preTransform);

    (parentGeo.morphAttributes.position as BufferAttribute[]).push(positionAttribute);
  }

  // Parse normal from FBXTree.Objects.Geometry.LayerElementNormal if it exists
  parseNormals (NormalNode: FBXLayerElementNormal) {
    if (!NormalNode) {
      return {
        buffer: [],
        dataSize: 3,
        indices: [],
        mappingType: 'ByVertice',
        referenceType: 'Direct',
      };
    }

    const mappingType = NormalNode.MappingInformationType;
    const referenceType = NormalNode.ReferenceInformationType;
    const buffer = NormalNode.Normals?.a || [];
    let indexBuffer: number[] = [];

    if (referenceType as string === 'IndexToDirect') {
      const normalNode = NormalNode as any;

      if (normalNode.NormalIndex && typeof normalNode.NormalIndex === 'object' && 'a' in normalNode.NormalIndex && normalNode.NormalIndex.a) {
        indexBuffer = normalNode.NormalIndex.a as number[];
      } else if (normalNode.NormalsIndex && typeof normalNode.NormalsIndex === 'object' && 'a' in normalNode.NormalsIndex && normalNode.NormalsIndex.a) {
        indexBuffer = normalNode.NormalsIndex.a as number[];
      }
    }

    return {
      buffer: buffer,
      dataSize: 3,
      indices: indexBuffer,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }

  // Parse UVs from FBXTree.Objects.Geometry.LayerElementUV if it exists
  parseUVs (UVNode: FBXLayerElementUV): GeoBufferInfo {
    if (!UVNode) {
      return {
        buffer: [],
        dataSize: 2,
        indices: [],
        mappingType: 'ByVertice',
        referenceType: 'Direct',
      };
    }

    const mappingType = UVNode.MappingInformationType;
    const referenceType = UVNode.ReferenceInformationType;
    const buffer = UVNode.UV.a;
    let indexBuffer: number[] = [];

    if (referenceType as string === 'IndexToDirect') {
      indexBuffer = UVNode.UVIndex.a;
    }

    return {
      buffer: buffer,
      dataSize: 2,
      indices: indexBuffer,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }

  // Parse Vertex Colors from FBXTree.Objects.Geometry.LayerElementColor if it exists
  parseVertexColors (ColorNode: FBXLayerElementColor): {
    buffer: number[],
    dataSize: number,
    indices: number[],
    mappingType: string,
    referenceType: string,
  } {
    if (!ColorNode) {
      return {
        buffer: [],
        dataSize: 4,
        indices: [],
        mappingType: 'ByVertice',
        referenceType: 'Direct',
      };
    }

    const mappingType = ColorNode.MappingInformationType;
    const referenceType = ColorNode.ReferenceInformationType;
    const buffer = ColorNode.Colors.a;
    let indexBuffer: number[] = [];

    if (referenceType as string === 'IndexToDirect') {
      indexBuffer = ColorNode.ColorIndex?.a || [];
    }

    for (let i = 0, c = new Color(); i < buffer.length; i += 4) {
      c.fromArray(buffer, i);
      ColorManagement.toWorkingColorSpace(c, SRGBColorSpace);
      c.toArray(buffer, i);
    }

    return {
      buffer: buffer,
      dataSize: 4,
      indices: indexBuffer,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }

  // Parse mapping and material data in FBXTree.Objects.Geometry.LayerElementMaterial if it exists
  parseMaterialIndices (MaterialNode: Record<string, unknown> | undefined) {
    if (!MaterialNode) {
      return {
        buffer: [0],
        dataSize: 1,
        indices: [0],
        mappingType: 'AllSame',
        referenceType: 'Direct',
      };
    }

    const mappingType = MaterialNode.MappingInformationType as string;
    const referenceType = MaterialNode.ReferenceInformationType as string;

    if (mappingType === 'NoMappingInformation') {
      return {
        buffer: [0],
        dataSize: 1,
        indices: [0],
        mappingType: 'AllSame',
        referenceType: referenceType,
      };
    }

    const materialIndexBuffer = (MaterialNode.Materials as any)?.a as number[] || [];

    // Since materials are stored as indices, there's a bit of a mismatch between FBX and what
    // we expect.So we create an intermediate buffer that points to the index in the buffer,
    // for conforming with the other functions we've written for other data.
    const materialIndices: number[] = [];

    for (let i = 0; i < materialIndexBuffer.length; ++i) {
      materialIndices.push(i);
    }

    return {
      buffer: materialIndexBuffer,
      dataSize: 1,
      indices: materialIndices,
      mappingType: mappingType,
      referenceType: referenceType,
    };
  }

  // Generate a NurbGeometry from a node in FBXTree.Objects.Geometry
  parseNurbsGeometry (geoNode: FBXGeometryNode) {
    const order = parseInt(geoNode.Order?.a?.toString?.() || '0');

    if (isNaN(order)) {
      return { geometry: new BufferGeometry() };
    }

    const degree = order - 1;
    const knots = geoNode.KnotVector?.a || [];
    const controlPoints: Vector4[] = [];
    const pointsValues = geoNode.Points?.a || [];

    for (let i = 0, l = pointsValues.length; i < l; i += 4) {
      controlPoints.push(new Vector4().fromArray(pointsValues, i));
    }

    let startKnot, endKnot;

    if (geoNode.Form?.a?.toString?.() === 'Closed') {
      controlPoints.push(controlPoints[0]);
    } else if (geoNode.Form?.a?.toString?.() === 'Periodic') {
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
      modelInfo: { polygons: 0, quads: 0, triangles: 0, vertices: points.length },
    };
  }
}
