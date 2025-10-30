import type { BufferGeometry } from 'three';
import { Line, LineBasicMaterial, Loader, Mesh, SkinnedMesh } from 'three';
import type { FBXConnectionNode, ModelInfo } from '../../types';
import type { GeometryGroup, GeometryWithDeformer } from '../../types';
import type { GeometryInfo } from '../../types/parsers/type-guards';
import type { MeshStandardMaterial } from 'three';

// Create a Mesh or SkinnedMesh from relationships, geometry and materials
export function createMesh (
  defaultMaterialIndex: number,
  relationships: FBXConnectionNode,
  geometryMap: Map<number, BufferGeometry>,
  materialMap: Map<number, MeshStandardMaterial>,
  geoInfoMap: Map<number, ModelInfo>,
): { model: Mesh | SkinnedMesh, modelInfo: GeometryInfo } {
  let model: Mesh | SkinnedMesh;
  let geometry: BufferGeometry | undefined;
  let material: MeshStandardMaterial | MeshStandardMaterial[] | null = null;
  let modelInfo: GeometryInfo = {
    isPBR: false,
    isTextured: false,
    isUVMapped: false,
    polygons: 0,
    quads: 0,
    triangles: 0,
    vertices: 0,
  };
  const materials: MeshStandardMaterial[] = [];

  // get geometry and materials(s) from connections
  relationships.children.forEach(child => {
    if (geometryMap.has(child.ID)) {
      geometry = geometryMap.get(child.ID);
      modelInfo = geoInfoMap.get(child.ID) || modelInfo;
    }

    if (materialMap.has(child.ID)) {
      const mat = materialMap.get(child.ID);

      if (mat) {
        materials.push(mat);
      }
    }
  });

  if (materials.length > 1) {
    material = materials;
  } else if (materials.length > 0) {
    material = materials[0];
  } else {
    const defaultMaterial = materialMap.get(defaultMaterialIndex);

    if (defaultMaterial) {
      material = defaultMaterial;
      materials.push(defaultMaterial);
    }
  }

  if (material) {
    if (Array.isArray(material)) {
      const firstMaterial = material[0];

      if (firstMaterial) {
        modelInfo.isPBR = Boolean(firstMaterial.metalnessMap) && Boolean(firstMaterial.roughnessMap);
        modelInfo.isTextured = Boolean(firstMaterial.map);
      }
    } else {
      modelInfo.isPBR = Boolean(material.metalnessMap) && Boolean(material.roughnessMap);
      modelInfo.isTextured = Boolean(material.map);
    }
    modelInfo.isUVMapped = Boolean(geometry?.attributes.uv);
  }

  if (!geometry) {
    throw new Error('THREE.FBXLoader: No geometry found for mesh.');
  }

  if ('color' in geometry.attributes) {
    materials.forEach(mat => {
      mat.vertexColors = true;
    });
  }

  // Clean up invalid material indices in geometry groups
  if (geometry.groups.length > 0) {
    let needsDefaultMaterial = false;

    for (let i = 0, il = geometry.groups.length; i < il; i++) {
      const group = geometry.groups[i] as GeometryGroup;
      const materialIndex = group.materialIndex;

      if (materialIndex == null || materialIndex < 0 || materialIndex >= materials.length) {
        group.materialIndex = materials.length;
        needsDefaultMaterial = true;
      }
    }

    if (needsDefaultMaterial) {
      const defaultMaterial = materialMap.get(defaultMaterialIndex);

      if (defaultMaterial) {
        materials.push(defaultMaterial);
      }
    }
  }

  if ((geometry as GeometryWithDeformer).FBX_Deformer) {
    const skinnedMesh = new SkinnedMesh(geometry, material || undefined);

    skinnedMesh.normalizeSkinWeights();

    model = skinnedMesh;
  } else {
    model = new Mesh(geometry, material || undefined);
  }

  return { model, modelInfo };
}

// Create a Line for a curve (e.g., Nurbs)
export function createCurve (relationships: FBXConnectionNode, geometryMap: Map<number, BufferGeometry>): Line {
  const geometry = relationships.children.reduce<BufferGeometry | null>((geo, child) => {
    if (geometryMap.has(child.ID)) {
      geo = geometryMap.get(child.ID) ?? null;
    }
    if (!geo) {
      throw new Error('THREE.FBXLoader: No geometry found for curve.');
    }

    return geo;
  }, null);

  const material = new LineBasicMaterial({
    color: 0x3300ff,
    linewidth: 1,
    name: Loader.DEFAULT_MATERIAL_NAME,
  });

  if (geometry === null) {
    throw new Error('THREE.FBXLoader: No geometry found for curve.');
  }

  return new Line(geometry, material);
}
