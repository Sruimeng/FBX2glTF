import { parseNumberArray } from '../util';
import { FBXTree } from '../constants';
import { BaseParser } from '../types/core/base-parser';
import type { IParsingContext } from '../types/core/parser';

type TextNode = {
  [key: string]: unknown, // 添加索引签名以支持动态属性
  attrName?: string,
  attrType?: string,
  id?: number,
  name: string,
  PoseNode?: TextNode[],
};

// parse an FBX file in ASCII format
export class TextParser extends BaseParser<string, FBXTree> {
  nodeStack: TextNode[];
  currentIndent: number;
  currentProp: { [key: string]: unknown } | unknown[];
  currentPropName: string;
  allNodes: FBXTree;

  constructor (context: IParsingContext) {
    super(context);
    this.nodeStack = [];
    this.currentIndent = 0;
    this.currentProp = [];
    this.currentPropName = '';
    this.allNodes = new FBXTree();
  }

  getPrevNode () {
    return this.nodeStack[this.currentIndent - 2];
  }

  getCurrentNode () {
    return this.nodeStack[this.currentIndent - 1];
  }

  getCurrentProp () {
    return this.currentProp;
  }

  pushStack (node: TextNode) {
    this.nodeStack.push(node);
    this.currentIndent += 1;
  }

  popStack () {
    this.nodeStack.pop();
    this.currentIndent -= 1;
  }

  setCurrentProp (val: TextNode, name: string) {
    this.currentProp = val;
    this.currentPropName = name;
  }

