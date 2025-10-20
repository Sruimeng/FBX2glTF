import * as THREE from 'three';
import type { Group, Texture, AnimationAction } from 'three';
import { AnimationMixer, Clock, AmbientLight, DirectionalLight } from 'three';
import { ACESFilmicToneMapping, EquirectangularReflectionMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { FBXLoaderRefactored } from '../../src/FBXLoaderRefactored';

let camera: PerspectiveCamera, scene: Scene, renderer: WebGLRenderer;
let mixer: AnimationMixer;
let clock: Clock;
const animationActions: AnimationAction[] = [];
let currentFBXModel: Group | null = null;

// 模型配置
const MODEL_CONFIG = {
  'frog.fbx': {
    name: '青蛙',
    description: 'FBX 青蛙模型，带材质贴图',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
  },
  'Samba Dancing.fbx': {
    name: '森巴舞',
    description: 'Mixamo 动画 - 森巴舞蹈',
    scale: 0.01,
    position: { x: 0, y: 0, z: 0 },
  },
  'mixamo.fbx': {
    name: 'Mixamo 角色',
    description: 'Mixamo 动画角色',
    scale: 0.01,
    position: { x: 0, y: 0, z: 0 },
  },
  'monkey.fbx': {
    name: '猴子头',
    description: '经典的猴子头模型',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
  },
  'monkey_embedded_texture.fbx': {
    name: '猴子头 (带贴图)',
    description: '带内置贴图的猴子头模型',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
  },
  'stanford-bunny.fbx': {
    name: '斯坦福兔子',
    description: '经典的斯坦福兔子模型',
    scale: 0.01,
    position: { x: 0, y: 0, z: 0 },
  },
  'morph_test.fbx': {
    name: '变形测试',
    description: '变形目标测试模型',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
  },
  'vCube.fbx': {
    name: '立方体',
    description: '简单的立方体模型',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
  },
  'nurbs.fbx': {
    name: 'NURBS 曲面',
    description: 'NURBS 曲面模型',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
  },
  'frogtexutre.fbx': {
    name: '青蛙 (纹理)',
    description: '带纹理贴图的青蛙模型',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
  },
};

// 当前选中的模型
let currentModelName = 'frog.fbx';

init();
animate(); // 使用 animate 替代 render

export function init () {
  console.log('开始初始化 Three.js 场景...');
  const container = document.getElementById('J-container');

  if (!container) {
    console.error('找不到容器元素 #J-container');

    return;
  }

  console.log('容器元素找到:', container);

  camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
  camera.position.set(0, 2, 5);
  console.log('摄像机创建完成:', camera.position);

  scene = new Scene();
  console.log('场景创建完成');

  // 初始化时钟，用于动画计时
  clock = new Clock();

  // 添加基础光照以调试模型显示问题
  const ambientLight = new AmbientLight(0xffffff, 1.5);

  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 2);

  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  console.log('已添加基础光照到场景');

  // 初始化渲染器
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2; // 增加曝光以避免模型过暗
  console.log('渲染器创建完成');

  container.appendChild(renderer.domElement);
  console.log('渲染器 DOM 元素已添加到容器');

  // 设置控制器
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.addEventListener('change', render);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.update();

  window.addEventListener('resize', onWindowResize);

  console.log('Three.js 场景初始化完成，开始加载资源...');

  // 添加一个测试立方体来确认渲染循环正常工作
  const testGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const testCube = new THREE.Mesh(testGeometry, testMaterial);

  testCube.position.set(-2, 0, 0);
  testCube.name = 'TestCube';
  scene.add(testCube);
  console.log('✅ 添加红色测试立方体，位置:', testCube.position);

  // 进行一次初始渲染以确认场景正常
  render();

  // 创建 UI 控制面板
  createModelSelector();

  // 加载环境贴图
  new RGBELoader()
    .setPath('../assets/textures/equirectangular/')
    .load('royal_esplanade_1k.hdr', function (texture: Texture) {
      console.log('环境贴图加载成功');
      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;

      render();

      // 加载 FBX 模型
      loadFBXModel(currentModelName);
    }, undefined, function (error: any) {
      console.warn('环境贴图加载失败，使用纯色背景:', error);
      // 即使环境贴图加载失败，也继续加载 FBX 模型
      loadFBXModel(currentModelName);
    });
}

