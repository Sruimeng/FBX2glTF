/**
 * @file parse/FBX-text-parser.ts
 * @description FBX文本格式解析器 - 基于Three.js FBXLoader源码
 */

import type { IFBXTree, FBXTreeNode } from '../types/core/fbx-types';

/**
 * FBX文本解析器
 */
export class TextParser {
  private currentIndent: number = 0;
  private allNodes: FBXTree;
  private nodeStack: FBXTreeNode[];
  private currentProp: unknown[] = [];
  private currentPropName: string = '';

  constructor () {
    this.allNodes = new FBXTree();
    this.nodeStack = [];
  }

  /**
   * 获取前一个节点
   */
  getPrevNode (): FBXTreeNode | undefined {
    return this.nodeStack[this.currentIndent - 2];
  }

  /**
   * 获取当前节点
   */
  getCurrentNode (): FBXTreeNode | undefined {
    return this.nodeStack[this.currentIndent - 1];
  }

  /**
   * 获取当前属性
   */
  getCurrentProp (): unknown[] {
    return this.currentProp;
  }

  /**
   * 推入节点栈
   */
  pushStack (node: FBXTreeNode): void {
    this.nodeStack.push(node);
    this.currentIndent += 1;
  }

  /**
   * 弹出节点栈
   */
  popStack (): void {
    this.nodeStack.pop();
    this.currentIndent -= 1;
  }

  /**
   * 设置当前属性
   */
  setCurrentProp (val: unknown[], name: string): void {
    this.currentProp = val;
    this.currentPropName = name;
  }

  /**
   * 解析文本
   */
  parse (text: string): IFBXTree {
    this.currentIndent = 0;
    this.allNodes = new FBXTree();
    this.nodeStack = [];
    this.currentProp = [];
    this.currentPropName = '';

    const split = text.split(/[\r\n]+/);

    split.forEach((line: string, i: number) => {
      const matchComment = line.match(/^[\s\t]*;/);
      const matchEmpty = line.match(/^[\s\t]*$/);

      if (matchComment || matchEmpty) {return;}

      const matchBeginning = line.match('^\\t{' + this.currentIndent + '}(\\w+):(.*){');
      const matchProperty = line.match('^\\t{' + (this.currentIndent) + '}(\\w+):[\\s\\t\\r\\n](.*)');
      const matchEnd = line.match('^\\t{' + (this.currentIndent - 1) + '}}');

      if (matchBeginning) {
        this.parseNodeBegin(line, matchBeginning);
      } else if (matchProperty) {
        this.parseNodeProperty(line, matchProperty, split[++i]);
      } else if (matchEnd) {
        this.popStack();
      } else if (line.match(/^[^\s\t}]/)) {
        // 大数组被分割成多行，以','字符结尾
        // 如果遇到这种情况，该行需要连接到前一行
        this.parseNodePropertyContinued(line);
      }
    });

