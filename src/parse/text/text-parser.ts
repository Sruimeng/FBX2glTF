import { FBXTree, BaseParser } from '../../types';
import type { PropertyArray, IParsingContext, TextNodeWithIndex } from '../../types';
import { isNumericString } from '../../types';
import { PropertyParser } from './property-parser';

/**
 * FBX 文本解析器
 * 负责解析 FBX 文件在 ASCII 格式中的数据
 */
export class TextParser extends BaseParser<string, FBXTree> {
  nodeStack: TextNodeWithIndex[];
  currentIndent: number;
  currentProp: TextNodeWithIndex | PropertyArray;
  currentPropName: string;
  allNodes: FBXTree;
  private propertyParser: PropertyParser;

  constructor (context: IParsingContext) {
    super(context);
    this.nodeStack = [];
    this.currentIndent = 0;
    this.currentProp = [];
    this.currentPropName = '';
    this.allNodes = new FBXTree();
    this.propertyParser = new PropertyParser(this);
  }

  getPrevNode (): TextNodeWithIndex {
    return this.nodeStack[this.currentIndent - 2];
  }

  getCurrentNode (): TextNodeWithIndex {
    return this.nodeStack[this.currentIndent - 1];
  }

  getCurrentProp () {
    return this.currentProp;
  }

  pushStack (node: TextNodeWithIndex): void {
    this.nodeStack.push(node);
    this.currentIndent += 1;
  }

  popStack (): void {
    this.nodeStack.pop();
    this.currentIndent -= 1;
  }

  setCurrentProp (val: TextNodeWithIndex, name: string): void {
    this.currentProp = val;
    this.currentPropName = name;
  }

  /**
   * 类型安全地检查节点是否有ID
   */
  hasNodeId (nodeValue: unknown): nodeValue is TextNodeWithIndex {
    return nodeValue instanceof Object && 'id' in nodeValue && typeof (nodeValue as TextNodeWithIndex).id === 'number';
  }

  /**
   * 类型安全地设置带ID的节点
   */
  setNodeWithId (currentNode: TextNodeWithIndex, nodeName: string, id: number, node: TextNodeWithIndex): void {
    if (typeof currentNode[nodeName] === 'object' && currentNode[nodeName] !== null) {
      const nodeContainer = currentNode[nodeName] as Record<string, TextNodeWithIndex>;

      nodeContainer[id] = node;
    }
  }

  /**
   * 类型安全地解析数值
   */
  parseNumericValue (value: string | number[] | number): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && isNumericString(value)) {
      return parseFloat(value);
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
      return value[0];
    }
    throw new Error(`Cannot parse numeric value from: ${String(value)}`);
  }

  /**
   * 主解析方法
   */
  parse (text: string): FBXTree {
    this.currentIndent = 0;

    this.allNodes = new FBXTree();
    this.nodeStack = [];
    this.currentProp = [];
    this.currentPropName = '';

    const split = text.split(/[\r\n]+/);

    split.forEach((line, i) => {
      const matchComment = line.match(/^[\s\t]*;/);
      const matchEmpty = line.match(/^[\s\t]*$/);

      if (matchComment || matchEmpty) {
        return;
      }

      const matchBeginning = line.match('^\\t{' + this.currentIndent + '}(\\w+):(.*){');
      const matchProperty = line.match('^\\t{' + this.currentIndent + '}(\\w+):[\\s\\t\\r\\n](.*)');
      const matchEnd = line.match('^\\t{' + (this.currentIndent - 1) + '}}');

      if (matchBeginning) {
        this.propertyParser.parseNodeBegin(line, matchBeginning);
      } else if (matchProperty) {
        this.propertyParser.parseNodeProperty(line, matchProperty, split[++i]);
      } else if (matchEnd) {
        this.popStack();
      } else if (line.match(/^[^\s\t}]/)) {
        // large arrays are split over multiple lines terminated with a ',' character
        // if this is encountered the line needs to be joined to the previous line
        this.propertyParser.parseNodePropertyContinued(line);
      }
    });

    return this.allNodes;
  }
}