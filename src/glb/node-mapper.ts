import type { GLBParsingContext } from './context';
import type { FBXModelNode } from '../types/nodes/model-animation';
import { Euler, MathUtils, Vector3, Quaternion } from 'three';
import { extractNumberArray } from '../types/parsers/type-guards';
import { getEulerOrder } from '../parse/utils';

/**
 * 基于 FBXTree/Connections 的数学-only 节点映射。
 * - 不依赖 Three Object3D/Mesh/BufferGeometry
 * - 仅使用 Three 的数学类计算 TRS
 */
export function populateDocumentFromFBX (context: GLBParsingContext): void {
  const document = context.document;
  const rootScene = document.getRoot().getDefaultScene() ?? document.createScene('Scene');

  const fbxTree = context.fbxTree;
  const connections = context.connections;

  if (!fbxTree?.Objects) {
    throw new Error('FBXTree.Objects 未定义，无法构建 glTF 节点');
  }

  const models = (fbxTree.Objects as any).Model as Record<number, FBXModelNode> | undefined;

  if (!models) {
    // 若无 Model，则生成空场景
    return;
  }

  // 预创建所有 glTF Node 并缓存映射到上下文
  const nodeMap = context.modelNodeMap;

  for (const idStr in models) {
    const id = parseInt(idStr);
    const modelNode = models[id];
    const name = (modelNode?.attrName) || `Model_${id}`;
    const node = document.createNode(name);

    // 计算 TRS（优先使用 Geometric*，回退到 Lcl_*）
    const translation = getVec3(modelNode, 'GeometricTranslation')
      ?? getVec3(modelNode, 'Lcl_Translation')
      ?? new Vector3(0, 0, 0);

    const scale = getVec3(modelNode, 'GeometricScaling')
      ?? getVec3(modelNode, 'Lcl_Scaling')
      ?? new Vector3(1, 1, 1);

    const rotationDeg = getVec3(modelNode, 'GeometricRotation')
      ?? getVec3(modelNode, 'Lcl_Rotation')
      ?? new Vector3(0, 0, 0);

    const eulerOrder = getRotationOrder(modelNode);
    const euler = new Euler(
      MathUtils.degToRad(rotationDeg.x),
      MathUtils.degToRad(rotationDeg.y),
      MathUtils.degToRad(rotationDeg.z),
      eulerOrder,
    );
    const q = new Quaternion().setFromEuler(euler);

    node
      .setTranslation([translation.x, translation.y, translation.z])
      .setRotation([q.x, q.y, q.z, q.w])
      .setScale([scale.x, scale.y, scale.z]);

    nodeMap.set(id, node);
  }

  // 根据 Connections 建立父子层级
  for (const idStr in models) {
    const id = parseInt(idStr);
    const node = nodeMap.get(id);

    if (!node) {continue;}

    const rel = connections.get(id);

    // 寻找父 Model
    const parentModelRef = rel?.parents.find(p => {
      const pid = typeof p.ID === 'number' ? p.ID : parseInt(String(p.ID));

      return models[pid] !== undefined;
    });

    if (parentModelRef) {
      const pid = typeof parentModelRef.ID === 'number' ? parentModelRef.ID : parseInt(String(parentModelRef.ID));
      const parentNode = nodeMap.get(pid);

      parentNode?.addChild(node);
    } else {
      // 无父 Model，则加入根场景
      rootScene.addChild(node);
    }
  }
}

function getVec3 (modelNode: FBXModelNode, key: keyof FBXModelNode): Vector3 | undefined {
  const value = (modelNode as any)[key]?.value ?? (modelNode as any)[key]?.a;

  if (!value) {return undefined;}
  const arr = extractNumberArray(value);

  if (!arr || arr.length < 3) {return undefined;}

  return new Vector3(arr[0], arr[1], arr[2]);
}

function getRotationOrder (modelNode: FBXModelNode): Euler['order'] {
  const val = (modelNode as any).RotationOrder?.value;

  if (typeof val === 'number') {
    const order = getEulerOrder(val);

    // getEulerOrder 返回字符串如 'XYZ'
    return order as Euler['order'];
  }

  // 默认 'XYZ'
  return 'XYZ';
}
