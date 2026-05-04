// Entry point: wires everything together, runs the animation loop
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js'; // Added for VR
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js'; // Added for Joysticks

import { scene, camera, renderer, DECK_Y } from './scene.js';
import { state, dom, updateHUD, showGameHUD, INVINCIBLE_DURATION } from './hud.js';
import { controls, applyMovement, resetPlayer } from './player.js';
import { updateLasers, resetWeapons, lasers } from './weapons.js';
import { tryLassoGrab, releaseLasso, updateLasso } from './lasso.js';
import { asteroids, spawnAsteroid, clearAsteroids, updateAsteroids, checkCollisions } from './asteroids.js';
import { explosions, updateExplosions, updateSpeedLines, updateShake, triggerShake } from './effects.js';
import { stepWorld } from './physics.js';

// --- WebXR Initialization ---
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

const controllerModelFactory = new XRControllerModelFactory();

// Setup VR Controllers
function setupController(index) {
    const controller = renderer.xr.getController(index);
    
    // Laser trigger (Trigger button)
    controller.addEventListener('selectstart', () => {
        if (renderer.xr.isPresenting) {
            // Logic for firing lasers can be called here or handled in loop
            setMouseButton(0, true); 
        }
    });
    controller.addEventListener('selectend', () => setMouseButton(0, false));

    // Lasso trigger (Squeeze/Grip button)
    controller.addEventListener('squeezestart', () => {
        if (renderer.xr.isPresenting) tryLassoGrab(asteroids);
    });
    controller.addEventListener('squeezeend', () => releaseLasso(true));

    scene.add(controller);

    // Add visual models (Joysticks)
    const grip = renderer.xr.getControllerGrip(index);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);
}

setupController(0);
setupController(1);

// --- Existing Mouse Logic ---
import { setMouseButton } from './player.js';
document.addEventListener('contextmenu', e => e.preventDefault());
dom.blocker.addEventListener('click', () => { if (!state.gameOver) controls.lock(); });

controls.addEventListener('lock', () => {
    dom.blocker.style.display = 'none';
    showGameHUD(true);
});
controls.addEventListener('unlock', () => {
    if (!state.gameOver && !renderer.xr.isPresenting) {
        dom.blocker.style.display = 'flex';
        showGameHUD(false);
        dom.lassoIndicator.style.display = 'none';
    }
});

document.addEventListener('mousedown', (e) => {
    setMouseButton(e.button, true);
    if (!controls.isLocked || state.gameOver) return;
    if (e.button === 2) tryLassoGrab(asteroids);
});
document.addEventListener('mouseup', (e) => {
    setMouseButton(e.button, false);
    if (e.button === 2) releaseLasso(true);
});

// Restart logic
dom.gameOver.addEventListener('click', () => {
    state.lives = 5;
    state.score = 0;
    state.gameOver = false;
    state.invincible = false;
    state.invincibleTimer = 0;
    updateHUD();
    dom.gameOver.style.display = 'none';
    dom.blocker.style.display = 'flex';
    showGameHUD(false);
    resetPlayer();
    clearAsteroids();
    for (const e of explosions) { for (const p of e.particles) scene.remove(p.mesh); }
    explosions.length = 0;
    resetWeapons();
    releaseLasso(false);
    for (let i = 0; i < 15; i++) spawnAsteroid(true);
});

// Ship model
let shipModel = null;
let bobTime = 0;
const loader = new GLTFLoader();
loader.load('space_room.glb', (gltf) => {
    shipModel = gltf.scene;
    scene.add(shipModel);
    console.log('Spaceship loaded!');
}, undefined, (error) => {
    console.error('Error loading space_room.glb:', error);
});

// Create initial asteroids
for (let i = 0; i < 15; i++) spawnAsteroid(true);

const clock = new THREE.Clock();

// --- Main Animation Loop ---
renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const isPresenting = renderer.xr.isPresenting;
    const isPlaying = (controls.isLocked || isPresenting) && !state.gameOver;

    if (!state.gameOver) {
        // Score accumulation
        if (isPlaying) { 
            state.score += delta * 10; 
            updateHUD(); 
        }

        // Invincibility blink
        if (state.invincible) {
            state.invincibleTimer -= delta;
            if (state.invincibleTimer <= 0) state.invincible = false;
            if (shipModel) shipModel.visible = Math.floor(state.invincibleTimer * 10) % 2 === 0;
        } else if (shipModel) {
            shipModel.visible = true;
        }

        // Gentle ship bob
        bobTime += delta;
        if (shipModel) {
            shipModel.position.y = Math.sin(bobTime * 1.2) * 0.03;
            shipModel.rotation.x = Math.sin(bobTime * 0.8) * 0.003;
        }
    }

    stepWorld(delta);
    
    // Movements and Effects
    applyMovement(delta);
    updateSpeedLines(delta);
    updateExplosions(delta);
    updateShake(delta);

    if (isPlaying) {
        updateLasers(delta, asteroids, null, (pts) => { state.score += pts; updateHUD(); });
        updateLasso(delta);
        updateAsteroids(delta);
        checkCollisions((pts) => { state.score += pts; updateHUD(); });
    } else {
        updateAsteroids(delta);
    }

    renderer.render(scene, camera);
});