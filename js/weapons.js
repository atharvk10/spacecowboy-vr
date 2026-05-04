// js/weapons.js
import * as THREE from 'three';
import { scene } from './scene.js';
import { state } from './hud.js';
import { isLeftMouseDown } from './player.js';
import { xrState, getRightControllerRay } from './xr.js';
import { playBlasterSound } from './audio.js';
import { createExplosion } from './effects.js';

const LASER_SPEED = 120;
const LASER_LIFETIME = 3.0;
const FIRE_COOLDOWN = 0.1;

const laserGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
laserGeo.rotateX(Math.PI / 2);
const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.9 });

export const muzzleLight = new THREE.PointLight(0x00ffcc, 0, 5);
scene.add(muzzleLight);

export const lasers = [];
let fireCooldownTimer = 0;

export function resetWeapons() {
    lasers.length = 0;
    fireCooldownTimer = 0;
}

function fireBlaster() {
    if (state.gameOver || fireCooldownTimer > 0) return;
    fireCooldownTimer = FIRE_COOLDOWN;
    playBlasterSound();

    const { position: spawnPos, direction: dir } = getRightControllerRay();
    spawnPos.addScaledVector(dir, 1.8);
    spawnPos.y -= 0.2;

    const bolt = new THREE.Mesh(laserGeo, laserMat.clone());
    bolt.position.copy(spawnPos);
    bolt.lookAt(spawnPos.clone().add(dir));
    scene.add(bolt);

    lasers.push({
        bolt,
        vel: dir.clone().multiplyScalar(LASER_SPEED),
        life: LASER_LIFETIME
    });

    muzzleLight.position.copy(spawnPos);
    muzzleLight.intensity = 10;
    setTimeout(() => { muzzleLight.intensity = 0; }, 80);
}

export function updateLasers(delta, asteroids, lassoTarget, onScoreAdd) {
    if (fireCooldownTimer > 0) fireCooldownTimer -= delta;

    const shouldShoot = (isLeftMouseDown() || xrState.rightTriggerDown) && !state.gameOver;

    if (shouldShoot) fireBlaster();

    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.bolt.position.addScaledVector(l.vel, delta);
        l.life -= delta;

        if (l.life <= 0) {
            scene.remove(l.bolt);
            lasers.splice(i, 1);
        }
    }
}