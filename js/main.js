// Entry point: wires everything together, runs the animation loop

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { scene, camera, renderer, DECK_Y } from './scene.js';
import { state, dom, updateHUD, showGameHUD, INVINCIBLE_DURATION } from './hud.js';
import { controls, applyMovement, resetPlayer } from './player.js';
import { updateLasers, resetWeapons, lasers } from './weapons.js';
import { tryLassoGrab, releaseLasso, updateLasso } from './lasso.js';
import { asteroids, spawnAsteroid, clearAsteroids, updateAsteroids, checkCollisions } from './asteroids.js';
import { explosions, updateExplosions, updateSpeedLines, updateShake, triggerShake } from './effects.js';
import { stepWorld } from './physics.js';

document.addEventListener('contextmenu', e => e.preventDefault());

dom.blocker.addEventListener('click', () => { if (!state.gameOver) controls.lock(); });
controls.addEventListener('lock', () => {
    dom.blocker.style.display = 'none';
    showGameHUD(true);
});
controls.addEventListener('unlock', () => {
    if (!state.gameOver) {
        dom.blocker.style.display = 'flex';
        showGameHUD(false);
        dom.lassoIndicator.style.display = 'none';
    }
});

//Mouse movement
import { setMouseButton } from './player.js';

document.addEventListener('mousedown', (e) => {
    setMouseButton(e.button, true);
    if (!controls.isLocked || state.gameOver) return;
    if (e.button === 2) tryLassoGrab(asteroids);
});
document.addEventListener('mouseup', (e) => {
    setMouseButton(e.button, false);
    if (e.button === 2) releaseLasso(true);
});

//Restart logic
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

//Ship model
let shipModel = null;
let bobTime   = 0;

const loader = new GLTFLoader();
loader.load(
    'space_room.glb',
    (gltf) => {
        shipModel = gltf.scene;
        scene.add(shipModel);
        renderer.xr.addEventListener('sessionstart', () => {
            const baseRefSpace = renderer.xr.getReferenceSpace();
            const transform = new XRRigidTransform({ x: -4.5, y: -0.05, z: 4.5, w: 1 });
            renderer.xr.setReferenceSpace(baseRefSpace.getOffsetReferenceSpace(transform));
        });
        console.log('Spaceship loaded!');
    },
    undefined,
    (error) => {
        console.error('Error loading space_room.glb:', error);
        dom.blocker.innerHTML += '<p style="color:#f44">Failed to load space_room.glb. Serve via local web server.</p>';
    }
);

//Creating the asteriod field
for (let i = 0; i < 15; i++) spawnAsteroid(true);

//Animation loop
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!state.gameOver) {
        // Passive score accumulation while playing
        if (controls.isLocked) { state.score += delta * 10; updateHUD(); }

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
            shipModel.position.y  = Math.sin(bobTime * 1.2) * 0.03;
            shipModel.rotation.x  = Math.sin(bobTime * 0.8) * 0.003;
        }
    }

    // Step cannon-es world
    stepWorld(delta);

    const isPlaying = controls.isLocked && !state.gameOver;

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
        // Asteroids drift visually before game starts, but deal no damage
        updateAsteroids(delta);
    }

    renderer.render(scene, camera);
});
