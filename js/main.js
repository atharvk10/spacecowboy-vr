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

// ─── Single source of truth: is the game running? ────────────────────────────
// True once the player clicks in (desktop) or enters VR.

let gameStarted = false;

export function isGameStarted() { return gameStarted; }

// ─── Desktop pointer lock ─────────────────────────────────────────────────────

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
        dom.lassoIndicator.style.display = 'none';
    }
});

// ─── WebXR session ────────────────────────────────────────────────────────────

renderer.xr.addEventListener('sessionstart', () => {
    gameStarted = true;
    dom.blocker.style.display = 'none';
    showGameHUD(true);
    // Offset reference space so player stands on the ship deck
    const base = renderer.xr.getReferenceSpace();
    if (base) {
        const t = new XRRigidTransform({ x: -4.5, y: -0.05, z: 4.5, w: 1 });
        renderer.xr.setReferenceSpace(base.getOffsetReferenceSpace(t));
    }
});

renderer.xr.addEventListener('sessionend', () => {
    gameStarted = false;
    if (!state.gameOver) {
        dom.blocker.style.display = 'flex';
        showGameHUD(false);
    }
});

// ─── Desktop mouse ────────────────────────────────────────────────────────────

document.addEventListener('mousedown', (e) => {
    setMouseButton(e.button, true);
    if (!gameStarted || state.gameOver) return;
    if (e.button === 2) tryLassoGrab(asteroids);
});
document.addEventListener('mouseup', (e) => {
    setMouseButton(e.button, false);
    if (e.button === 2) releaseLasso(true);
});

// ─── Restart ──────────────────────────────────────────────────────────────────

function restartGame() {
    state.lives = 5; state.score = 0;
    state.gameOver = false; state.invincible = false; state.invincibleTimer = 0;
    updateHUD();
    dom.gameOver.style.display = 'none';
    if (xrState.isPresenting) {
        gameStarted = true;
        showGameHUD(true);
    } else {
        dom.blocker.style.display = 'flex';
        showGameHUD(false);
    }
    resetPlayer();
    clearAsteroids();
    for (const e of explosions) { for (const p of e.particles) scene.remove(p.mesh); }
    explosions.length = 0;
    resetWeapons();
    releaseLasso(false);
    for (let i = 0; i < 15; i++) spawnAsteroid(true);
}
dom.gameOver.addEventListener('click', restartGame);

// ─── Ship model ───────────────────────────────────────────────────────────────

let shipModel = null, bobTime = 0;
const loader = new GLTFLoader();
loader.load('space_room.glb', (gltf) => {
    shipModel = gltf.scene;
    scene.add(shipModel);
}, undefined, (err) => {
    console.error(err);
    dom.blocker.innerHTML += '<p style="color:#f44">Failed to load space_room.glb.</p>';
});

for (let i = 0; i < 15; i++) spawnAsteroid(true);

// ─── Animation loop ───────────────────────────────────────────────────────────

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);

    // If game just ended on desktop, release pointer lock
    if (state.gameOver && gameStarted && !xrState.isPresenting && controls.isLocked) {
        controls.unlock();
    }

    const isPlaying = gameStarted && !state.gameOver;

    if (!state.gameOver) {
        if (isPlaying) { state.score += delta * 10; updateHUD(); }

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

    // Keep ship collision sphere on the player (critical for XR where player moves)
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

    // Poll axes AFTER game logic so edge flags (justPressed/justReleased) are read first
    if (xrState.isPresenting) pollXRAxes();

    renderer.render(scene, camera);
});
