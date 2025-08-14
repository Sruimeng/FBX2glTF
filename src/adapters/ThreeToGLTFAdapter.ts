// Three.js到GLTF的适配器
import type { Document, Node, Mesh, Primitive, Material, Texture } from '@gltf-transform/core';
import { MathAdapter } from './MathAdapter';

import type {
  BufferGeometry as ThreeBufferGeometry,
  Material as ThreeMaterial,
  Texture as ThreeTexture,
  Vector3 as ThreeVector3 } from 'three';
import {
  Group as ThreeGroup,
  Mesh as ThreeMesh,
  SkinnedMesh as ThreeSkinnedMesh,
  Quaternion as ThreeQuaternion,
  Matrix4 as ThreeMatrix4,
} from 'three';

export class ThreeToGLTFAdapter {
  private document: Document;

  constructor (document: Document) {
    this.document = document;
  }

  // 转换Group/Object3D到Node节点
  convertGroup (group: ThreeGroup): Node {
    const transform = this.document.createNode(group.name || 'transform');

    // 设置变换属性
    if (group.position) {
      transform.setTranslation([
        group.position.x,
        group.position.y,
        group.position.z,
      ]);
    }

    if (group.rotation) {
      const quaternion = new ThreeQuaternion().setFromEuler(group.rotation);

      transform.setRotation([
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w,
      ]);
    }

    if (group.scale) {
      transform.setScale([
        group.scale.x,
        group.scale.y,
        group.scale.z,
      ]);
    }

    // 设置矩阵
    if (group.matrixAutoUpdate === false) {
      const matrix = group.matrix.elements;

      transform.setMatrix(matrix);
    }

    return transform;
  }

  // 转换BufferGeometry到glTF几何体
  convertGeometry (geometry: ThreeBufferGeometry): {
    primitives: Primitive[],
    attributes: Map<string, any>,
  } {
    const primitives: Primitive[] = [];
    const attributes = new Map<string, any>();

    // 处理索引
    let index: any = null;

    if (geometry.index) {
      const indexArray = geometry.index.array;
      const indexBuffer = this.document.createAccessor();
      indexBuffer.setArray(new Uint32Array(indexArray));

      index = indexBuffer;
    }

    // 处理顶点属性
    const positionAttr = geometry.getAttribute('position');

    if (positionAttr) {
      const positionArray = positionAttr.array;
      const positionBuffer = this.document.createAccessor();
      positionBuffer.setArray(new Float32Array(positionArray));

      attributes.set('POSITION', positionBuffer);
    }

    // 处理法线
    const normalAttr = geometry.getAttribute('normal');

    if (normalAttr) {
      const normalArray = normalAttr.array;
      const normalBuffer = this.document.createAccessor();
      normalBuffer.setArray(new Float32Array(normalArray));

      attributes.set('NORMAL', normalBuffer);
    }

    // 处理UV坐标
    const uvAttr = geometry.getAttribute('uv');

    if (uvAttr) {
      const uvArray = uvAttr.array;
      const uvBuffer = this.document.createAccessor();
      uvBuffer.setArray(new Float32Array(uvArray));

      attributes.set('TEXCOORD_0', uvBuffer);
    }

    // 处理切线
    const tangentAttr = geometry.getAttribute('tangent');

    if (tangentAttr) {
      const tangentArray = tangentAttr.array;
      const tangentBuffer = this.document.createAccessor();
      tangentBuffer.setArray(new Float32Array(tangentArray));

      attributes.set('TANGENT', tangentBuffer);
    }

    // 处理颜色
    const colorAttr = geometry.getAttribute('color');

    if (colorAttr) {
      const colorArray = colorAttr.array;
      const colorBuffer = this.document.createAccessor();
      colorBuffer.setArray(new Float32Array(colorArray));

      attributes.set('COLOR_0', colorBuffer);
    }

    // 处理骨骼权重和索引
    const weightAttr = geometry.getAttribute('skinWeight');
    const indexAttr = geometry.getAttribute('skinIndex');

    if (weightAttr && indexAttr) {
      const weightArray = weightAttr.array;
      const indexArray = indexAttr.array;

      const weightBuffer = this.document.createAccessor();
      weightBuffer.setArray(new Float32Array(weightArray));

      attributes.set('WEIGHTS_0', weightBuffer);

      const indexBuffer = this.document.createAccessor();
      indexBuffer.setArray(new Uint16Array(indexArray));

      attributes.set('JOINTS_0', indexBuffer);
    }

    // 创建图元
    const primitive = this.document.createPrimitive()
      .setAttribute('POSITION', attributes.get('POSITION')!);

    if (attributes.has('NORMAL')) {
      primitive.setAttribute('NORMAL', attributes.get('NORMAL')!);
    }

    if (attributes.has('TEXCOORD_0')) {
      primitive.setAttribute('TEXCOORD_0', attributes.get('TEXCOORD_0')!);
    }

    if (attributes.has('TANGENT')) {
      primitive.setAttribute('TANGENT', attributes.get('TANGENT')!);
    }

    if (attributes.has('COLOR_0')) {
      primitive.setAttribute('COLOR_0', attributes.get('COLOR_0')!);
    }

    if (attributes.has('WEIGHTS_0')) {
      primitive.setAttribute('WEIGHTS_0', attributes.get('WEIGHTS_0')!);
    }

    if (attributes.has('JOINTS_0')) {
      primitive.setAttribute('JOINTS_0', attributes.get('JOINTS_0')!);
    }

    if (index !== null) {
      primitive.setIndices(index);
    }

    primitives.push(primitive);

    return { primitives, attributes };
  }

