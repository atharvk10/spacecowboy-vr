import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

import { createGun, onGunFire } from './gun.js';
import { createLasso, onLassoCharge, onLassoThrow, updateLasso } from './lasso.js';
import { spawnAsteroid, updateAsteroids, resetAsteroids } from './asteroids.js';


// ═══════════════════════════════════════════════════════════
// 1. RENDERER
// ═══════════════════════════════════════════════════════════

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;                  
renderer.shadowMap.enabled = true;       
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ═══════════════════════════════════════════════════════════
// 2. SCENE + CAMERA
// ═══════════════════════════════════════════════════════════

const scene = new THREE.Scene();

// Camera — in WebXR the headset overrides this automatically,
// but it's still needed for desktop/emulator preview
const camera = new THREE.PerspectiveCamera(75,  window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0); 


// ═══════════════════════════════════════════════════════════
// 3. BACKGROUND (360° skybox)
// ═══════════════════════════════════════════════════════════

const textureLoader = new THREE.TextureLoader();
textureLoader.load(
  'background.jpg',
  (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = tex;
  },
  undefined,
  (err) => console.error('Background failed to load:', err)
);

// Particle star field layered on top of the static background
// — gives depth and makes the scene feel less flat
function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const count = 3000;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 600;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.4,
    sizeAttenuation: true,   // stars further away appear smaller
    transparent: true,
    opacity: 0.85,
  });

  return new THREE.Points(geometry, material);
}

scene.add(createStarField());


// ═══════════════════════════════════════════════════════════
// 4. LIGHTING
// ═══════════════════════════════════════════════════════════

// Ambient — soft fill so nothing is pitch black
const ambientLight = new THREE.AmbientLight(0x222244, 1.5);  // slight blue tint for space feel
scene.add(ambientLight);

// Main directional light — acts like a distant sun
const sunLight = new THREE.DirectionalLight(0xfff5e0, 2);    // warm white
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// Subtle fill light from the opposite side — stops shadows being too harsh
const fillLight = new THREE.DirectionalLight(0x4444ff, 0.3); // cool blue
fillLight.position.set(-10, -5, -10);
scene.add(fillLight);


// ═══════════════════════════════════════════════════════════
// 5. PHYSICS WORLD
// ═══════════════════════════════════════════════════════════

const physicsWorld = new CANNON.World({
  gravity: new CANNON.Vec3(0, 0, 0),   // zero gravity — space
});

// Broadphase determines how Cannon-ES checks for potential collisions.
// SAPBroadphase is more efficient with many moving objects (asteroids)
physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
physicsWorld.allowSleep = true;        // physics bodies can sleep when idle — saves performance


// ═══════════════════════════════════════════════════════════
// 6. SCORE SYSTEM
// ═══════════════════════════════════════════════════════════

export let score = 0;
const scoreEl = document.getElementById('score');

export function addScore(points) {
  score += points;
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
}

export function resetScore() {
  score = 0;
  if (scoreEl) scoreEl.textContent = 'Score: 0';
}


// ═══════════════════════════════════════════════════════════
// 7. ASSET LOADER
// ═══════════════════════════════════════════════════════════

const gltfLoader = new GLTFLoader();

// Track how many assets are loading so we know when to hide
// the loading screen
let assetsToLoad = 0;
let assetsLoaded = 0;

function onAssetLoaded() {
  assetsLoaded++;
  if (assetsLoaded >= assetsToLoad) {
    document.getElementById('loading')?.classList.add('hidden');
  }
}

// Export loader so gun.js and asteroids.js can reuse the same instance
export { gltfLoader, onAssetLoaded };
export function registerAsset() { assetsToLoad++; }


// ═══════════════════════════════════════════════════════════
// 8. CONTROLLERS + HANDEDNESS
// ═══════════════════════════════════════════════════════════

const controllerModelFactory = new XRControllerModelFactory();

