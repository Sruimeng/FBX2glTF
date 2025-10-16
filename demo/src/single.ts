import type { Camera, Group, Texture, AnimationClip, AnimationAction } from 'three';
import { AnimationMixer, Clock, AmbientLight, DirectionalLight } from 'three';
import { ACESFilmicToneMapping, EquirectangularReflectionMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { FBXLoader } from '@sruim/fbx2gltf';

let camera: Camera, scene: Scene, renderer: WebGLRenderer;
let mixer: AnimationMixer;
let clock: Clock;
const animationActions: AnimationAction[] = [];

init();
animate(); // 使用 animate 替代 render

export function init () {
  const container = document.getElementById('J-container');

  camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
  camera.position.set(0, 2, 5);

  scene = new Scene();

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
  container!.appendChild(renderer.domElement);

  // 设置控制器
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.addEventListener('change', render);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.update();

  window.addEventListener('resize', onWindowResize);

  // 加载环境贴图
  new RGBELoader()
    .setPath('../assets/textures/equirectangular/')
    .load('royal_esplanade_1k.hdr', function (texture: Texture) {
      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;

      render();

      // 加载 FBX 模型
      loadFBXModel();
    });
}

function loadFBXModel () {
  const loader = new FBXLoader().setPath('../assets/models/fbx/');

  loader.load('frog.fbx', function (result) {
    console.log('FBX加载结果:', result);

    const { scene: fbxScene, animations } = result;

    // 详细调试FBX场景内容
    console.log('FBX场景子节点数量:', fbxScene.children.length);
    fbxScene.traverse((child) => {
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
          color: child.material.color?.getHexString?.(),
          metalness: child.material.metalness,
          roughness: child.material.roughness,
          envMapIntensity: child.material.envMapIntensity,
          emissive: child.material.emissive?.getHexString?.(),
          transparent: child.material.transparent,
          opacity: child.material.opacity
        });

        // 确保材质能正确响应环境光
        child.material.envMapIntensity = child.material.envMapIntensity || 1;
        child.material.needsUpdate = true;
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
  function (progress) {
    console.info('加载进度:', (progress.loaded / progress.total * 100) + '%');
  },
  // 错误回调
  function (error) {
    console.error('加载 FBX 模型时出错:', error);
  });
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
  //@ts-expect-error
  camera.aspect = window.innerWidth / window.innerHeight;
  //@ts-expect-error
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

export function render () {
  renderer.render(scene, camera);
}