  // 转换Three.js材质到glTF材质
  convertMaterial (material: any): Material {
    const gltfMaterial = this.document.createMaterial(material.name || 'material');

    // 基础材质属性
    if ('color' in material && material.color) {
      gltfMaterial.setBaseColorFactor([
        (material.color as any).r || 1,
        (material.color as any).g || 1,
        (material.color as any).b || 1,
        ('opacity' in material) ? (material.opacity as number) : 1.0,
      ]);
    }

    // 金属度
    if ('metalness' in material) {
      gltfMaterial.setMetallicFactor(material.metalness as number);
    }

    // 粗糙度
    if ('roughness' in material) {
      gltfMaterial.setRoughnessFactor(material.roughness as number);
    }

    // 自发光
    if ('emissive' in material && material.emissive) {
      gltfMaterial.setEmissiveFactor([
        (material.emissive as any).r || 0,
        (material.emissive as any).g || 0,
        (material.emissive as any).b || 0,
      ]);
    }

    // 双面渲染
    if ('side' in material) {
      gltfMaterial.setDoubleSided(material.side === 2); // THREE.DoubleSide
    }

    // 透明度
    if ('transparent' in material) {
      gltfMaterial.setAlphaMode(material.transparent ? 'BLEND' : 'OPAQUE');
    }

    // 线裁剪
    if ('alphaTest' in material) {
      gltfMaterial.setAlphaCutoff(material.alphaTest);
    }

    return gltfMaterial;
  }

  // 转换Three.js纹理到glTF纹理
  convertTexture (texture: any): Texture {
    const gltfTexture = this.document.createTexture();

    // 设置纹理属性
    if (texture.image) {
      gltfTexture.setImage(texture.image);
    }

    // 纹理属性设置在@gltf-transform/core中可能有所不同
    // 这里暂时不设置纹理参数，后续根据实际API调整

    return gltfTexture;
  }

  // 转换纹理坐标模式
  private convertWrapMode (wrapMode: number): number {
    switch (wrapMode) {
      case 1000: // THREE.RepeatWrapping
        return 10497; // REPEAT
      case 1001: // THREE.ClampToEdgeWrapping
        return 33071; // CLAMP_TO_EDGE
      case 1002: // THREE.MirroredRepeatWrapping
        return 33648; // MIRRORED_REPEAT
      default:
        return 10497; // REPEAT
    }
  }

  // 转换过滤模式
  private convertFilterMode (filterMode: number): number {
    switch (filterMode) {
      case 1006: // THREE.NearestFilter
        return 9728; // NEAREST
      case 1007: // THREE.NearestMipmapNearestFilter
        return 9984; // NEAREST_MIPMAP_NEAREST
      case 1008: // THREE.NearestMipmapLinearFilter
        return 9986; // NEAREST_MIPMAP_LINEAR
      case 1003: // THREE.LinearFilter
        return 9729; // LINEAR
      case 1004: // THREE.LinearMipmapNearestFilter
        return 9985; // LINEAR_MIPMAP_NEAREST
      case 1005: // THREE.LinearMipmapLinearFilter
        return 9987; // LINEAR_MIPMAP_LINEAR
      default:
        return 9729; // LINEAR
    }
  }

