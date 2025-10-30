import type { GLBParsingContext } from './context';
import type { FBXGeometryNode } from '../types/nodes/geometry';
import type { FBXModelNode, FBXTransformData } from '../types/nodes/model-animation';
import { BufferBuilder, LayerParser } from '../parse/geometry';
import { generateTransform, getEulerOrder } from '../parse/utils';
import { extractNumberArray } from '../types/parsers/type-guards';
import { Matrix3, Matrix4, Vector3 } from 'three';

/**
 * 将 FBX 几何体转换为 glTF Mesh，并挂载到已创建的 glTF Node 上。
 * - 复用 BufferBuilder 生成已三角化的顶点/法线/颜色/UV 缓冲
 * - 使用 glTF-Transform 的 Accessor.setArray，将数据分配到默认 Buffer
 * - 根据 Geometry 的父 Model 计算 preTransform 并应用到 POSITION/NORMAL
 */
export function populateMeshesFromFBX (context: GLBParsingContext): void {
  const document = context.document;
  const fbxTree = context.fbxTree;
  const connections = context.connections;

  if (!fbxTree?.Objects?.Geometry) { return; }

  const geometries: Record<string, FBXGeometryNode> = fbxTree.Objects.Geometry;
  const models: Record<string, FBXModelNode> | undefined = fbxTree.Objects.Model;

  for (const idStr in geometries) {
    const geoID = parseInt(idStr);
    const geoNode = geometries[idStr];

    if (!geoNode || geoNode.attrType !== 'Mesh') { continue; }

    const rel = connections.get(geoID);

    if (!rel) { continue; }

    // 构建 GeoInfo（对几何属性进行解析）
    const vertices = geoNode.Vertices?.a;
    const indices = geoNode.PolygonVertexIndex?.a;

    const geoInfo: Parameters<typeof BufferBuilder.genBuffers>[0] = {};

    geoInfo.vertexPositions = Array.isArray(vertices) ? vertices : [];
    geoInfo.vertexIndices = Array.isArray(indices) ? indices : [];

    if (geoNode.LayerElementColor) {
      geoInfo.color = LayerParser.parseVertexColors(geoNode.LayerElementColor[0]);
    }
    if (geoNode.LayerElementMaterial) {
      geoInfo.material = LayerParser.parseMaterialIndices(geoNode.LayerElementMaterial[0]);
    }
    if (geoNode.LayerElementNormal) {
      geoInfo.normal = LayerParser.parseNormals(geoNode.LayerElementNormal[0]);
    }
    if (geoNode.LayerElementUV) {
      geoInfo.uv = [];
      let i = 0;

      while ((geoNode.LayerElementUV as any)[i]) {
        const uvLayer = (geoNode.LayerElementUV as any)[i];

        if (uvLayer?.UV) {
          geoInfo.uv.push(LayerParser.parseUVs(uvLayer));
        }
        i++;
      }
    }

    const buffers = BufferBuilder.genBuffers(geoInfo);

    // 计算 preTransform：取第一个父 Model 的几何变换（Geometric*），回退到 Lcl_*
    const modelNode = pickFirstParentModel(rel.parents, models);
    const preTransform = modelNode ? generateTransform(extractGeometricTransform(modelNode)) : new Matrix4();

    // 应用变换到位置与法线
    const transformedPositions = applyMatrixToPositions(buffers.vertex, preTransform);
    const transformedNormals = buffers.normal.length > 0
      ? applyNormalMatrixToNormals(buffers.normal, preTransform)
      : computeVertexNormals(transformedPositions);

    // 生成 glTF Mesh/Primitive/Accessor
    const mesh = document.createMesh(geoNode.attrName || `Mesh_${geoID}`);
    const prim = document.createPrimitive();

    prim.setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(transformedPositions));

    if (transformedNormals && transformedNormals.length > 0) {
      prim.setAttribute('NORMAL', document.createAccessor().setType('VEC3').setArray(transformedNormals));
    }

    const uv0 = buffers.uvs[0];

    if (Array.isArray(uv0) && uv0.length > 0) {
      prim.setAttribute('TEXCOORD_0', document.createAccessor().setType('VEC2').setArray(Float32Array.from(uv0)));
    }
    const uv1 = buffers.uvs[1];

    if (Array.isArray(uv1) && uv1.length > 0) {
      prim.setAttribute('TEXCOORD_1', document.createAccessor().setType('VEC2').setArray(Float32Array.from(uv1)));
    }

    if (buffers.colors.length > 0) {
      prim.setAttribute('COLOR_0', document.createAccessor().setType('VEC3').setArray(Float32Array.from(buffers.colors)));
    }

    mesh.addPrimitive(prim);

    // 将生成的 Mesh 挂载到其父 Model 对应的 glTF Node 上
    rel.parents.forEach(parent => {
      const pid = typeof parent.ID === 'number' ? parent.ID : parseInt(String(parent.ID));
      const node = context.modelNodeMap.get(pid);

      node?.setMesh(mesh);
    });
  }
}

