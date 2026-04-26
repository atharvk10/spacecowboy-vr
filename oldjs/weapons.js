// blaster logic, laser updating

import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { state } from './hud.js';
import { controls, isLeftMouseDown } from './player.js';
import { playBlasterSound } from './audio.js';
import { createExplosion } from './effects.js';

//Laser settings
const LASER_SPEED    = 120;
const LASER_LIFETIME = 3.0;
const FIRE_COOLDOWN  = 0.12;

//Geometry and settings
const laserGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
laserGeo.rotateX(Math.PI / 2);
const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.9 });

const laserGlowGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 6);
laserGlowGeo.rotateX(Math.PI / 2);
const laserGlowMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.3 });

export const muzzleLight = new THREE.PointLight(0x00ffcc, 0, 5);
scene.add(muzzleLight);

export const lasers = [];
let fireCooldownTimer = 0;
let muzzleFlashTimer  = 0;

export function resetWeapons() {
    for (const l of lasers) { scene.remove(l.bolt); scene.remove(l.glow); }
    lasers.length    = 0;
    fireCooldownTimer = 0;
}

//Shooting from the blaster
function fireBlaster() {
    if (state.gameOver || fireCooldownTimer > 0) return;
    fireCooldownTimer = FIRE_COOLDOWN;
    playBlasterSound();

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir).normalize();
    const spawnPos = camera.position.clone().addScaledVector(dir, 1.5);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    spawnPos.addScaledVector(right, 0.3);
    spawnPos.y -= 0.2;

    const bolt = new THREE.Mesh(laserGeo, laserMat);
    bolt.position.copy(spawnPos);
    bolt.lookAt(spawnPos.clone().add(dir));
    scene.add(bolt);

    const glow = new THREE.Mesh(laserGlowGeo, laserGlowMat);
    glow.position.copy(spawnPos);
    glow.lookAt(spawnPos.clone().add(dir));
    scene.add(glow);

    lasers.push({ bolt, glow, vel: dir.clone().multiplyScalar(LASER_SPEED), life: LASER_LIFETIME });
    muzzleLight.position.copy(spawnPos);
    muzzleLight.intensity = 8;
    muzzleFlashTimer = 0.06;
}

export function updateLasers(delta, asteroids, lassoTarget, onScoreAdd) {
    if (fireCooldownTimer > 0) fireCooldownTimer -= delta;

    if (isLeftMouseDown() && controls.isLocked && !state.gameOver) fireBlaster(); //auto firing when left click is held

    if (muzzleFlashTimer > 0) {
        muzzleFlashTimer -= delta;
        if (muzzleFlashTimer <= 0) muzzleLight.intensity = 0;
    }

    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.bolt.position.addScaledVector(l.vel, delta);
        l.glow.position.copy(l.bolt.position);
        l.glow.quaternion.copy(l.bolt.quaternion);
        l.life -= delta;

        if (l.life <= 0) {
            scene.remove(l.bolt); scene.remove(l.glow);
            lasers.splice(i, 1);
            continue;
        }

        let hit = false;
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const a = asteroids[j];
            if (!a.alive || a === lassoTarget) continue;
            const r = getAsteroidRadius(a.mesh);
            if (l.bolt.position.distanceTo(a.mesh.position) < r + 0.5) {
                createExplosion(a.mesh.position.clone(), r * 0.7, 0x00ccff);
                onScoreAdd(Math.floor(r * 20));
                a.alive = false; scene.remove(a.mesh); asteroids.splice(j, 1);
                hit = true; break;
            }
        }
        if (hit) { scene.remove(l.bolt); scene.remove(l.glow); lasers.splice(i, 1); }
    }
}

function getAsteroidRadius(mesh) {
    return (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
}