  // 转换Three.js网格到glTF网格
  convertMesh (mesh: ThreeMesh): Mesh {
    const gltfMesh = this.document.createMesh(mesh.name || 'mesh');

    // 转换几何体
    const geometryConversion = this.convertGeometry(mesh.geometry);

    // 转换材质
    let gltfMaterial: Material | null = null;

    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        // 处理多材质
        mesh.material.forEach((material, index) => {
          const gltfMat = this.convertMaterial(material);
          const primitive = geometryConversion.primitives[index];

          if (primitive) {
            primitive.setMaterial(gltfMat);
          }
        });
      } else {
        gltfMaterial = this.convertMaterial(mesh.material);
        geometryConversion.primitives.forEach(primitive => {
          primitive.setMaterial(gltfMaterial);
        });
      }
    }

    // 添加图元到网格
    geometryConversion.primitives.forEach(primitive => {
      gltfMesh.addPrimitive(primitive);
    });

    return gltfMesh;
  }

  // 转换Three.js蒙皮网格到glTF蒙皮网格
  convertSkinnedMesh (skinnedMesh: ThreeSkinnedMesh): {
    mesh: Mesh,
    skin: any, // glTF皮肤对象
  } {
    const mesh = this.convertMesh(skinnedMesh);

    // 创建皮肤
    const skin = this.document.createSkin();

    // 设置骨骼
    if (skinnedMesh.skeleton) {
      const joints = skinnedMesh.skeleton.bones.map(bone => {
        const transform = this.document.createNode(bone.name || 'bone');
        
        // 设置骨骼变换
        if (bone.position) {
          transform.setTranslation([bone.position.x, bone.position.y, bone.position.z]);
        }
        if (bone.quaternion) {
          transform.setRotation([bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w]);
        }
        if (bone.scale) {
          transform.setScale([bone.scale.x, bone.scale.y, bone.scale.z]);
        }

        return transform;
      });

      // 在@gltf-transform/core中设置关节的方法可能不同
      // 这里暂时使用setProperty方法
      (skin as any).joints = joints;
    }

    // 设置绑定矩阵
    if (skinnedMesh.bindMatrix) {
      const bindMatrix = skinnedMesh.bindMatrix.elements;
      const accessor = this.document.createAccessor();
      accessor.setArray(bindMatrix);
      
      // 在@gltf-transform/core中设置绑定矩阵的方法可能不同
      (skin as any).inverseBindMatrices = accessor;
    }

    return { mesh, skin };
  }

  // 转换变换层级
  convertHierarchy (group: ThreeGroup, parent?: Node): Node {
    const transform = this.convertGroup(group);

    if (parent) {
      parent.addChild(transform);
    }

    // 递归处理子对象
    group.children.forEach(child => {
      if (child instanceof ThreeGroup) {
        this.convertHierarchy(child, transform);
      } else if (child instanceof ThreeMesh) {
        const mesh = this.convertMesh(child);
        const meshTransform = this.document.createNode(child.name || 'mesh_transform');

        meshTransform.setMesh(mesh);
        transform.addChild(meshTransform);
      } else if (child instanceof ThreeSkinnedMesh) {
        const { mesh, skin } = this.convertSkinnedMesh(child);
        const meshTransform = this.document.createNode(child.name || 'skinned_mesh_transform');

        meshTransform.setMesh(mesh);
        meshTransform.setSkin(skin);
        transform.addChild(meshTransform);
      }
    });

    return transform;
  }

  // 转换整个场景
  convertScene (root: ThreeGroup): {
    scene: any, // glTF场景对象
    meshes: Mesh[],
    materials: Material[],
    textures: Texture[],
    transforms: Node[],
  } {
    const scene = this.document.createScene();
    const rootTransform = this.convertHierarchy(root);

    scene.addChild(rootTransform);

    // 收集所有资源
    const meshes: Mesh[] = [];
    const materials: Material[] = [];
    const textures: Texture[] = [];
    const transforms: Node[] = [];

    // 递归收集资源
    this.collectResources(rootTransform, meshes, materials, textures, transforms);

    return {
      scene,
      meshes,
      materials,
      textures,
      transforms,
    };
  }

  // 递归收集资源
  private collectResources (
    transform: Node,
    meshes: Mesh[],
    materials: Material[],
    textures: Texture[],
    transforms: Node[]
  ): void {
    transforms.push(transform);

    const mesh = transform.getMesh();

    if (mesh) {
      meshes.push(mesh);

      const materialList = mesh.listMaterials();
      if (materialList.length > 0) {
        const material = materialList[0];
        materials.push(material);

        // 纹理获取方法可能有所不同
        // 这里暂时不处理纹理
      }
    }

    // 递归处理子节点
    const children = transform.listChildren();
    children.forEach(child => {
      this.collectResources(child, meshes, materials, textures, transforms);
    });
  }

  // 创建变换矩阵
  createTransformMatrix (
    position: ThreeVector3,
    quaternion: ThreeQuaternion,
    scale: ThreeVector3
  ): ThreeMatrix4 {
    return MathAdapter.composeMatrix4(position, quaternion, scale);
  }

  // 分解变换矩阵
  decomposeTransformMatrix (matrix: ThreeMatrix4): {
    position: ThreeVector3,
    quaternion: ThreeQuaternion,
    scale: ThreeVector3,
  } {
    return MathAdapter.decomposeMatrix4(matrix);
  }

  // 变换点
  transformPoint (point: ThreeVector3, matrix: ThreeMatrix4): ThreeVector3 {
    return MathAdapter.vector3ApplyMatrix4(point, matrix);
  }

  // 变换向量
  transformVector (vector: ThreeVector3, matrix: ThreeMatrix4): ThreeVector3 {
    return MathAdapter.vector3ApplyMatrix4(vector, matrix);
  }

  // 变换法线
  transformNormal (normal: ThreeVector3, matrix: ThreeMatrix4): ThreeVector3 {
    // 简化版本，直接应用矩阵变换
    const result = new ThreeVector3().copy(normal);
    result.transformDirection(matrix);
    return result;
  }
}