function pickFirstParentModel (parents: { ID: number }[], models?: Record<string, FBXModelNode>): FBXModelNode | undefined {
  if (!models) { return undefined; }
  for (const p of parents) {
    const pid = typeof p.ID === 'number' ? p.ID : parseInt(String(p.ID));
    const m = models[pid.toString()];

    if (m) { return m; }
  }

  return undefined;
}

function extractGeometricTransform (modelNode: FBXModelNode): FBXTransformData {
  // 优先使用 Geometric*，回退到 Lcl_*
  const translation = extractNumberArray((modelNode as any).GeometricTranslation?.value)
    ?? extractNumberArray((modelNode as any).Lcl_Translation?.value)
    ?? [0, 0, 0];
  const rotation = extractNumberArray((modelNode as any).GeometricRotation?.value)
    ?? extractNumberArray((modelNode as any).Lcl_Rotation?.value)
    ?? [0, 0, 0];
  const scale = extractNumberArray((modelNode as any).GeometricScaling?.value)
    ?? extractNumberArray((modelNode as any).Lcl_Scaling?.value)
    ?? [1, 1, 1];
  const rotationOrderVal = (modelNode as any).RotationOrder?.value;
  const eulerOrder = typeof rotationOrderVal === 'number' ? getEulerOrder(rotationOrderVal) : getEulerOrder(0);

  return { translation, rotation, scale, eulerOrder };
}

function applyMatrixToPositions (positions: number[], matrix: Matrix4): Float32Array {
  const out = new Float32Array(positions.length);
  const v = new Vector3();

  for (let i = 0; i < positions.length; i += 3) {
    v.set(positions[i], positions[i + 1], positions[i + 2]).applyMatrix4(matrix);
    out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z;
  }

  return out;
}

function applyNormalMatrixToNormals (normals: number[], matrix: Matrix4): Float32Array {
  const out = new Float32Array(normals.length);
  const v = new Vector3();
  const nrm = new Matrix3().getNormalMatrix(matrix);

  for (let i = 0; i < normals.length; i += 3) {
    v.set(normals[i], normals[i + 1], normals[i + 2]).applyNormalMatrix(nrm);
    out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z;
  }

  return out;
}

function computeVertexNormals (positions: Float32Array): Float32Array {
  const out = new Float32Array(positions.length);
  const vA = new Vector3();
  const vB = new Vector3();
  const vC = new Vector3();
  const cb = new Vector3();
  const ab = new Vector3();

  for (let i = 0; i < positions.length; i += 9) {
    vA.set(positions[i], positions[i + 1], positions[i + 2]);
    vB.set(positions[i + 3], positions[i + 4], positions[i + 5]);
    vC.set(positions[i + 6], positions[i + 7], positions[i + 8]);

    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab).normalize();

    out[i] = cb.x; out[i + 1] = cb.y; out[i + 2] = cb.z;
    out[i + 3] = cb.x; out[i + 4] = cb.y; out[i + 5] = cb.z;
    out[i + 6] = cb.x; out[i + 7] = cb.y; out[i + 8] = cb.z;
  }

  return out;
}
