// Pointer lock controls, WASD movement, jetpack physics

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { scene, camera, renderer, DECK_Y } from './scene.js';
import { state, dom, showGameHUD, updateHUD, registerJetpackFuelGetter } from './hud.js';

export const controls = new PointerLockControls(camera, document.body);

//Jetpack constants
const GRAVITY = -6.0;
const JETPACK_THRUST  = 14.0;
export const JETPACK_MAX_FUEL = 100;
const JETPACK_BURN_RATE = 30;
const JETPACK_REGEN_RATE = 20;
const MOVE_SPEED = 5.0;

let verticalVel = 0;
let onDeck = true;
export let jetpackFuel = JETPACK_MAX_FUEL;

registerJetpackFuelGetter(
    () => jetpackFuel,
    () => JETPACK_MAX_FUEL
);

export const moveState = { forward: false, backward: false, left: false, right: false };
export let jetpackActive = false;

//Mouse and WASD controls
const mouse = { left: false, right: false };
export const isLeftMouseDown  = () => mouse.left;
export const isRightMouseDown = () => mouse.right;
export function setMouseButton(button, value) {
    if (button === 0) mouse.left  = value;
    if (button === 2) mouse.right = value;
}

document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp':    moveState.forward  = true; break;
        case 'KeyS': case 'ArrowDown':  moveState.backward = true; break;
        case 'KeyA': case 'ArrowLeft':  moveState.left     = true; break;
        case 'KeyD': case 'ArrowRight': moveState.right    = true; break;
        case 'Space': jetpackActive = true; e.preventDefault(); break;
    }
});
document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp':    moveState.forward  = false; break;
        case 'KeyS': case 'ArrowDown':  moveState.backward = false; break;
        case 'KeyA': case 'ArrowLeft':  moveState.left     = false; break;
        case 'KeyD': case 'ArrowRight': moveState.right    = false; break;
        case 'Space': jetpackActive = false; break;
    }
});

//Particle animation
const jetpackParticles = [];
const jpGeo = new THREE.SphereGeometry(0.06, 4, 4);
const jpMat = new THREE.MeshBasicMaterial({ color: 0x33aaff, transparent: true, opacity: 0.7 });

//Applying movement
export function applyMovement(delta) {
    if (renderer.xr.isPresenting || !controls.isLocked || state.gameOver) return;

    const dir = new THREE.Vector3(
        Number(moveState.right) - Number(moveState.left),
        0,
        Number(moveState.forward) - Number(moveState.backward)
    );
    if (dir.length() > 0) dir.normalize();
    controls.moveRight(dir.x * MOVE_SPEED * delta);
    controls.moveForward(dir.z * MOVE_SPEED * delta);

    if (jetpackActive && jetpackFuel > 0) {
        verticalVel += JETPACK_THRUST * delta;
        jetpackFuel -= JETPACK_BURN_RATE * delta;
        if (jetpackFuel < 0) jetpackFuel = 0;
        onDeck = false;

        if (Math.random() < 0.6) {
            const jp = new THREE.Mesh(jpGeo, jpMat.clone());
            jp.position.set(
                camera.position.x + (Math.random() - 0.5) * 0.3,
                camera.position.y - 1.0,
                camera.position.z + (Math.random() - 0.5) * 0.3
            );
            scene.add(jp);
            jetpackParticles.push({
                mesh: jp,
                vel: new THREE.Vector3((Math.random()-0.5)*0.5, -3 - Math.random()*2, (Math.random()-0.5)*0.5),
                life: 0.4 + Math.random()*0.3
            });
        }
    }

    // Gravity
    if (!onDeck) verticalVel += GRAVITY * delta;

    //Changing camera position based on vertical velocity
    camera.position.y += verticalVel * delta;

    if (camera.position.y <= DECK_Y) {
        camera.position.y = DECK_Y;
        verticalVel = 0;
        onDeck = true;
    }

    if (onDeck && jetpackFuel < JETPACK_MAX_FUEL) {
        jetpackFuel = Math.min(JETPACK_MAX_FUEL, jetpackFuel + JETPACK_REGEN_RATE * delta);
    }

    for (let i = jetpackParticles.length - 1; i >= 0; i--) {
        const p = jetpackParticles[i];
        p.mesh.position.addScaledVector(p.vel, delta);
        p.life -= delta;
        p.mesh.material.opacity = Math.max(0, p.life / 0.5);
        p.mesh.scale.multiplyScalar(1 - 3 * delta);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.material.dispose();
            jetpackParticles.splice(i, 1);
        }
    }
}

//Resetting player
export function resetPlayer() {
    verticalVel = 0;
    onDeck = true;
    jetpackFuel = JETPACK_MAX_FUEL;
    camera.position.set(4.5, DECK_Y, -4.5);
}
