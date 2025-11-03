import { parseNumberArray } from '../../util';
import type { TextNodeWithIndex } from '../../types';
import type { PropertyArray } from '../../types/parsers/text-parser';
import { append } from './text-utils';

/**
 * 属性解析器
 * 负责解析 FBX 文本格式中的节点属性和特殊属性
 */
export class PropertyParser {
  constructor (private textParser: import('./text-parser').TextParser) {}

  /**
   * 解析节点开始
   */
  parseNodeBegin (_line: string, property: string[]): void {
    const nodeName = (property[1]).trim().replace(/^"/, '').replace(/"$/, '');

    const nodeAttrs = (property[2]).split(',').map(function (attr) {
      return attr.trim().replace(/^"/, '').replace(/"$/, '');
    });

    const node: TextNodeWithIndex = {
      name: nodeName,
      properties: [],
      children: [],
    };
    const attrs = this.parseNodeAttr(nodeAttrs);

    const currentNode = this.textParser.getCurrentNode();

    // a top node
    if (this.textParser.currentIndent === 0) {
      this.textParser.allNodes.add(nodeName, node);
    } else {
      // a subnode

      // if the subnode already exists, append it
      if (nodeName in currentNode) {
        // special case Pose needs PoseNodes as an array
        if (nodeName === 'PoseNode') {
          currentNode.PoseNode?.push(node);
        } else if (this.textParser.hasNodeId(currentNode[nodeName])) {
          const existing = currentNode[nodeName] as TextNodeWithIndex;

          currentNode[nodeName] = {};
          if (typeof existing.id === 'number') {
            this.textParser.setNodeWithId(currentNode, nodeName, existing.id, existing);
          }
        }

        if (attrs.id !== '' && typeof attrs.id === 'number') {
          this.textParser.setNodeWithId(currentNode, nodeName, attrs.id, node);
        }
      } else if (typeof attrs.id === 'number') {
        currentNode[nodeName] = {};
        this.textParser.setNodeWithId(currentNode, nodeName, attrs.id, node);
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

    this.textParser.pushStack(node);
  }

  /**
   * 解析节点属性
   */
  parseNodeAttr (attrs: string[]): { id: string | number, name: string, type: string } {
    let id: string | number = attrs[0];

    if (attrs[0] !== '') {
      const parsedId = parseInt(attrs[0]);

      if (!isNaN(parsedId)) {
        id = parsedId;
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

  /**
   * 解析节点属性
   */
  parseNodeProperty (line: string, property: string[], contentLine: string): void {
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

    const currentNode = this.textParser.getCurrentNode();
    const parentName = currentNode.name;

    if (parentName === 'Properties70') {
      this.parseNodeSpecialProperty(line, propName, propValue);

      return;
    }

    // Connections
    if (propName === 'C') {
      const connProps = propValue.split(',').slice(1);

      if (connProps.length < 2) {
        return;
      }
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
      currentNode.id = this.textParser.parseNumericValue(propValue);
    }

    // connections
    if (propName in currentNode && Array.isArray(currentNode[propName])) {
      const propArray = currentNode[propName] as PropertyArray[];

      propArray.push(propValue);
    } else {
      if (propName !== 'a') {
        currentNode[propName] = propValue;
      } else {
        currentNode.a = propValue;
      }
    }

    this.textParser.setCurrentProp(currentNode, propName);

    // convert string to array, unless it ends in ',' in which case more will be added to it
    if (propName === 'a' && typeof propValue === 'string' && propValue.slice(-1) !== ',') {
      currentNode.a = parseNumberArray(propValue);
    }
  }

  /**
   * 解析继续的节点属性
   */
  parseNodePropertyContinued (line: string): void {
    const currentNode = this.textParser.getCurrentNode();

    currentNode.a += line;

    // if the line doesn't end in ',' we have reached the end of the property value
    // so convert the string to an array
    if (line.slice(-1) !== ',' && typeof currentNode.a === 'string') {
      currentNode.a = parseNumberArray(currentNode.a);
    }
  }

  /**
   * 解析特殊属性 (Property70)
   */
  parseNodeSpecialProperty (_line: string, _propName: string, propValue: string): void {
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
    let innerPropValue: number | string | number[] = props[4];

    // cast values where needed, otherwise leave as strings
    switch (innerPropType1) {
      case 'int':
      case 'enum':
      case 'bool':
      case 'ULongLong':
      case 'double':
      case 'Number':
      case 'FieldOfView':
        if (typeof innerPropValue === 'string') {
          innerPropValue = parseFloat(innerPropValue);
        }

        break;
      case 'Color':
      case 'ColorRGB':
      case 'Vector3D':
      case 'Lcl_Translation':
      case 'Lcl_Rotation':
      case 'Lcl_Scaling':
        if (typeof innerPropValue === 'string') {
          innerPropValue = parseNumberArray(innerPropValue);
        }

        break;
    }

    // CAUTION: these props must append to parent's parent
    const prevNode = this.textParser.getPrevNode();

    if (prevNode) {
      prevNode[innerPropName] = {
        flag: innerPropFlag,
        type: innerPropType1,
        type2: innerPropType2,
        value: innerPropValue,
      };

      this.textParser.setCurrentProp(prevNode, innerPropName);
    }
  }
}