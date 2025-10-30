import type { LineBasicMaterial } from 'three';
import { Color, ColorManagement, DoubleSide, EquirectangularReflectionMapping, SRGBColorSpace, MeshStandardMaterial, MeshPhysicalMaterial, type Texture } from 'three';
import type { FBXMaterialNode, FBXConnectionNode, IFBXPropertyValue, FBXMeshStandardMaterialParameters, IFBXTree } from '../../types';
import { extractMaterialValue, extractMaterialArray } from '../../types/parsers/type-guards';

// Parse nodes in context.fbxTree.Objects.Material
export function parseMaterials (
  fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>,
  textureMap: Map<number, Texture>,
  defaultMaterialIndex: number
): Map<number, MeshStandardMaterial | MeshPhysicalMaterial | LineBasicMaterial> {
  const materialMap = new Map();

  if (!fbxTree || !fbxTree.Objects) {
    throw new Error('Global FBXTree or fbxTree.Objects is undefined');
  }

  if ('Material' in fbxTree.Objects) {
    const materialNodes = fbxTree.Objects.Material as Record<string, FBXMaterialNode>;

    for (const nodeID in materialNodes) {
      const material = parseMaterial(materialNodes[nodeID], textureMap, connections, fbxTree);

      if (material instanceof MeshStandardMaterial) {
        material.flatShading = true;
        material.roughness = 1;
      }
      if (material !== null) {
        materialMap.set(parseInt(nodeID), material);
      }
    }
  } else {
    const material = new MeshStandardMaterial();

    materialMap.set(defaultMaterialIndex, material);
  }

  return materialMap;
}

// Parse single node in context.fbxTree.Objects.Material
// Materials are connected to texture maps in context.fbxTree.Objects.Textures
// FBX format currently only supports Lambert and Phong shading models
export function parseMaterial (
  materialNode: FBXMaterialNode,
  textureMap: Map<number, Texture>,
  connections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree
): MeshStandardMaterial | MeshPhysicalMaterial | LineBasicMaterial | null {
  const ID = materialNode.id;
  const name = materialNode.attrName;
  let type: string | IFBXPropertyValue<string> = materialNode.ShadingModel;

  // Case where FBX wraps shading model in property object.
  if (typeof type === 'object') {
    type = type.value;
  }

  // Ignore unused materials which don't have any connections.
  if (!connections.has(ID)) {
    return null;
  }

  const parameters = parseParameters(materialNode, textureMap, ID, connections, fbxTree);

  let material;

  switch (type.toLowerCase()) {
    case 'phong':
      material = new MeshStandardMaterial({ metalness: 0, roughness: 0.5, side: DoubleSide });

      break;
    case 'lambert':
      material = new MeshPhysicalMaterial();

      break;
    default:
      console.warn(
        'THREE.FBXLoader: unknown material type "%s". Defaulting to MeshStandardMaterial.',
        type,
      );
      material = new MeshStandardMaterial({ metalness: 0, roughness: 0.5, side: DoubleSide });

      break;
  }
  if (parameters.map) {
    material.setValues(parameters);
  } else {
    material = new MeshStandardMaterial();
  }
  material.name = name;

  return material;
}

