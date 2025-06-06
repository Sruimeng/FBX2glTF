import * as THREE from 'three';
//@ts-expect-error
import { OrbitControls } from '../assets/jsm/controls/OrbitControls.js';
//@ts-expect-error  
import { GLTFLoader } from '../assets/jsm/loaders/GLTFLoader.js';
//@ts-expect-error
import { RGBELoader } from '../assets/jsm/loaders/RGBELoader.js';

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;

init();
render();

export function init() {

    const container = document.getElementById('J-container');

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
    camera.position.set(- 1.8, 0.6, 2.7);

    scene = new THREE.Scene();

    new RGBELoader()
        .setPath('../assets/textures/equirectangular/')
        .load('royal_esplanade_1k.hdr', function (texture: THREE.Texture) {

            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.background = texture;
            scene.environment = texture;

            render();

            // model

            const loader = new GLTFLoader().setPath('../assets/models/gltf/');
            loader.load('BoomBox.glb', function (gltf: any) {

                scene.add(gltf.scene);

                render();

            });

        });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container!.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render); // use if there is no animation loop
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set(0, 0, - 0.2);
    controls.update();

    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {
    //@ts-expect-error
    camera.aspect = window.innerWidth / window.innerHeight;
    //@ts-expect-error
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();

}

//

export function render() {

    renderer.render(scene, camera);

}