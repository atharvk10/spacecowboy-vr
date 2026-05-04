// js/player.js
// WASD + Space always work in desktop AND WebXR emulator.
// On a real headset, right joystick and LG grip also work on top.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { scene, camera, DECK_Y } from './scene.js';
import { state, registerJetpackFuelGetter } from './hud.js';
import { xrState } from './xr.js';

export const controls = new PointerLockControls(camera, document.body);

const GRAVITY            = -12.0;
const JETPACK_THRUST     =  18.0;
export const JETPACK_MAX_FUEL = 100;
const JETPACK_BURN_RATE  =  30;
const JETPACK_REGEN_RATE =  20;
const MOVE_SPEED         =   5.0;
const XR_MOVE_SPEED      =   6.0;

let verticalVel = 0;
let onDeck      = true;
export let jetpackFuel = JETPACK_MAX_FUEL;

registerJetpackFuelGetter(() => jetpackFuel, () => JETPACK_MAX_FUEL);

// ─── Keyboard & mouse state ───────────────────────────────────────────────────

export const moveState = { forward: false, backward: false, left: false, right: false };
export let jetpackActive = false;

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

// ─── Jetpack particles ────────────────────────────────────────────────────────

const jetpackParticles = [];
const jpGeo = new THREE.SphereGeometry(0.06, 4, 4);
const jpMat = new THREE.MeshBasicMaterial({ color: 0x33aaff, transparent: true, opacity: 0.7 });

function spawnJetpackParticle() {
    const jp = new THREE.Mesh(jpGeo, jpMat.clone());
    jp.position.set(
        camera.position.x + (Math.random()-0.5)*0.3,
        camera.position.y - 1.0,
        camera.position.z + (Math.random()-0.5)*0.3
    );
    scene.add(jp);
    jetpackParticles.push({
        mesh: jp,
        vel:  new THREE.Vector3((Math.random()-0.5)*0.5, -3-Math.random()*2, (Math.random()-0.5)*0.5),
        life: 0.4 + Math.random()*0.3,
    });
}

// ─── Main update ──────────────────────────────────────────────────────────────

export function applyMovement(delta, isPlaying) {
    if (state.gameOver || !isPlaying) return;

    // ── Horizontal movement ───────────────────────────────────────────────────
    // WASD always works. Pointer lock moves the camera on desktop/emulator.
    // When pointer lock is NOT held (real XR headset), move camera directly.

    const kbDir = new THREE.Vector3(
        Number(moveState.right) - Number(moveState.left),
        0,
        Number(moveState.forward) - Number(moveState.backward)
    );

    if (kbDir.length() > 0) {
        kbDir.normalize();
        if (controls.isLocked) {
            controls.moveRight(kbDir.x * MOVE_SPEED * delta);
            controls.moveForward(kbDir.z * MOVE_SPEED * delta);
        } else {
            // Real headset — no pointer lock, so move camera directly
            const fwd = new THREE.Vector3();
            camera.getWorldDirection(fwd);
            fwd.y = 0; fwd.normalize();
            const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();
            camera.position.addScaledVector(fwd,   kbDir.z * MOVE_SPEED * delta);
            camera.position.addScaledVector(right, kbDir.x * MOVE_SPEED * delta);
        }
    }

    // Right joystick locomotion (real headset only — emulator has no gamepad axes)
    if (xrState.isPresenting && (Math.abs(xrState.rightStickX) > 0 || Math.abs(xrState.rightStickY) > 0)) {
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();
        camera.position.addScaledVector(fwd,  -xrState.rightStickY * XR_MOVE_SPEED * delta);
        camera.position.addScaledVector(right,  xrState.rightStickX * XR_MOVE_SPEED * delta);
    }

    // ── Jetpack ───────────────────────────────────────────────────────────────
    // Space key always works. LG grip (left squeeze) also works on real headset.

    const thrustOn = jetpackActive || (xrState.isPresenting && xrState.leftGripDown);

    if (thrustOn && jetpackFuel > 0) {
        verticalVel += JETPACK_THRUST * delta;
        jetpackFuel  = Math.max(0, jetpackFuel - JETPACK_BURN_RATE * delta);
        onDeck = false;
        if (Math.random() < 0.6) spawnJetpackParticle();
    }

    // ── Gravity + floor ───────────────────────────────────────────────────────

    if (!onDeck) verticalVel += GRAVITY * delta;
    camera.position.y += verticalVel * delta;

    if (camera.position.y <= DECK_Y) {
        camera.position.y = DECK_Y;
        verticalVel = 0;
        onDeck = true;
    } else {
        onDeck = false;
    }

    if (onDeck) jetpackFuel = Math.min(JETPACK_MAX_FUEL, jetpackFuel + JETPACK_REGEN_RATE * delta);

    // ── Jetpack particles ─────────────────────────────────────────────────────

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

export function resetPlayer() {
    verticalVel = 0; onDeck = true; jetpackFuel = JETPACK_MAX_FUEL;
    camera.position.set(4.5, DECK_Y, -4.5);
}   