// Parse FBX material and return parameters suitable for a three.js material
// Also parse the texture map and return any textures associated with the material
export function parseParameters (
  materialNode: FBXMaterialNode,
  textureMap: Map<number, Texture>,
  ID: number,
  connections: Map<number, FBXConnectionNode>,
  fbxTree: IFBXTree
): FBXMeshStandardMaterialParameters {
  const parameters: FBXMeshStandardMaterialParameters = {};

  if (!connections) {
    throw new Error('Global connections is undefined');
  }

  if (materialNode.BumpFactor) {
    const bumpScale = extractMaterialValue(materialNode.BumpFactor);

    if (typeof bumpScale === 'number') {
      parameters.bumpScale = bumpScale;
    }
  }

  // tripo 默认修改成白色
  parameters.color = new Color();

  if (materialNode.DisplacementFactor) {
    const displacementScale = extractMaterialValue(materialNode.DisplacementFactor);

    if (typeof displacementScale === 'number') {
      parameters.displacementScale = displacementScale;
    }
  }

  if (materialNode.Emissive) {
    const emissiveArray = extractMaterialArray(materialNode.Emissive);

    if (emissiveArray && emissiveArray.length >= 3) {
      parameters.emissive = ColorManagement.toWorkingColorSpace(
        new Color().fromArray(emissiveArray),
        SRGBColorSpace,
      );
    }
  } else if (
    materialNode.EmissiveColor
    && (materialNode.EmissiveColor.type === 'Color'
      || materialNode.EmissiveColor.type === 'ColorRGB')
  ) {
    // The blender exporter exports emissive color here instead of in materialNode.Emissive
    const emissiveColorArray = extractMaterialArray(materialNode.EmissiveColor);

    if (emissiveColorArray && emissiveColorArray.length >= 3) {
      parameters.emissive = ColorManagement.toWorkingColorSpace(
        new Color().fromArray(emissiveColorArray),
        SRGBColorSpace,
      );
    }
  }

  if (materialNode.EmissiveFactor) {
    const emissiveFactor = extractMaterialValue(materialNode.EmissiveFactor);

    if (typeof emissiveFactor === 'string') {
      parameters.emissiveIntensity = parseFloat(emissiveFactor);
    } else if (typeof emissiveFactor === 'number') {
      parameters.emissiveIntensity = emissiveFactor;
    }
  }

  // the transparency handling is implemented based on Blender/Unity's approach: https://github.com/sobotka/blender-addons/blob/7d80f2f97161fc8e353a657b179b9aa1f8e5280b/io_scene_fbx/import_fbx.py#L1444-L1459

  parameters.opacity
    = 1 - (materialNode.TransparencyFactor ? parseFloat(materialNode.TransparencyFactor.value) : 0);

  if (parameters.opacity === 1 || parameters.opacity === 0) {
    parameters.opacity = materialNode.Opacity ? parseFloat(materialNode.Opacity.value) : 1;

    if (parameters.opacity === null) {
      parameters.opacity
        = 1
          - (materialNode.TransparentColor
            ? parseFloat(materialNode.TransparentColor.value[0])
            : 0);
    }
  }

  if (parameters.opacity < 1.0) {
    parameters.transparent = true;
  }

  if (materialNode.ReflectionFactor) {
    parameters.reflectivity = materialNode.ReflectionFactor.value;
  }

  if (materialNode.Shininess) {
    parameters.roughness = 1 / materialNode.Shininess.value;
  }

  if (materialNode.Specular) {
    // 将specular颜色转换为metalness值
    // 可以使用颜色的平均值或亮度作为金属度
    const specularColor = new Color().fromArray(materialNode.Specular.value);

    // 使用RGB平均值作为金属度
    parameters.metalness = (specularColor.r + specularColor.g + specularColor.b) / 3;
    // 限制metalness在0-1范围内
    parameters.metalness = Math.max(0, Math.min(1, parameters.metalness));
  } else if (materialNode.SpecularColor && materialNode.SpecularColor.type === 'Color') {
    // The blender exporter exports specular color here instead of in materialNode.Specular
    const specularColor = new Color().fromArray(materialNode.SpecularColor.value);

    // 使用RGB平均值作为金属度
    parameters.metalness = (specularColor.r + specularColor.g + specularColor.b) / 3;
    // 限制metalness在0-1范围内
    parameters.metalness = Math.max(0, Math.min(1, parameters.metalness));
  }

  connections.get(ID)?.children.forEach(child => {
    if (!(typeof child.ID === 'number')) {
      throw new Error('THREE.FBXLoader: Invalid child ID type');
    }
    const type = child.relationship;

    switch (type) {
      case 'Bump':
        parameters.bumpMap = getTexture(textureMap, child.ID, fbxTree, connections);

        break;
      case 'ShininessExponent':
        parameters.roughnessMap = getTexture(textureMap, child.ID, fbxTree, connections);

        break;
      case 'ReflectionFactor':
        parameters.metalnessMap = getTexture(textureMap, child.ID, fbxTree, connections);

        break;
      case 'Maya|TEX_ao_map':
        parameters.aoMap = getTexture(textureMap, child.ID, fbxTree, connections);

        break;
      case 'DiffuseColor':
      case 'Maya|TEX_color_map':
        parameters.map = getTexture(textureMap, child.ID, fbxTree, connections);
        if (parameters.map !== undefined) {
          parameters.map.colorSpace = SRGBColorSpace;
        }

        break;
      case 'DisplacementColor':
        parameters.displacementMap = getTexture(textureMap, child.ID, fbxTree, connections);

        break;
      case 'EmissiveColor':
        parameters.emissiveMap = getTexture(textureMap, child.ID, fbxTree, connections);
        if (parameters.emissiveMap !== undefined) {
          parameters.emissiveMap.colorSpace = SRGBColorSpace;
        }

        break;
      case 'NormalMap':
      case 'Maya|TEX_normal_map':
        parameters.normalMap = getTexture(textureMap, child.ID, fbxTree, connections);

        break;
      case 'ReflectionColor':
        parameters.envMap = getTexture(textureMap, child.ID, fbxTree, connections);
        if (parameters.envMap !== undefined) {
          parameters.envMap.mapping = EquirectangularReflectionMapping;
          parameters.envMap.colorSpace = SRGBColorSpace;
        }

        break;
      case 'SpecularColor':
        parameters.specularMap = getTexture(textureMap, child.ID, fbxTree, connections);
        if (parameters.specularMap !== undefined) {
          parameters.specularMap.colorSpace = SRGBColorSpace;
        }

        break;
      case 'TransparentColor':
      case 'TransparencyFactor':
        parameters.alphaMap = getTexture(textureMap, child.ID, fbxTree, connections);
        parameters.transparent = true;

        break;
      case 'AmbientColor':
      case 'SpecularFactor': // AKA specularLevel
      case 'VectorDisplacementColor': // NOTE: Seems to be a copy of DisplacementColor
      default:
        console.warn(
          'THREE.FBXLoader: %s map is not supported in three.js, skipping texture.',
          type,
        );

        break;
    }
  });

  if (!parameters.map) {
    parameters.color.setHex(0x8f95ad);
  }

  return parameters;
}

// Helper function to get texture by ID with support for layered textures
export function getTexture (
  textureMap: Map<number, Texture>,
  id: number,
  fbxTree: IFBXTree,
  connections: Map<number, FBXConnectionNode>
): Texture | undefined {
  const objects = fbxTree.Objects;
  let textureID: number | undefined = id;

  if (!objects || !connections) {
    throw new Error('No objects found in fbxTree.');
  }
  // if the texture is a layered texture, just use the first layer and issue a warning
  if ('LayeredTexture' in objects && id in (objects.LayeredTexture || {})) {
    console.warn(
      'THREE.FBXLoader: layered textures are not supported in three.js. Discarding all but first layer.',
    );
    const firstChild = connections.get(id)?.children[0];

    if (firstChild) {
      textureID = firstChild.ID;
    }
  }

  if (!textureID) {
    throw new Error('THREE.FBXLoader: No valid texture ID found.');
  }

  return textureMap.get(textureID);
}