import * as THREE from 'three';
import type { Group, Texture, AnimationClip, AnimationAction } from 'three';
import { AnimationMixer, Clock, AmbientLight, DirectionalLight } from 'three';
import { ACESFilmicToneMapping, EquirectangularReflectionMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

let camera: PerspectiveCamera, scene: Scene, renderer: WebGLRenderer;
let mixer: AnimationMixer;
let clock: Clock;
const animationActions: AnimationAction[] = [];

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

  container!.appendChild(renderer.domElement);
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
      loadFBXModel();
    }, undefined, function (error: any) {
      console.warn('环境贴图加载失败，使用纯色背景:', error);
      // 即使环境贴图加载失败，也继续加载 FBX 模型
      loadFBXModel();
    });
}

function loadFBXModel () {
  try {
    // 检查模型文件路径
    const modelPath = '../assets/models/fbx/frog.fbx';
    console.log('尝试加载模型文件:', modelPath);

    const loader = new FBXLoader().setPath('../assets/models/fbx/');

    console.log('开始加载 FBX 模型...');

    loader.load('frog.fbx', function (fbxScene) {
      console.log('🐸 🎉 FBX模型加载成功!', fbxScene);

      // Three.js FBXLoader 直接返回 Group，animations 在 animations 属性中
      const animations = (fbxScene as any).animations || [];

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
          vertexCount: child.geometry?.attributes?.position?.count
        });

        if (child.isMesh && child.material) {
          console.log('材质详情:', {
            type: child.material.type,
            color: (child.material as any).color?.getHexString?.(),
            metalness: (child.material as any).metalness,
            roughness: (child.material as any).roughness,
            envMapIntensity: (child.material as any).envMapIntensity,
            emissive: (child.material as any).emissive?.getHexString?.(),
            transparent: (child.material as any).transparent,
            opacity: (child.material as any).opacity
          });

          // 确保材质能正确响应环境光
          (child.material as any).envMapIntensity = (child.material as any).envMapIntensity || 1;
          (child.material as any).needsUpdate = true;
        }
      });

      // 将加载的场景添加到主场景
      fbxScene.updateMatrixWorld();
      scene.add(fbxScene);

      // 创建动画混合器
      mixer = new AnimationMixer(fbxScene);

      // 处理动画剪辑
      if (animations && animations.length > 0) {
        console.info(`发现 ${animations.length} 个动画:`);

        animations.forEach((clip: AnimationClip, index: number) => {
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

      render();
    },
    // 加载进度回调
    function (progress: ProgressEvent) {
      if (progress.lengthComputable) {
        console.info('加载进度:', (progress.loaded / progress.total * 100) + '%');
      }
    },
    // 错误回调
    function (error: any) {
      console.error('加载 FBX 模型时出错:', error);
      console.error('错误详情:', error.message || error);
      console.error('错误堆栈:', error.stack);
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
function createDefaultGeometry() {
  console.log('🟢 FBX模型加载失败，创建默认绿色立方体作为占位符...');

  const geometry = new THREE.BoxGeometry(2, 2, 2); // 做大一点，更容易看见
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    metalness: 0.3,
    roughness: 0.7
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
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
  perspectiveCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

export function render () {
  renderer.render(scene, camera);
}