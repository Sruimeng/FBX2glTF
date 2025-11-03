import type {
  IParsingContext,
  FBXConnectionNode,
  FBXLightNodeAttribute,
  FBXModelNode,
  FBXSkeleton,
  FBXSceneParserOptions,
  SceneInfo,
  SceneParseResult,
  Object3DWithID,
  ModelInfo,
} from '../../types';
import type { BufferGeometry, MeshStandardMaterial } from 'three';
import {
  Group,
  Object3D,
  PerspectiveCamera,
  PointLight,
  DirectionalLight,
  SpotLight,
  Color,
  ColorManagement,
  MathUtils,
  SRGBColorSpace,
} from 'three';
import { generateTransform } from '../utils';
import { AnimationParser } from '../FBX-animation-parser';

export function createCamera (context: IParsingContext, relationships: FBXConnectionNode) {
  const fbxTree = context.fbxTree;
  let model: Object3D;
  let cameraAttribute: FBXLightNodeAttribute | undefined;

  if (!fbxTree || !fbxTree.Objects) {
    throw new Error('Global FBXTree or fbxTree.Objects is undefined');
  }

  relationships.children.forEach(child => {
    const nodeAttribute = fbxTree.Objects?.NodeAttribute;

    if (!nodeAttribute) {
      throw new Error('NodeAttribute is undefined');
    }

    const attr = nodeAttribute[child.ID];

    if (attr !== undefined) {
      cameraAttribute = attr;
    }
  });

  if (!cameraAttribute) {
    model = new Object3D();
  } else {
    let type = 0;

    if (
      cameraAttribute.CameraProjectionType !== undefined
      && cameraAttribute.CameraProjectionType.value === 1
    ) {
      type = 1;
    }

    let nearClippingPlane = 1;

    if (cameraAttribute.NearPlane !== undefined) {
      const nearPlane = cameraAttribute.NearPlane.value;

      if (typeof nearPlane !== 'number') {
        throw new Error('THREE.FBXLoader: Invalid near plane value');
      }

      nearClippingPlane = nearPlane / 1000;
    }

    let farClippingPlane = 1000;

    if (cameraAttribute.FarPlane !== undefined) {
      const farPlane = cameraAttribute.FarPlane.value;

      if (typeof farPlane !== 'number') {
        throw new Error('THREE.FBXLoader: Invalid far plane value');
      }
      // FBX stores the far plane in millimeters

      farClippingPlane = farPlane / 1000;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;

    if (cameraAttribute.AspectWidth !== undefined && cameraAttribute.AspectHeight !== undefined) {
      const aspectWidth = cameraAttribute.AspectWidth.value;
      const aspectHeight = cameraAttribute.AspectHeight.value;

      if (typeof aspectWidth !== 'number' || typeof aspectHeight !== 'number') {
        throw new Error('THREE.FBXLoader: Invalid aspect width or height value');
      }
      width = aspectWidth;
      height = aspectHeight;
    }

    const aspect = width / height;

    let fov = 45;

    if (cameraAttribute.FieldOfView !== undefined) {
      const fieldOfView = cameraAttribute.FieldOfView.value;

      if (typeof fieldOfView !== 'number') {
        throw new Error('THREE.FBXLoader: Invalid field of view value');
      }
      // FBX stores the field of view in radians
      fov = fieldOfView;
    }

    const focalLength = cameraAttribute.FocalLength ? cameraAttribute.FocalLength.value : null;

    if (typeof focalLength !== 'number' && focalLength !== null) {
      throw new Error('THREE.FBXLoader: Invalid focal length value');
    }
    switch (type) {
      case 0: // Perspective
        model = new PerspectiveCamera(fov, aspect, nearClippingPlane, farClippingPlane);
        if (focalLength !== null) {
          (model as PerspectiveCamera).setFocalLength(focalLength);
        }

        break;
      case 1: // Orthographic
        console.warn('THREE.FBXLoader: Orthographic cameras not supported yet.');
        model = new Object3D();

        break;
      default:
        console.warn('THREE.FBXLoader: Unknown camera type ' + type + '.');
        model = new Object3D();

        break;
    }
  }

  return model;
}

export function createLight (context: IParsingContext, relationships: FBXConnectionNode) {
  const fbxTree = context.fbxTree;

  if (!fbxTree || !fbxTree.Objects) {
    throw new Error('Global FBXTree or fbxTree.Objects is undefined');
  }
  let model: Object3D;
  let lightAttribute: FBXLightNodeAttribute | undefined;

  const nodeAttribute = fbxTree.Objects.NodeAttribute;

  if (!nodeAttribute) {
    throw new Error('NodeAttribute is undefined');
  }
  relationships.children.forEach(child => {
    const attr = nodeAttribute[child.ID];

    if (attr !== undefined) {
      lightAttribute = attr;
    }
  });

  if (lightAttribute === undefined) {
    model = new Object3D();
  } else {
    let type;

    // LightType can be undefined for Point lights
    if (lightAttribute.LightType === undefined) {
      type = 0;
    } else {
      type = lightAttribute.LightType.value;
    }

    let color: Color = new Color(0xffffff);

    if (lightAttribute.Color !== undefined) {
      if (typeof lightAttribute.Color.value !== 'object') {
        throw new Error('THREE.FBXLoader: Invalid light color value');
      }

      color = ColorManagement.toWorkingColorSpace(
        new Color().fromArray(lightAttribute.Color.value),
        SRGBColorSpace,
      );
    }

    if (typeof lightAttribute.Intensity?.value !== 'number') {
      throw new Error('THREE.FBXLoader: Invalid light intensity value');
    }
    let intensity
      = lightAttribute.Intensity === undefined ? 1 : lightAttribute.Intensity.value / 100;

    // light disabled
    if (
      lightAttribute.CastLightOnObject !== undefined
      && lightAttribute.CastLightOnObject.value === 0
    ) {
      intensity = 0;
    }

    let distance = 0;

    if (lightAttribute.FarAttenuationEnd !== undefined) {
      if (
        lightAttribute.EnableFarAttenuation !== undefined
        && lightAttribute.EnableFarAttenuation.value === 0
      ) {
        distance = 0;
      } else {
        if (typeof lightAttribute.FarAttenuationEnd.value !== 'number') {
          throw new Error('THREE.FBXLoader: Invalid light far attenuation end value');
        }

        distance = lightAttribute.FarAttenuationEnd.value;
      }
    }

    // TODO: could this be calculated linearly from FarAttenuationStart to FarAttenuationEnd?
    const decay = 1;

    switch (type) {
      case 0: // Point
        model = new PointLight(color, intensity, distance, decay);

        break;
      case 1: // Directional
        model = new DirectionalLight(color, intensity);

        break;
      case 2: // Spot
        {
          let angle = Math.PI / 3;

          if (lightAttribute.InnerAngle !== undefined) {
            const innerAngle = lightAttribute.InnerAngle.value;

            if (typeof innerAngle !== 'number') {
              throw new Error('THREE.FBXLoader: Invalid light inner angle value');
            }
            angle = MathUtils.degToRad(innerAngle);
          }

          let penumbra = 0;

          if (lightAttribute.OuterAngle !== undefined) {
            const outerAngle = lightAttribute.OuterAngle.value;

            if (typeof outerAngle !== 'number') {
              throw new Error('THREE.FBXLoader: Invalid light outer angle value');
            }

            // TODO: this is not correct - FBX calculates outer and inner angle in degrees
            // with OuterAngle > InnerAngle && OuterAngle <= Math.PI
            // while three.js uses a penumbra between (0, 1) to attenuate the inner angle
            penumbra = MathUtils.degToRad(outerAngle);
            penumbra = Math.max(penumbra, 1);
          }

          model = new SpotLight(color, intensity, distance, angle, penumbra, decay);
        }

        break;
      default:
        console.warn(
          'THREE.FBXLoader: Unknown light type '
          + lightAttribute.LightType?.value
          + ', defaulting to a PointLight.',
        );
        model = new PointLight(color, intensity);

        break;
    }

    if (lightAttribute.CastShadows !== undefined && lightAttribute.CastShadows.value === 1) {
      (model as DirectionalLight | SpotLight | PointLight).castShadow = true;
    }
  }

  return model;
}

export function parseScene (
  context: IParsingContext,
  sceneInfo: SceneInfo,
  option: FBXSceneParserOptions,
  helpers: {
    parseWireFrameModels: (
      skeletons: Record<string, FBXSkeleton>,
      geometryMap: Map<number, BufferGeometry>,
      materialMap: Map<number, MeshStandardMaterial>,
      geoInfoMap: Map<number, ModelInfo>,
    ) => { modelInfoMap: Record<string, ModelInfo>, modelMap: Map<number, Object3D> },
    setLookAtProperties: (model: Object3D, modelNode: FBXModelNode) => void,
    bindSkeleton: (
      skeletons: Record<string, FBXSkeleton>,
      geometryMap: Map<number, BufferGeometry>,
      modelMap: Map<number, Object3D>,
    ) => void,
    addGlobalSceneSettings: () => void,
  },
): SceneParseResult {
  const {
    deformers,
    geoInfoMap = new Map(),
    geometryMap = new Map(),
    materialMap = new Map(),
  } = option;

  context.sceneGraph = new Group();
  const fbxTree = context.fbxTree;
  const connections = context.connections;

  if (!fbxTree || !fbxTree.Objects || !connections) {
    throw new Error('Global FBXTree or fbxTree.Objects or global connections is undefined');
  }

  const { modelInfoMap, modelMap } = helpers.parseWireFrameModels(
    deformers.skeletons,
    geometryMap,
    materialMap,
    geoInfoMap,
  );

  const modelNodes = fbxTree.Objects.Model;

  if (!modelNodes) {
    throw new Error('Model nodes are undefined');
  }
  modelMap.forEach(model => {
    const modelWithID = model as Object3DWithID;
    const modelID = modelWithID.ID;
    const modelNode = modelNodes[modelID];

    helpers.setLookAtProperties(model, modelNode);

    const parentConnections = connections.get(modelID)?.parents || [];

    parentConnections.forEach(connection => {
      const parent = modelMap.get(connection.ID);

      if (parent !== undefined) {
        parent.add(model);
      }
    });

    if (model.parent === null) {
      context.sceneGraph.add(model);
    }
  });

  helpers.bindSkeleton(deformers.skeletons, geometryMap, modelMap);

  helpers.addGlobalSceneSettings();

  context.sceneGraph.traverse(node => {
    if (node.userData.transformData) {
      if (node.parent) {
        node.userData.transformData.parentMatrix = node.parent.matrix;
        node.userData.transformData.parentMatrixWorld = node.parent.matrixWorld;
      }

      const transform = generateTransform(node.userData.transformData);

      node.applyMatrix4(transform);
      node.updateWorldMatrix(true, true);
    }
  });

  const animations = new AnimationParser(context).parse(null, context);

  // if all the models where already combined in a single group, just return that
  if (
    context.sceneGraph.children.length === 1
    && context.sceneGraph.children[0].type === 'Group'
  ) {
    const childGroup = context.sceneGraph.children[0] as Group;

    childGroup.animations = animations;
    context.sceneGraph = childGroup;
  }

  context.sceneGraph.animations = animations;

  return {
    animations: animations,
    modelInfo: modelInfoMap,
    scene: context.sceneGraph,
    sceneInfo,
  };
}

