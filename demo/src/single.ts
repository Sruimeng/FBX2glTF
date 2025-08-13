import type { Camera, Group, Texture, AnimationClip, AnimationAction } from 'three';
import { AnimationMixer, Clock } from 'three';
import { ACESFilmicToneMapping, EquirectangularReflectionMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { ModularFBXLoader } from '@sruim/fbx2gltf';

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

  // 初始化渲染器
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
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
  const loader = new ModularFBXLoader().setPath('../assets/models/fbx/');

  loader.load('mixamo.fbx', function (fbx: Group) {
    // 缩放模型
    fbx.scale.setScalar(0.01);
    scene.add(fbx);

    // 创建动画混合器
    mixer = new AnimationMixer(fbx);

    // 处理动画剪辑
    if (fbx.animations && fbx.animations.length > 0) {
      console.info(`发现 ${fbx.animations.length} 个动画:`);

      fbx.animations.forEach((clip: AnimationClip, index: number) => {
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