import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AnimationMixer } from 'three'

/**
 * Base
 */
// Debug
const gui = new GUI()
gui.hide(); // Скрывает GUI сразу после создания
    //Show GUI
    document.addEventListener('keydown', (event) => {
        if (event.key === 'h') { // Например, клавиша "h"
            gui.domElement.style.display = gui.domElement.style.display === 'none' ? '' : 'none';
        }
    });
    
   

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const particleTexture = textureLoader.load('./textures/particles/3.png')

/**
 * Particles
 */
    //Geometry
    const particlesGeometry = new THREE.BufferGeometry()
    const count = 500

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for(let i=0; i < count * 3; i++)
    {
    positions[i * 3] = (Math.random() - 0.5) * 10 // X (разброс по горизонтали)
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10 // Y (разброс по горизонтали)
    positions[i * 3 + 1] = Math.random() * 10 // Y (высота столбика)
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 // Z (разброс по глубине)
        colors [i] = Math.random()
    }

    particlesGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
    )

    particlesGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
    )


    //Material
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.1,
        sizeAttenuation: true,
        color: ('grey')
})
particlesMaterial.transparent = true,
particlesMaterial.alphaMap = particleTexture
// particlesMaterial.alphaTest = 0.001
// particlesMaterial.depthTest = false
particlesMaterial.depthWrite = false
particlesMaterial.blenfing = THREE.AdditiveBlending
// particlesMaterial.vertexColors = true

    //Points
    const particles = new THREE.Points(particlesGeometry, particlesMaterial)

scene.add(particles)

// Создаём материал
const outerMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0033ff).convertSRGBToLinear(), // Правильно применяем методы
    // color: 0x0033ff,
    roughness: 0.0,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 1.0, // Прозрачность
    ior: 1.3, // Преломление
    thickness: 1,
    opacity: .8,
    transparent: true,
    depthWrite: false
})

const innerMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xff00dd).convertSRGBToLinear(), // Правильно применяем методы
    color: 0xff00dd,
    roughness: 0,
    metalness: 1.0
})



// Загружаем HDRI-карту
const rgbeLoader = new RGBELoader()
rgbeLoader.load('./env.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = texture
    // scene.background = texture 
})

// Загружаем модель
const gltfLoader = new GLTFLoader()
let mixer // Переменная для анимации

gltfLoader.load('./model.glb', (gltf) => {
    const model = gltf.scene
    scene.add(model)

    model.traverse((child) => {
        if (child.isMesh) {
            if (child.name.includes('OuterObject')) {
                child.material = outerMaterial
            } else if (child.name.includes('InnerObject')) {
                child.material = innerMaterial
            }
        }
    })

    // Запускаем анимацию
    if (gltf.animations.length > 0) {
        mixer = new AnimationMixer(model)
        gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip)
            action.setLoop(THREE.LoopRepeat)
            action.play()
        })
    }
})

let isAnimationPlaying = true // Флаг состояния анимации

let lastTapTime = 0;
let tapTimeout;

canvas.addEventListener('touchend', (event) => {
    const currentTime = new Date().getTime();
    const tapInterval = currentTime - lastTapTime;

    if (tapInterval < 300 && tapInterval > 0) { // Если два тапа произошли быстро
        clearTimeout(tapTimeout);
        if (mixer) {
            mixer._actions.forEach(action => {
                action.paused = isAnimationPlaying;
            });
            isAnimationPlaying = !isAnimationPlaying;
        }
    } else {
        tapTimeout = setTimeout(() => {
            clearTimeout(tapTimeout);
        }, 300);
    }

    lastTapTime = currentTime;
});

//Double ckick pause/play
canvas.addEventListener('dblclick', () => {
    
    
    if (mixer) {
        mixer._actions.forEach(action => {
            action.paused = isAnimationPlaying
        })
        isAnimationPlaying = !isAnimationPlaying
    }
})


// === lil-gui кнопка для управления анимацией ===
const animationFolder = gui.addFolder('Animation Controls')
animationFolder.add({ toggleAnimation: () => {
    if (mixer) {
        mixer._actions.forEach(action => {
            if (isAnimationPlaying) {
                action.paused = true // Ставим на паузу
            } else {
                action.paused = false // Возобновляем анимацию
            }
        })
        isAnimationPlaying = !isAnimationPlaying
    }
} }, 'toggleAnimation').name('Play/Pause Animation')



// === lil-gui настройки материалов ===
const outerFolder = gui.addFolder('Outer Material')
outerFolder.addColor(outerMaterial, 'color').onChange(() => outerMaterial.needsUpdate = true)
outerFolder.add(outerMaterial, 'metalness', 0, 1, 0.01)
outerFolder.add(outerMaterial, 'roughness', 0, 1, 0.01)
outerFolder.add(outerMaterial, 'transmission', 0, 1, 0.01)
outerFolder.add(outerMaterial, 'ior', 1, 2.5, 0.01)
outerFolder.add(outerMaterial, 'thickness', 0, 2, 0.01)
outerFolder.add(outerMaterial, 'clearcoat', 0, 1, 0.01)
outerFolder.add(outerMaterial, 'clearcoatRoughness', 0, 1, 0.01)
outerFolder.add(outerMaterial, 'opacity', 0, 1, 0.01)
outerFolder.add(outerMaterial, 'transparent').onChange(() => outerMaterial.needsUpdate = true)

const innerFolder = gui.addFolder('Inner Material')
innerFolder.addColor(innerMaterial, 'color').onChange(() => innerMaterial.needsUpdate = true)
innerFolder.add(innerMaterial, 'metalness', 0, 1, 0.01)
innerFolder.add(innerMaterial, 'roughness', 0, 1, 0.01)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 2, 5)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas: canvas })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const timer = new Timer()
const clock = new THREE.Clock()


const tick = () => {
    timer.update()
    const elapsedTime = clock.getElapsedTime()

   

    if (mixer) {
        mixer.update(timer.getDelta())
    }

    controls.update()
    renderer.render(scene, camera)

    //Update particles
    particles.position.y = - elapsedTime * 0.05
       
        particlesGeometry.attributes.position.needsUpdate = true
        
    window.requestAnimationFrame(tick)
}

tick()