// 创建模型选择器 UI
function createModelSelector () {
  // 创建控制面板容器
  const panel = document.createElement('div');

  panel.id = 'model-selector-panel';
  panel.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    z-index: 1000;
    min-width: 250px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  `;

  // 标题
  const title = document.createElement('h3');

  title.textContent = '模型选择器';
  title.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
  `;
  panel.appendChild(title);

  // 模型选择下拉框
  const selectContainer = document.createElement('div');

  selectContainer.style.marginBottom = '15px';

  const label = document.createElement('label');

  label.textContent = '选择模型:';
  label.style.display = 'block';
  label.style.marginBottom = '5px';
  label.style.fontSize = '14px';
  selectContainer.appendChild(label);

  const select = document.createElement('select');

  select.id = 'model-select';
  select.style.cssText = `
    width: 100%;
    padding: 8px;
    border: none;
    border-radius: 4px;
    background: #333;
    color: white;
    font-size: 14px;
    cursor: pointer;
  `;

  // 添加模型选项
  Object.entries(MODEL_CONFIG).forEach(([filename, config]) => {
    const option = document.createElement('option');

    option.value = filename;
    option.textContent = config.name;
    option.selected = filename === currentModelName;
    select.appendChild(option);
  });

  select.addEventListener('change', event => {
    const selectedModel = (event.target as HTMLSelectElement).value;

    if (selectedModel !== currentModelName) {
      currentModelName = selectedModel;
      loadFBXModel(currentModelName);
    }
  });

  selectContainer.appendChild(select);
  panel.appendChild(selectContainer);

  // 模型信息显示
  const infoContainer = document.createElement('div');

  infoContainer.id = 'model-info';
  infoContainer.style.cssText = `
    font-size: 12px;
    color: #ccc;
    margin-bottom: 15px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    min-height: 40px;
  `;

  const currentConfig = MODEL_CONFIG[currentModelName as keyof typeof MODEL_CONFIG];

  infoContainer.innerHTML = `
    <strong>${currentConfig.name}</strong><br>
    ${currentConfig.description}
  `;

  panel.appendChild(infoContainer);

  // 加载状态
  const statusContainer = document.createElement('div');

  statusContainer.id = 'loading-status';
  statusContainer.style.cssText = `
    font-size: 12px;
    color: #4CAF50;
    margin-bottom: 10px;
  `;
  statusContainer.textContent = '就绪';
  panel.appendChild(statusContainer);

  // 操作按钮
  const buttonContainer = document.createElement('div');

  buttonContainer.style.cssText = `
    display: flex;
    gap: 10px;
    margin-top: 15px;
  `;

  const reloadButton = document.createElement('button');

  reloadButton.textContent = '重新加载';
  reloadButton.style.cssText = `
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    background: #2196F3;
    color: white;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
  `;
  reloadButton.addEventListener('click', () => loadFBXModel(currentModelName));
  reloadButton.addEventListener('mouseenter', () => reloadButton.style.background = '#1976D2');
  reloadButton.addEventListener('mouseleave', () => reloadButton.style.background = '#2196F3');
  buttonContainer.appendChild(reloadButton);

  panel.appendChild(buttonContainer);

  // 添加到页面
  document.body.appendChild(panel);

  // 更新模型信息函数
  (window as any).updateModelInfo = (modelName: string) => {
    const config = MODEL_CONFIG[modelName as keyof typeof MODEL_CONFIG];
    const infoElement = document.getElementById('model-info');

    if (infoElement && config) {
      infoElement.innerHTML = `<strong>${config.name}</strong><br>${config.description}`;
    }
  };

  // 更新加载状态函数
  (window as any).updateLoadingStatus = (status: string, isError: boolean = false) => {
    const statusElement = document.getElementById('loading-status');

    if (statusElement) {
      statusElement.textContent = status;
      statusElement.style.color = isError ? '#f44336' : '#4CAF50';
    }
  };
}

