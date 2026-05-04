// js/main.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { scene, camera, renderer, DECK_Y } from './scene.js';
import { state, dom, updateHUD, showGameHUD } from './hud.js';
import { controls, applyMovement, resetPlayer, setMouseButton } from './player.js';
import { updateLasers, resetWeapons } from './weapons.js';
import { tryLassoGrab, releaseLasso, updateLasso } from './lasso.js';
import { asteroids, spawnAsteroid, clearAsteroids, updateAsteroids, checkCollisions } from './asteroids.js';
import { explosions, updateExplosions, updateSpeedLines, updateShake } from './effects.js';
import { stepWorld, updateShipBodyPosition } from './physics.js';
import { xrState, pollXRAxes } from './xr.js';

document.addEventListener('contextmenu', e => e.preventDefault());

let gameStarted = false;

dom.blocker.addEventListener('click', () => {
    if (!state.gameOver) controls.lock();
});

controls.addEventListener('lock', () => {
    gameStarted = true;
    dom.blocker.style.display = 'none';
    showGameHUD(true);
});
controls.addEventListener('unlock', () => {
    if (!state.gameOver) {
        gameStarted = false;
        dom.blocker.style.display = 'flex';
        showGameHUD(false);
    }
});

renderer.xr.addEventListener('sessionstart', () => {
    gameStarted = true;
    dom.blocker.style.display = 'none';
    showGameHUD(true);
});

renderer.xr.addEventListener('sessionend', () => {
    gameStarted = false;
    if (!state.gameOver) showGameHUD(false);
});

document.addEventListener('mousedown', (e) => {
    setMouseButton(e.button, true);
    if (e.button === 2) tryLassoGrab(asteroids);
});
document.addEventListener('mouseup', (e) => {
    setMouseButton(e.button, false);
    if (e.button === 2) releaseLasso(true);
});

function restartGame() {
    state.lives = 5; state.score = 0;
    state.gameOver = false; state.invincible = false; state.invincibleTimer = 0;
    updateHUD();
    dom.gameOver.style.display = 'none';
    resetPlayer();
    clearAsteroids();
    explosions.length = 0;
    resetWeapons();
    releaseLasso(false);
    for (let i = 0; i < 15; i++) spawnAsteroid(true);
}
dom.gameOver.addEventListener('click', restartGame);

// Load ship
let shipModel = null, bobTime = 0;
const loader = new GLTFLoader();
loader.load('space_room.glb', (gltf) => {
    shipModel = gltf.scene;
    scene.add(shipModel);
});

for (let i = 0; i < 15; i++) spawnAsteroid(true);

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);

    const isPlaying = gameStarted && !state.gameOver;

    if (isPlaying) {
        state.score += delta * 10;
        updateHUD();
    }

    bobTime += delta;
    if (shipModel) {
        shipModel.position.y = Math.sin(bobTime * 1.2) * 0.03;
        shipModel.rotation.x = Math.sin(bobTime * 0.8) * 0.003;
    }

    updateShipBodyPosition(camera.position.x, camera.position.y, camera.position.z);
    stepWorld(delta);

    applyMovement(delta, isPlaying);
    updateSpeedLines(delta);
    updateExplosions(delta);
    updateShake(delta);

    if (isPlaying) {
        updateLasers(delta, asteroids, null, (pts) => { state.score += pts; updateHUD(); });
        updateLasso(delta, asteroids);
        updateAsteroids(delta);
        checkCollisions((pts) => { state.score += pts; updateHUD(); });
    } else {
        updateAsteroids(delta);
    }

    if (xrState.isPresenting) pollXRAxes();

    renderer.render(scene, camera);
});