let gunController    = null;   // left  — holds gun
let lassoController  = null;   // right — holds lasso
let gunGrip          = null;
let lassoGrip        = null;

renderer.xr.addEventListener('sessionstart', () => {
  const session = renderer.xr.getSession();

  session.addEventListener('inputsourceschange', (event) => {
    event.added.forEach((inputSource) => {
      // Find the index Three.js uses for this inputSource
      const sources = [...session.inputSources];
      const index = sources.indexOf(inputSource);

      const controller = renderer.xr.getController(index);
      const grip = renderer.xr.getControllerGrip(index);

      // Attach the generic controller model (shows the physical shape
      // of whatever headset the player is using)
      grip.add(controllerModelFactory.createControllerModel(grip));

      if (inputSource.handedness === 'left') {
        // ── GUN (left hand) ──────────────────────────────
        gunController = controller;
        gunGrip = grip;

        createGun(gunGrip, gltfLoader, scene);

        gunController.addEventListener('selectstart', () => {
          onGunFire(gunController, scene, physicsWorld);
        });

        scene.add(gunController);
        scene.add(gunGrip);
      }

      if (inputSource.handedness === 'right') {
        // ── LASSO (right hand) ───────────────────────────
        lassoController = controller;
        lassoGrip = grip;

        createLasso(lassoGrip, scene);

        lassoController.addEventListener('squeezestart', () => {
          onLassoCharge(lassoController);
        });

        lassoController.addEventListener('squeezeend', () => {
          onLassoThrow(lassoController, scene, physicsWorld);
        });

        scene.add(lassoController);
        scene.add(lassoGrip);
      }
    });

    // Clean up removed controllers (e.g. controller disconnected)
    event.removed.forEach((inputSource) => {
      const sources = [...session.inputSources];
      const index = sources.indexOf(inputSource);
      if (index === -1) return;

      const grip = renderer.xr.getControllerGrip(index);
      scene.remove(grip);
    });
  });
});


// ═══════════════════════════════════════════════════════════
// 9. WINDOW RESIZE
// ═══════════════════════════════════════════════════════════

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// ═══════════════════════════════════════════════════════════
// 10. ASTEROID SPAWNING CONFIG
// ═══════════════════════════════════════════════════════════

const SPAWN_INTERVAL  = 2.5;   // seconds between each spawn
const MAX_ASTEROIDS   = 20;    // cap so the scene doesn't get overloaded
let spawnTimer = 0;
let asteroidCount = 0;         // tracked by asteroids.js via export below

export function incrementAsteroidCount()  { asteroidCount++; }
export function decrementAsteroidCount()  { asteroidCount--; }
export function getAsteroidCount()        { return asteroidCount; }


// ═══════════════════════════════════════════════════════════
// 11. ANIMATION LOOP
// ═══════════════════════════════════════════════════════════

const clock = new THREE.Clock();

renderer.setAnimationLoop((time, frame) => {
  const delta = clock.getDelta();   // seconds since last frame — keeps
                                    // movement speed frame-rate independent

  // ── Physics step ──────────────────────────────────────
  // Arguments: fixed timestep, delta, max substeps
  // Max substeps of 3 prevents the physics from "exploding"
  // if the frame takes too long (e.g. tab was backgrounded)
  physicsWorld.step(1 / 60, delta, 3);

  // ── Spawn asteroids ───────────────────────────────────
  spawnTimer += delta;
  if (spawnTimer >= SPAWN_INTERVAL && asteroidCount < MAX_ASTEROIDS) {
    spawnTimer = 0;
    spawnAsteroid(scene, physicsWorld, gltfLoader);
  }

  // ── Update game systems ───────────────────────────────
  updateAsteroids(scene, physicsWorld);

  if (lassoController) {
    updateLasso(lassoController, scene, physicsWorld);
  }

  // ── Render ────────────────────────────────────────────
  renderer.render(scene, camera);
});