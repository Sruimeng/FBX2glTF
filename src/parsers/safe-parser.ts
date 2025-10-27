import * as THREE from 'three';
import { FBXValidator } from '../utils/validation';
import { FBXTreeSchema, FBXModelNodeSchema } from '../schemas/fbx-schemas';

/**
 * 安全的FBX解析器基类，使用Zod进行运行时验证
 */
export abstract class SafeBaseParser<TInput, TOutput> {
  protected abstract inputSchema: any;
  protected abstract parseInput (input: TInput): TOutput;

  /**
   * 安全解析方法，带有输入验证
   */
  safeParse (input: unknown): TOutput {
    try {
      // 验证输入数据
      const validatedInput = this.inputSchema.parse(input);

      // 执行解析逻辑
      return this.parseInput(validatedInput);
    } catch (error) {
      console.error('Safe parsing failed:', error);
      throw error;
    }
  }

  /**
   * 带错误恢复的安全解析
   */
  safeParseWithFallback (input: unknown, fallback: TOutput): TOutput {
    try {
      return this.safeParse(input);
    } catch (error) {
      console.warn('Parsing failed, using fallback:', error);

      return fallback;
    }
  }
}

/**
 * 安全的FBX树解析器
 */
export class SafeFBXTreeParser extends SafeBaseParser<any, any> {
  protected inputSchema = FBXTreeSchema;

  protected parseInput (fbxTree: any): any {
    // 安全访问connections
    const connections = FBXValidator.safeProperty(fbxTree, 'connections');

    if (!connections) {
      console.warn('No connections found in FBX tree');

      return { scene: new THREE.Group(), animations: [] };
    }

    // 安全访问模型节点
    const models = FBXValidator.safeProperty(fbxTree, 'Objects.Model');

    if (!models) {
      console.warn('No models found in FBX tree');

      return { scene: new THREE.Group(), animations: [] };
    }

    // 验证模型节点数组
    const validModels = FBXValidator.validateArray(
      Object.values(models),
      FBXModelNodeSchema
    );

    console.log(`Successfully validated ${validModels.length} model nodes`);

    // 这里可以继续原有的解析逻辑，但现在所有数据都已经过验证
    return {
      scene: this.createScene(validModels),
      animations: this.parseAnimations(fbxTree),
    };
  }

  private createScene (models: any[]): THREE.Group {
    const scene = new THREE.Group();

    // 安全创建3D对象
    models.forEach(model => {
      try {
        const obj3d = this.createObject3D(model);

        if (obj3d) {
          scene.add(obj3d);
        }
      } catch (error) {
        console.warn(`Failed to create object for model ${model.id}:`, error);
      }
    });

    return scene;
  }

  private createObject3D (model: any): THREE.Object3D | null {
    // 根据模型类型创建不同的3D对象
    switch (model.attrType) {
      case 'Mesh':
        return this.createMesh(model);
      case 'Camera':
        return this.createCamera(model);
      case 'Light':
        return this.createLight(model);
      default:
        return new THREE.Group();
    }
  }

  private createMesh (model: any): THREE.Mesh | null {
    // 安全访问几何数据
    const geometryId = this.findGeometryId(model);

    if (!geometryId) {
      console.warn(`No geometry found for model ${model.id}`);

      return null;
    }

    // 创建几何体（这里简化了实际实现）
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial();

    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = model.attrName || `Mesh_${model.id}`;

    // 应用变换
    this.applyTransform(mesh, model);

    return mesh;
  }

  private createCamera (model: any): THREE.PerspectiveCamera | null {
    // 实现相机创建逻辑
    return null;
  }

  private createLight (model: any): THREE.Light | null {
    // 实现灯光创建逻辑
    return null;
  }

  private applyTransform (object: THREE.Object3D, model: any): void {
    // 安全访问变换属性
    const translation = FBXValidator.safeProperty(model, 'Lcl_Translation.value');
    const rotation = FBXValidator.safeProperty(model, 'Lcl_Rotation.value');
    const scaling = FBXValidator.safeProperty(model, 'Lcl_Scaling.value');

    if (translation && Array.isArray(translation)) {
      object.position.fromArray(translation);
    }

    if (rotation && Array.isArray(rotation)) {
      // 将欧拉角转换为弧度并应用
      const euler = new THREE.Euler();

      // 确保有3个元素用于Euler.fromArray
      const eulerArray = rotation.slice(0, 3).map((v: number) => v * Math.PI / 180);
      euler.fromArray(eulerArray as [number, number, number]);
      object.rotation.copy(euler);
    }

    if (scaling && Array.isArray(scaling)) {
      object.scale.fromArray(scaling);
    }
  }

  private findGeometryId (model: any): number | null {
    // 查找模型关联的几何体ID
    // 这里简化了实际的连接查找逻辑
    return null;
  }

  private parseAnimations (fbxTree: any): THREE.AnimationClip[] {
    // 安全解析动画数据
    const animationStacks = FBXValidator.safeProperty(fbxTree, 'Objects.AnimationStack');

    if (!animationStacks) {
      return [];
    }

    // 实现动画解析逻辑
    return [];
  }
}

/**
 * 使用示例
 */
export function createSafeFBXParser () {
  return new SafeFBXTreeParser();
}

/**
 * 安全的FBX加载器工厂函数
 */
export function createSafeFBXLoader (manager: THREE.LoadingManager) {
  const parser = createSafeFBXParser();

  return {
    parse: (data: ArrayBuffer | string, path: string) => {
      try {
        // 这里应该先解析原始FBX数据为树结构
        const fbxTree = parseRawFBXData(data); // 假设这个函数存在

        // 使用安全解析器
        return parser.safeParse(fbxTree);
      } catch (error) {
        console.error('Safe FBX loading failed:', error);

        // 返回安全的fallback结果
        return {
          scene: new THREE.Group(),
          animations: [],
        };
      }
    },
  };
}

/**
 * 模拟原始FBX数据解析函数
 */
function parseRawFBXData (data: ArrayBuffer | string): any {
  // 这里应该调用实际的二进制/文本解析器
  // 为了示例，我们返回一个简单的结构
  return {
    objects: {},
    connections: {},
    Objects: {
      Model: {},
      Geometry: {},
    },
  };
}