function loadFBXModel (modelName: string = currentModelName) {
  try {
    // 清理当前模型
    if (currentFBXModel) {
      scene.remove(currentFBXModel);

      // 清理动画混合器
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(currentFBXModel);
      }

      // 清理动画动作数组
      animationActions.length = 0;

      currentFBXModel = null;
      console.log('已清理当前模型');
    }

    // 更新 UI 状态
    if ((window as any).updateLoadingStatus) {
      (window as any).updateLoadingStatus('正在加载模型...');
    }

    // 检查模型配置
    const modelConfig = MODEL_CONFIG[modelName as keyof typeof MODEL_CONFIG];

    if (!modelConfig) {
      throw new Error(`未找到模型配置: ${modelName}`);
    }

    const modelPath = `../assets/models/fbx/${modelName}`;

    console.log(`🔄 开始加载模型: ${modelConfig.name} (${modelPath})`);

    const loader = new FBXLoaderRefactored();

    loader.load(modelPath, function (fbxResult) {
      console.log(`🎉 模型加载成功: ${modelConfig.name}!`, fbxResult);

      // 从 ModelLoaderResult 中获取 scene 和 animations
      const fbxScene = fbxResult.scene;
      const animations = fbxResult.animations || [];

      // 详细调试FBX场景内容
      console.log('FBX场景子节点数量:', fbxScene.children.length);
      fbxScene.traverse((child: any) => {
        console.log('子节点:', {
          name: child.name,
          type: child.type,
          isMesh: child.isMesh,
          isGroup: child.isGroup,
          hasMaterial: !!child.material,
          materialType: child.material?.type,
          hasGeometry: !!child.geometry,
          geometryType: child.geometry?.type,
          vertexCount: child.geometry?.attributes?.position?.count,
        });

        if (child.isMesh && child.material) {
          console.log('原始材质详情:', {
            type: child.material.type,
            color: (child.material).color?.getHexString?.(),
            metalness: (child.material).metalness,
            roughness: (child.material).roughness,
            envMapIntensity: (child.material).envMapIntensity,
            emissive: (child.material).emissive?.getHexString?.(),
            transparent: (child.material).transparent,
            opacity: (child.material).opacity,
          });

          // 如果是旧的 Phong 材质，转换为现代的 Standard 材质
          if (child.material.type === 'MeshPhongMaterial') {
            const oldMaterial = child.material;
            const newMaterial = new THREE.MeshStandardMaterial({
              color: oldMaterial.color,
              emissive: oldMaterial.emissive,
              roughness: 0.7, // 默认粗糙度
              metalness: 0.3, // 默认金属度
              transparent: oldMaterial.transparent,
              opacity: oldMaterial.opacity,
              envMapIntensity: 1.0,
            });

            child.material = newMaterial;
            console.log('🔄 转换材质为 MeshStandardMaterial');
          } else {
            // 确保材质能正确响应环境光
            (child.material).envMapIntensity = (child.material).envMapIntensity || 1;
            (child.material).needsUpdate = true;
          }
        }
      });

      // 应用模型配置（缩放和位置）
      fbxScene.scale.setScalar(modelConfig.scale);
      fbxScene.position.set(modelConfig.position.x, modelConfig.position.y, modelConfig.position.z);
      fbxScene.updateMatrixWorld();

      // 将加载的场景添加到主场景
      scene.add(fbxScene);
      currentFBXModel = fbxScene;

      // 创建动画混合器
      mixer = new AnimationMixer(fbxScene);

      // 处理动画剪辑
      if (animations && animations.length > 0) {
        console.info(`发现 ${animations.length} 个动画:`);

        animations.forEach((clip: any, index: number) => {
          console.info(`动画 ${index}: ${clip.name}, 持续时间: ${clip.duration}s`);

          // 创建动画动作
          const action = mixer.clipAction(clip);

          animationActions.push(action);
        });

        // 播放第一个动画（如果存在）
        if (animationActions.length > 0) {
          playAnimation(0);
        }
      } else {
        console.info('该模型没有动画数据');
      }

      // 更新 UI 状态
      if ((window as any).updateLoadingStatus) {
        (window as any).updateLoadingStatus(`模型加载完成: ${modelConfig.name}`);
      }

      render();
    },
    // 加载进度回调
    function (progress: ProgressEvent) {
      if (progress.lengthComputable) {
        const percent = Math.round(progress.loaded / progress.total * 100);

        console.info('加载进度:', percent + '%');

        if ((window as any).updateLoadingStatus) {
          (window as any).updateLoadingStatus(`加载中: ${percent}%`);
        }
      }
    },
    // 错误回调
    function (error: any) {
      console.error('加载 FBX 模型时出错:', error);
      console.error('错误详情:', error.message || error);
      console.error('错误堆栈:', error.stack);

      // 更新 UI 状态
      if ((window as any).updateLoadingStatus) {
        (window as any).updateLoadingStatus(`加载失败: ${error.message || error}`, true);
      }

      // 尝试创建一个默认的几何体作为占位符
      createDefaultGeometry();
    });
  } catch (error) {
    console.error('FBX 初始化失败:', error);
    // 创建默认几何体作为占位符
    createDefaultGeometry();
  }
}

// 创建默认几何体作为占位符
function createDefaultGeometry () {
  console.log('🟢 FBX模型加载失败，创建默认绿色立方体作为占位符...');

  const geometry = new THREE.BoxGeometry(2, 2, 2); // 做大一点，更容易看见
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    metalness: 0.3,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = 'DefaultCube_FBX_Load_Failed';

  // 放在摄像机前方，更容易看见
  mesh.position.set(0, 0, 0);

  scene.add(mesh);
  console.log('✅ 默认立方体已添加到场景，位置:', mesh.position);
  render();
}

// 播放指定索引的动画
export function playAnimation (index: number) {
  if (animationActions[index]) {
    // 停止所有其他动画
    animationActions.forEach(action => action.stop());

    // 播放指定动画
    const action = animationActions[index];

    action.reset();
    action.play();

    console.info(`播放动画: ${action.getClip().name}`);
  }
}

// 停止所有动画
export function stopAllAnimations () {
  animationActions.forEach(action => action.stop());
}

// 暂停所有动画
export function pauseAllAnimations () {
  animationActions.forEach(action => action.paused = true);
}

// 恢复所有动画
export function resumeAllAnimations () {
  animationActions.forEach(action => action.paused = false);
}

// 设置动画播放速度
export function setAnimationSpeed (speed: number) {
  animationActions.forEach(action => action.setEffectiveTimeScale(speed));
}

// 动画循环函数
function animate () {
  requestAnimationFrame(animate);

  // 更新动画混合器
  if (mixer) {
    const delta = clock.getDelta();

    mixer.update(delta);
  }

  render();
}

function onWindowResize () {
  const perspectiveCamera = camera;

  perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
  perspectiveCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

export function render () {
  renderer.render(scene, camera);
}