  parse (text: string, context: IParsingContext) {
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
        this.parseNodeBegin(line, matchBeginning);
      } else if (matchProperty) {
        this.parseNodeProperty(line, matchProperty, split[++i]);
      } else if (matchEnd) {
        this.popStack();
      } else if (line.match(/^[^\s\t}]/)) {
        // large arrays are split over multiple lines terminated with a ',' character
        // if this is encountered the line needs to be joined to the previous line
        this.parseNodePropertyContinued(line);
      }
    });

    return this.allNodes;
  }

  parseNodeBegin (_line: string, property: string[]) {
    const nodeName = (property[1]).trim().replace(/^"/, '').replace(/"$/, '');

    const nodeAttrs = (property[2]).split(',').map(function (attr) {
      return attr.trim().replace(/^"/, '').replace(/"$/, '');
    });

    const node: TextNode = {
      name: nodeName,
    };
    const attrs = this.parseNodeAttr(nodeAttrs);

    const currentNode = this.getCurrentNode();

    // a top node
    if (this.currentIndent === 0) {
      this.allNodes.add(nodeName, node);
    } else {
      // a subnode

      // if the subnode already exists, append it
      if (nodeName in currentNode) {
        // special case Pose needs PoseNodes as an array
        if (nodeName === 'PoseNode') {
          currentNode.PoseNode?.push(node);
        } else if ((currentNode[nodeName] as { id?: number }).id !== undefined) {
          const existing = currentNode[nodeName] as { id: number };

          currentNode[nodeName] = {};
          (currentNode[nodeName] as Record<string, { id: number }>)[existing.id] = existing;
        }

        if (attrs.id !== '') {
          (currentNode[nodeName] as Record<string, unknown>)[attrs.id] = node;
        }
      } else if (typeof attrs.id === 'number') {
        currentNode[nodeName] = {};
        (currentNode[nodeName] as Record<string, unknown>)[attrs.id] = node;
      } else if (nodeName !== 'Properties70') {
        if (nodeName === 'PoseNode') {
          currentNode[nodeName] = [node];
        } else {
          currentNode[nodeName] = node;
        }
      }
    }

    if (typeof attrs.id === 'number') {
      node.id = attrs.id;
    }
    if (attrs.name !== '') {
      node.attrName = attrs.name;
    }
    if (attrs.type !== '') {
      node.attrType = attrs.type;
    }

    this.pushStack(node);
  }

  parseNodeAttr (attrs: string[]) {
    let id: string | number = attrs[0] as string | number;

    if (attrs[0] !== '') {
      id = parseInt(attrs[0]);

      if (isNaN(id)) {
        id = attrs[0];
      }
    }

    let name = '',
      type = '';

    if (attrs.length > 1) {
      name = (attrs[1]).replace(/^(\w+)::/, '');
      type = attrs[2];
    }

    return { id: id, name: name, type: type };
  }

  parseNodeProperty (line: string, property: string[], contentLine: string) {
    const property1 = property[1];
    const property2 = property[2];
    let propName = property1.replace(/^"/, '').replace(/"$/, '').trim();
    let propValue: string | number[] | number = property2.replace(/^"/, '').replace(/"$/, '').trim();

    // for special case: base64 image data follows "Content: ," line
    // Content: ,
    // "/9j/4RDaRXhpZgAATU0A..."
    if (propName === 'Content' && propValue === ',') {
      propValue = contentLine.replace(/"/g, '').replace(/,$/, '').trim();
    }

    const currentNode = this.getCurrentNode();
    const parentName = currentNode.name;

    if (parentName === 'Properties70') {
      this.parseNodeSpecialProperty(line, propName, propValue);

      return;
    }

    // Connections
    if (propName === 'C') {
      const connProps = propValue.split(',').slice(1) as [string, string];
      const from = parseInt(connProps[0]);
      const to = parseInt(connProps[1]);

      let rest = propValue.split(',').slice(3);

      rest = rest.map(function (elem) {
        return elem.trim().replace(/^"/, '');
      });

      propName = 'connections';
      propValue = [from, to];
      append(propValue, rest);

      if (currentNode[propName] === undefined) {
        currentNode[propName] = [];
      }
    }

    // Node
    if (propName === 'Node') {
      currentNode.id = propValue as unknown as number;
    }

    // connections
    if (propName in currentNode && Array.isArray(currentNode[propName])) {
      (currentNode[propName] as unknown[]).push(propValue);
    } else {
      if (propName !== 'a') {
        currentNode[propName] = propValue;
      } else {
        currentNode.a = propValue;
      }
    }

    this.setCurrentProp(currentNode, propName);

    // convert string to array, unless it ends in ',' in which case more will be added to it
    if (propName === 'a' && propValue.slice(-1) !== ',') {
      currentNode.a = parseNumberArray(propValue as string);
    }
  }

  parseNodePropertyContinued (line: string) {
    const currentNode = this.getCurrentNode();

    currentNode.a += line;

    // if the line doesn't end in ',' we have reached the end of the property value
    // so convert the string to an array
    if (line.slice(-1) !== ',') {
      currentNode.a = parseNumberArray(currentNode.a as string);
    }
  }

  // parse "Property70"
  parseNodeSpecialProperty (_line: string, _propName: string, propValue: string) {
    // split this
    // P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
    // into array like below
    // ["Lcl Scaling", "Lcl Scaling", "", "A", "1,1,1" ]
    const props = propValue.split('",').map(function (prop) {
      return prop.trim().replace(/^"/, '').replace(/\s/, '_');
    });

    const innerPropName = props[0];
    const innerPropType1 = props[1];
    const innerPropType2 = props[2];
    const innerPropFlag = props[3];
    let innerPropValue = props[4] as number | string | number[];

    // cast values where needed, otherwise leave as strings
    switch (innerPropType1) {
      case 'int':
      case 'enum':
      case 'bool':
      case 'ULongLong':
      case 'double':
      case 'Number':
      case 'FieldOfView':
        innerPropValue = parseFloat(innerPropValue as string);

        break;
      case 'Color':
      case 'ColorRGB':
      case 'Vector3D':
      case 'Lcl_Translation':
      case 'Lcl_Rotation':
      case 'Lcl_Scaling':
        innerPropValue = parseNumberArray(innerPropValue as string);

        break;
    }

    // CAUTION: these props must append to parent's parent
    const prevNode = this.getPrevNode();

    if (prevNode) {
      prevNode[innerPropName] = {
        flag: innerPropFlag,
        type: innerPropType1,
        type2: innerPropType2,
        value: innerPropValue,
      };

      this.setCurrentProp(prevNode, innerPropName);
    }
  }
}

function append (a: unknown[], b: unknown[]): void {
  for (let i = 0, j = a.length, l = b.length; i < l; i++, j++) {
    a[j] = b[i];
  }
}
