/**
 * FBX 子节点处理器
 * 负责处理各种特殊类型的子节点
 */

import type { FBXConnectionNode, FBXTree, FBXTreeNode, FBXTypedProperty } from '../../types';
import type { FBXProperty } from '../../types/nodes/base-property';
import type { FBXPoseNode } from '../../types/nodes/model-animation';

// 严格的属性类型
type FBXPropertyList = [string, string, string, boolean, number, number, number];
type FBXConnectionProperty = [string, number, number | string];

// 允许的节点属性类型
type FBXNodeProperty = string | number | boolean | FBXTreeNode | FBXTreeNode[] | FBXProperty | FBXTypedProperty;

/**
 * 解析子节点
 * @param name 父节点名称
 * @param node 父节点
 * @param subNode 子节点
 */
export function parseSubNode (
  name: string,
  node: FBXTree | FBXTreeNode,
  subNode: FBXTreeNode
): void {
  // special case: child node is single property
  if (subNode.singleProperty === true && subNode.propertyList && subNode.propertyList.length > 0) {
    const value = subNode.propertyList[0];
    const name = subNode.name as keyof FBXTreeNode;

    if (Array.isArray(value)) {
      node[name] = subNode;

      subNode.a = value;
    } else {
      node[name] = value as FBXNodeProperty;
    }
  } else if (name === 'Connections' && subNode.name === 'C') {
    const array: string[] = [];
    const propertyDef = Array.isArray(subNode.propertyList) ? subNode.propertyList : [];

    propertyDef.forEach((property, index) => {
      // first Connection is FBX type (OO, OP, etc.). We'll discard these
      if (index !== 0) {
        array.push(property);
      }
    });

    const tree = node as FBXTree;

    if (tree.connections === undefined) {
      tree.connections = [];
    }

    tree.connections.push(array);
  } else if (subNode.name === 'Properties70') {
    const keys = Object.keys(subNode) as Array<keyof FBXTreeNode>;

    keys.forEach(function (key) {
      const typedNode = node as Record<string, FBXNodeProperty>;
      const typedSubNode = subNode as Record<string, FBXNodeProperty>;

      typedNode[key] = typedSubNode[key];
    });
  } else if (name === 'Properties70' && subNode.name === 'P') {
    const propertyList = subNode.propertyList as FBXPropertyList;
    let innerPropName = propertyList[0];
    let innerPropType1 = propertyList[1];
    const innerPropType2 = propertyList[2];
    const innerPropFlag = propertyList[3];
    let innerPropValue: string | number | number[];

    if (innerPropName.indexOf('Lcl ') === 0) {
      innerPropName = innerPropName.replace('Lcl ', 'Lcl_');
    }
    if (innerPropType1.indexOf('Lcl ') === 0) {
      innerPropType1 = innerPropType1.replace('Lcl ', 'Lcl_');
    }

    if (
      innerPropType1 === 'Color'
      || innerPropType1 === 'ColorRGB'
      || innerPropType1 === 'Vector'
      || innerPropType1 === 'Vector3D'
      || innerPropType1.indexOf('Lcl_') === 0
    ) {
      innerPropValue = [
        propertyList[4],
        propertyList[5],
        propertyList[6],
      ];
    } else {
      innerPropValue = propertyList[4];
    }

    // this will be copied to parent, see above
    (node as Record<string, FBXTypedProperty>)[innerPropName] = {
      flag: innerPropFlag,
      type: innerPropType1,
      type2: innerPropType2,
      value: innerPropValue,
    };
  } else if ((node as FBXTree)[subNode.name] === undefined) {
    if (typeof subNode.id === 'number' && subNode.name) {
      const tree = node as FBXTree;

      tree[subNode.name] = {};
      ((tree[subNode.name] as Record<number, FBXTreeNode>))[subNode.id] = subNode;
    } else {
      (node as FBXTree)[subNode.name] = subNode as FBXNodeProperty;
    }
  } else {
    if (subNode.name === 'PoseNode') {
      const poseNodeKey = subNode.name as keyof FBXTree;
      const currentPoseNode = (node as FBXTree)[poseNodeKey] as FBXPoseNode | FBXPoseNode[] | undefined;

      if (!Array.isArray(currentPoseNode)) {
        (node as FBXTree)[poseNodeKey] = currentPoseNode ? [currentPoseNode] : [];
      }

      const poseArray = (node as FBXTree)[poseNodeKey] as FBXPoseNode[];

      poseArray.push(subNode as FBXPoseNode);
    } else if (subNode.name && subNode.id !== undefined) {
      const treeNode = node as FBXTree;
      const existingNode = (treeNode[subNode.name] as Record<number, FBXTreeNode>);

      if (existingNode && existingNode[subNode.id] === undefined) {
        existingNode[subNode.id] = subNode;
      }
    }
  }
}