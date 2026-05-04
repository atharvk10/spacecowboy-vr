// Entry point: wires everything together, runs the animation loop
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

import { scene, camera, renderer, DECK_Y } from './scene.js';
import { state, dom, updateHUD, showGameHUD, INVINCIBLE_DURATION, registerVRHUDCallbacks } from './hud.js';
import { controls, applyMovement, resetPlayer, setMouseButton } from './player.js';
import { updateLasers, resetWeapons, fireBlaster } from './weapons.js';
import { tryLassoGrab, releaseLasso, updateLasso } from './lasso.js';
import { asteroids, spawnAsteroid, clearAsteroids, updateAsteroids, checkCollisions } from './asteroids.js';
import { explosions, updateExplosions, updateSpeedLines, updateShake } from './effects.js';
import { stepWorld } from './physics.js';
import {
    updateVRHUD, showVRGameOver, hideVRGameOver,
    setVRHUDVisible, updateVRHUDPosition,
    showVRStartScreen, hideVRStartScreen,
} from './vr_hud.js';

renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

registerVRHUDCallbacks((lives, score) => updateVRHUD(lives, score), (finalScore)   => showVRGameOver(finalScore),);

let vrGameStarted = false;
let vrLeftSqueezeHeld = false;

const weaponLoader = new GLTFLoader();

function attachGunToGrip(grip) {
    const wrapper = new THREE.Group();
    wrapper.rotation.set( -Math.PI / 12, Math.PI / 2, 0);
    wrapper.scale.setScalar(0.048);             
    wrapper.position.set(0.02, -0.02, -0.05);  

    weaponLoader.load('Space_Gun.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(-1, -1, 0);
        model.rotation.set(0, 0, -0.5);
        model.scale.set(0.5, 0.5, 0.5);
        wrapper.add(model);
        console.log('Space_Gun.glb loaded');
    }, undefined, (err) => console.error('Gun load error:', err));

    grip.add(wrapper);
}

function attachLassoToGrip(grip) {
    const wrapper = new THREE.Group();
    wrapper.rotation.set(0, 0, 0);
    wrapper.scale.setScalar(0.025);       
    wrapper.position.set(0, 0, -0.05);        

    weaponLoader.load('Lasso.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(-1, 1, -4);
        model.scale.set(0.5, 0.5, 0.5);
        wrapper.add(model);
        console.log('Lasso.glb loaded');
    }, undefined, (err) => console.error('Lasso load error:', err));

    grip.add(wrapper);
}

const rayGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -50),   
]);
const rayMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffcc, transparent: true, opacity: 0.55,
});

const controllerModelFactory = new XRControllerModelFactory();

function setupController(index) {
    const controller = renderer.xr.getController(index);
    scene.add(controller);

    const ray = new THREE.Line(rayGeometry, rayMaterial.clone());
    controller.add(ray);

    const grip = renderer.xr.getControllerGrip(index);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);

    if (index === 0) {
        attachGunToGrip(grip);

        controller.addEventListener('squeezestart', () => {
            if (!renderer.xr.isPresenting || !vrGameStarted || state.gameOver) return;
            vrLeftSqueezeHeld = true;
        });
        controller.addEventListener('squeezeend', () => {
            vrLeftSqueezeHeld = false;
        });

    } else {
        attachLassoToGrip(grip);

        controller.addEventListener('squeezestart', () => {
            if (!renderer.xr.isPresenting) return;
            if (!vrGameStarted) { vrStartGame(); return; }   
            if (state.gameOver) { doRestart();   return; }   
            tryLassoGrab(asteroids);
        });
        controller.addEventListener('squeezeend', () => {
            if (vrGameStarted && !state.gameOver) releaseLasso(true);
        });
    }
}

setupController(0);
setupController(1);

renderer.xr.addEventListener('sessionstart', () => {
    vrGameStarted = false;
    vrLeftSqueezeHeld = false;
    setVRHUDVisible(false);  
    showVRStartScreen();     
});

renderer.xr.addEventListener('sessionend', () => {
    vrGameStarted = false;
    vrLeftSqueezeHeld = false;
    setVRHUDVisible(false);
    hideVRGameOver();
    hideVRStartScreen();
});

function vrStartGame() {
    vrGameStarted = true;
    hideVRStartScreen();
    setVRHUDVisible(true);
    updateVRHUD(state.lives, state.score);
}

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

function doRestart() {
    state.lives = 3;
    state.score = 0;
    state.gameOver = false;
    state.invincible = false;
    state.invincibleTimer = 0;
    vrGameStarted = renderer.xr.isPresenting;
    updateHUD();
    dom.gameOver.style.display = 'none';
    dom.blocker.style.display  = 'flex';
    showGameHUD(false);
    hideVRGameOver();
    if (renderer.xr.isPresenting) setVRHUDVisible(true);
    resetPlayer();
    clearAsteroids();
    for (const e of explosions) { for (const p of e.particles) scene.remove(p.mesh); }
    explosions.length = 0;
    resetWeapons();
    releaseLasso(false);
    for (let i = 0; i < 25; i++) spawnAsteroid(true);
}

dom.gameOver.addEventListener('click', doRestart);

let shipModel = null;
let bobTime   = 0;
const loader  = new GLTFLoader();
loader.load('space_room.glb', (gltf) => {
    shipModel = gltf.scene;
    scene.add(shipModel);
    console.log('Spaceship loaded!');
}, undefined, (err) => console.error('Error loading space_room.glb:', err));

for (let i = 0; i < 15; i++) spawnAsteroid(true);
setVRHUDVisible(false);

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const isPresenting = renderer.xr.isPresenting;

    const isPlaying = !state.gameOver && (
        controls.isLocked ||
        (isPresenting && vrGameStarted)
    );

    if (!state.gameOver) {
        if (isPlaying) {
            state.score += delta * 10;
            updateHUD();
        }

        if (state.invincible) {
            state.invincibleTimer -= delta;
            if (state.invincibleTimer <= 0) state.invincible = false;
            if (shipModel) shipModel.visible = Math.floor(state.invincibleTimer * 10) % 2 === 0;
        } else if (shipModel) {
            shipModel.visible = true;
        }

        bobTime += delta;
        if (shipModel) {
            shipModel.position.y = Math.sin(bobTime * 1.2) * 0.03;
            shipModel.rotation.x = Math.sin(bobTime * 0.8) * 0.003;
        }
    }

    stepWorld(delta);
    applyMovement(delta);
    updateSpeedLines(delta);
    updateExplosions(delta);
    updateShake(delta);

    if (isPresenting) updateVRHUDPosition();

    if (isPlaying) {
        if (isPresenting && vrLeftSqueezeHeld) fireBlaster();

        updateLasers(delta, asteroids, null, (pts) => { state.score += pts; updateHUD(); });
        updateLasso(delta);
        updateAsteroids(delta);
        checkCollisions((pts) => { state.score += pts; updateHUD(); });
    } else {
        // Asteroids still drift on the menu for atmosphere — no damage/score
        updateAsteroids(delta);
    }

    renderer.render(scene, camera);
});
