/**
 * @file /types/parsers.ts
 * @description 解析器相关的类型定义
 */

import { Bone, Matrix4, Group } from 'three';
import { IFBXTree, FBXNode, FBXHeaderExtension, FBXGlobalSettings, FBXDocuments, FBXDefinitions, FBXObjects } from './index';
import { FBXConnection, FBXConnectionNode } from './connections';

/**
 * 变形器相关类型
 */
export interface Deformers {
  skeletons: Record<string, FBXSkeleton>;
  morphTargets: Record<string, FBXMorphTarget>;
}

/**
 * FBX 骨骼定义
 */
export interface FBXSkeleton {
  ID: number;
  name: string;
  bones: Bone[];
  rawBones?: Array<{
    ID: number;
    indices: number[];
    weights: number[];
    transformLinkMatrix: Matrix4;
  }>;
}

/**
 * FBX 变形目标定义
 */
export interface FBXMorphTarget {
  ID: number;
  name: string;
  weights: number[];
  rawTargets?: Array<{
    name: string;
    geoID: number;
  }>;
}

/**
 * 模型统计信息
 */
export interface ModelInfo {
  polygons: number;
  quads: number;
  triangles: number;
  vertices: number;
}

/**
 * 模型加载结果
 */
export interface ModelLoaderResult {
  scene: Group;
  animations: any[]; // THREE.AnimationClip[]
  modelInfo: ModelInfo;
}

/**
 * 用户数据变换信息
 */
export interface UserDataTransform {
  eulerOrder?: string;
  inheritType?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  preRotation?: number[];
  postRotation?: number[];
  rotationPivot?: number[];
  scalingPivot?: number[];
  scalingOffset?: number[];
  rotationOffset?: number[];
  parentMatrix?: Matrix4;
  parentMatrixWorld?: Matrix4;
}

/**
 * 解析上下文 - 替代全局状态
 */
export interface ParseContext {
  fbxTree: IFBXTree;
  connections: Record<number, FBXConnectionNode>;
  sceneGraph: Group;
}

/**
 * FBX 解析器工厂 - 直接构建 IFBXTree
 */
export class FBXTreeFactory {
  private tree: Partial<IFBXTree> = {};
  private connections: FBXConnection[] = [];

  // 设置头信息
  setHeader(header: any): FBXTreeFactory {
    this.tree.FBXHeaderExtension = header;
    return this;
  }

  // 设置全局设置
  setGlobalSettings(settings: any): FBXTreeFactory {
    this.tree.GlobalSettings = settings;
    return this;
  }

  // 添加对象
  addObject(type: string, id: string | number, object: any): FBXTreeFactory {
    if (!this.tree.Objects) {
      this.tree.Objects = { name: 'Objects', singleProperty: false };
    }
    if (!(this.tree.Objects as any)[type]) {
      (this.tree.Objects as any)[type] = {};
    }
    (this.tree.Objects as any)[type][id.toString()] = object;
    return this;
  }

  // 添加连接
  addConnection(connection: FBXConnection): FBXTreeFactory {
    this.connections.push(connection);
    return this;
  }

  // 构建最终的 IFBXTree
  build(): IFBXTree {
    // 处理连接关系
    this.processConnections();

    // 设置默认值 - 所有属性都是可选的
    const defaultHeader: FBXHeaderExtension = {
      name: 'FBXHeaderExtension',
      singleProperty: false,
      FBXHeaderVersion: 0,
      FBXVersion: 0,
      Creator: '',
    };

    const defaultNode: FBXNode = {
      name: '',
      singleProperty: false,
    };

    const defaultGlobalSettings: FBXGlobalSettings = {
      name: 'GlobalSettings',
      singleProperty: false,
      Version: 0,
      UpAxis: { flag: '', type: 'int', value: 1 },
      UpAxisSign: { flag: '', type: 'int', value: 1 },
      FrontAxis: { flag: '', type: 'int', value: 2 },
      FrontAxisSign: { flag: '', type: 'int', value: 1 },
      CoordAxis: { flag: '', type: 'int', value: 0 },
      CoordAxisSign: { flag: '', type: 'int', value: 1 },
      UnitScaleFactor: { flag: '', type: 'double', value: 1 },
      DefaultCamera: { flag: '', type: 'KString', value: 'Producer Perspective' },
      TimeMode: { flag: '', type: 'int', value: 0 },
    };

    const defaultDocuments: FBXDocuments = {
      name: 'Documents',
      singleProperty: false,
      Count: 0,
      Document: {},
    };

    const defaultDefinitions: FBXDefinitions = {
      name: 'Definitions',
      singleProperty: false,
      Version: 1,
      Count: 0,
      ObjectType: {},
    };

    const defaultObjects: FBXObjects = {
      name: 'Objects',
      singleProperty: false,
    };

    return {
      FBXHeaderExtension: this.tree.FBXHeaderExtension || defaultHeader,
      FileId: this.tree.FileId || defaultNode,
      CreationTime: this.tree.CreationTime || defaultNode,
      Creator: this.tree.Creator || defaultNode,
      GlobalSettings: this.tree.GlobalSettings || defaultGlobalSettings,
      Documents: this.tree.Documents || defaultDocuments,
      Definitions: this.tree.Definitions || defaultDefinitions,
      Objects: this.tree.Objects || defaultObjects,
    };
  }

  private processConnections(): void {
    // 将连接数组转换为 Record 结构
    const connectionMap: Record<number, FBXConnectionNode> = {};

    // 初始化所有节点的连接关系
    for (const conn of this.connections) {
      if (!connectionMap[conn.from]) {
        connectionMap[conn.from] = { children: [], parents: [] };
      }
      if (!connectionMap[conn.to]) {
        connectionMap[conn.to] = { children: [], parents: [] };
      }
    }

    // 填充连接关系
    for (const conn of this.connections) {
      const fromNode = connectionMap[conn.from];
      const toNode = connectionMap[conn.to];

      if (fromNode && toNode) {
        fromNode.children.push({
          ID: conn.to,
          from: conn.from,
          to: conn.to,
          relationship: conn.relationship
        });
        toNode.parents.push({
          ID: conn.from,
          from: conn.from,
          to: conn.to,
          relationship: conn.relationship
        });
      }
    }

    // 将连接关系存储到上下文中
    this.connectionsMap = connectionMap;
  }

  private connectionsMap?: Record<number, FBXConnectionNode>;

  getConnections(): Record<number, FBXConnectionNode> {
    return this.connectionsMap || {};
  }
}

/**
 * 加载器选项
 */
export interface LoaderOptions {
  manager?: any; // THREE.LoadingManager
}
