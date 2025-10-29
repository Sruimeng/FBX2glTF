/**
 * FBX 子节点处理器
 * 负责处理各种特殊类型的子节点
 */

import type { FBXConnectionNode, FBXTree, FBXTreeNode } from '../../types';

/**
 * 解析子节点
 * @param name 父节点名称
 * @param node 父节点
 * @param subNode 子节点
 */
export function parseSubNode (name: string, node: FBXTree | FBXTreeNode, subNode: any): void {
  // special case: child node is single property
  if (subNode.singleProperty === true && subNode.propertyList && subNode.propertyList.length > 0) {
    const value = subNode.propertyList[0];

    if (Array.isArray(value)) {
      node[subNode.name as string] = subNode;

      subNode.a = value;
    } else {
      node[subNode.name as string] = value;
    }
  } else if (name === 'Connections' && subNode.name === 'C') {
    const array: FBXConnectionNode[] = [];
    const propertyDef = subNode.propertyList as [string, number, number | string];

    propertyDef.forEach(property => {
      // first Connection is FBX type (OO, OP, etc.). We'll discard these
      if (propertyDef.indexOf(property) !== 0) {
        array.push(property as unknown as FBXConnectionNode);
      }
    });

    if ((node as any).connections === undefined) {
      (node as any).connections = [];
    }

    (node as any).connections.push(array as unknown as FBXConnectionNode);
  } else if (subNode.name === 'Properties70') {
    const keys = Object.keys(subNode);

    keys.forEach(function (key) {
      (node as Record<string, unknown>)[key] = (subNode as Record<string, unknown>)[key];
    });
  } else if (name === 'Properties70' && subNode.name === 'P') {
    const propertyList = subNode.propertyList as [string, string, string, boolean, number, number, number];
    let innerPropName = propertyList[0];
    let innerPropType1 = propertyList[1];
    const innerPropType2 = propertyList[2];
    const innerPropFlag = propertyList[3];
    let innerPropValue: any;

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
    node[innerPropName] = {
      flag: innerPropFlag,
      type: innerPropType1,
      type2: innerPropType2,
      value: innerPropValue,
    };
  } else if (node[subNode.name as string] === undefined) {
    if (typeof subNode.id === 'number' && subNode.name) {
      node[subNode.name] = {};
      ((node as Record<string, unknown>)[subNode.name] as Record<number, unknown>)[subNode.id] = subNode;
    } else {
      node[subNode.name as string] = subNode;
    }
  } else {
    if (subNode.name === 'PoseNode') {
      if (!Array.isArray(node[subNode.name])) {
        (node as any)[subNode.name] = [node[subNode.name]];
      }

      ((node as Record<string, unknown>)[subNode.name] as unknown[]).push(subNode);
    } else if (subNode.name && ((node as Record<string, unknown>)[subNode.name] as Record<number, unknown>)[subNode.id as number] === undefined) {
      ((node as Record<string, unknown>)[subNode.name] as Record<number, unknown>)[subNode.id as number] = subNode;
    }
  }
}