    return this.allNodes.build();
  }

  /**
   * 解析节点开始
   */
  private parseNodeBegin (line: string, property: RegExpMatchArray): void {
    const nodeName = property[1].trim().replace(/^"/, '').replace(/"$/, '');

    const nodeAttrs = property[2].split(',').map(function (attr: string) {
      return attr.trim().replace(/^"/, '').replace(/"$/, '');
    });

    const node: Partial<FBXTreeNode> = { name: nodeName };
    const attrs = this.parseNodeAttr(nodeAttrs);

    const currentNode = this.getCurrentNode();

    // 顶级节点
    if (this.currentIndent === 0) {
      this.allNodes.add(nodeName, node as FBXTreeNode);
    } else {
      // 子节点
      // 如果子节点已存在，则追加它
      if (nodeName in currentNode!) {
        // 特殊情况Pose需要PoseNodes作为数组
        if (nodeName === 'PoseNode') {
          if (!(currentNode as any).PoseNode) {
            (currentNode as any).PoseNode = [];
          }
          (currentNode as any).PoseNode.push(node);
        } else if ((currentNode as any)[nodeName].id !== undefined) {
          (currentNode as any)[nodeName] = {};
          (currentNode as any)[nodeName][(currentNode as any)[nodeName].id] = (currentNode as any)[nodeName];
        }

        if (attrs.id !== '') {
          (currentNode as any)[nodeName][attrs.id] = node;
        }
      } else if (typeof attrs.id === 'number') {
        (currentNode as any)[nodeName] = {};
        (currentNode as any)[nodeName][attrs.id] = node;
      } else if (nodeName !== 'Properties70') {
        if (nodeName === 'PoseNode') {
          (currentNode as any)[nodeName] = [node];
        } else {
          (currentNode as any)[nodeName] = node;
        }
      }
    }

    if (typeof attrs.id === 'number') {node.id = attrs.id;}
    if (attrs.name !== '') {node.attrName = attrs.name;}
    if (attrs.type !== '') {node.attrType = attrs.type;}

    this.pushStack(node as FBXTreeNode);
  }

  /**
   * 解析节点属性
   */
  private parseNodeAttr (attrs: string[]): any {
    let id: string | number = '';
    let attrName = '';
    let attrType = '';

    if (attrs[0] !== '') {
      const parsedId = parseInt(attrs[0]);

      if (isNaN(parsedId)) {
        id = attrs[0];
      } else {
        id = parsedId;
      }
    }

    if (attrs[1] !== '') {
      attrName = attrs[1].replace(/^(\w+_)/, '');
    }

    if (attrs[2] !== '') {
      attrType = attrs[2];
    }

    return {
      id: id,
      name: attrName,
      type: attrType,
    };
  }

  /**
   * 解析节点属性
   */
  private parseNodeProperty (line: string, property: RegExpMatchArray, nextLine: string): void {
    const propName = property[1].trim().replace(/^"/, '').replace(/"$/, '');
    const propValue = property[2].trim().replace(/^"/, '').replace(/"$/, '');

    // for special case: base64 image data follows "Content: ," line
    // in this case next line will be the data
    if (propName === 'Content' && propValue === ',') {
      this.currentProp.push(nextLine.trim());

      return;
    }

    let nodes = [];

    // 连接字符串数组
    if (propValue.length > 1 && propValue[0] === '"' && propValue[propValue.length - 1] === '"') {
      propValue.split(',').map((v: string) => {
        nodes.push(v.trim().replace(/^"/, '').replace(/"$/, ''));
      });
    } else if (propValue !== '') {
      nodes.push(propValue);
    }

    this.setCurrentProp(nodes, propName);

    // 读取多行属性
    let currentLine: string | undefined = nextLine;

    while ((currentLine = this.getNextLine(currentLine)) !== undefined) {
      nodes = this.parseNodePropertyContinued(currentLine);
    }
  }

  /**
   * 解析多行属性
   */
  private parseNodePropertyContinued (line: string): unknown[] {
    const propValue = line.trim().replace(/^"/, '').replace(/"$/, '');

    if (propValue !== '') {
      this.currentProp.push(propValue);
    }

    return this.currentProp;
  }

  /**
   * 获取下一行
   */
  private getNextLine (line: string): string | undefined {
    if (line[line.length - 1] === ',') {
      return line;
    }

    return undefined;
  }
}

/**
 * 简单的FBX树实现
 */
class FBXTree {
  private tree: Partial<IFBXTree> = {};

  add (key: string, val: any): void {
    (this.tree as any)[key] = val;
  }

  build (): IFBXTree {
    return {
      objects: this.tree.Objects || {},
      connections: this.tree.connections || { C: [] },
      settings: this.tree.settings || {},
      time: this.tree.time || {},
      version: this.tree.version,
      root: this.tree.root,
      Objects: this.tree.Objects || {},
    };
  }
}