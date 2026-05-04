// Explosions, screen shake, speed lines

import * as THREE from 'three';
import { scene, camera } from './scene.js';

export const explosions = [];
const particleGeo = new THREE.SphereGeometry(1, 6, 6);

export function createExplosion(position, size, color) {
    const count = 18 + Math.floor(size * 8);
    const particles = [];

    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(size * 1.5, 8, 8), flashMat);
    flash.position.copy(position);
    scene.add(flash);

    for (let i = 0; i < count; i++) {
        const pColor = new THREE.Color(color);
        pColor.r += (Math.random() - 0.5) * 0.3;
        pColor.g += (Math.random() - 0.5) * 0.2;
        const mat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 1 });
        const mesh = new THREE.Mesh(particleGeo, mat);
        const s = (0.05 + Math.random() * 0.15) * size;
        mesh.scale.set(s, s, s);
        mesh.position.copy(position);
        const vel = new THREE.Vector3(
            (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2
        ).normalize().multiplyScalar(3 + Math.random() * 6 * size);
        scene.add(mesh);
        particles.push({ mesh, vel, life: 0.8 + Math.random() * 0.6 });
    }
    explosions.push({ particles, flash, flashLife: 0.15, age: 0 });
}

//Updating the explosions
export function updateExplosions(delta) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.age += delta;

        if (exp.flash) {
            exp.flashLife -= delta;
            if (exp.flashLife <= 0) {
                scene.remove(exp.flash);
                exp.flash.geometry.dispose();
                exp.flash.material.dispose();
                exp.flash = null;
            } else {
                exp.flash.material.opacity = exp.flashLife / 0.15;
                exp.flash.scale.multiplyScalar(1 + delta * 8);
            }
        }

        let allDead = !exp.flash;
        for (let j = exp.particles.length - 1; j >= 0; j--) {
            const p = exp.particles[j];
            p.life -= delta;
            if (p.life <= 0) {
                scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                exp.particles.splice(j, 1);
                continue;
            }
            allDead = false;
            p.mesh.position.addScaledVector(p.vel, delta);
            p.vel.multiplyScalar(1 - 2.0 * delta);
            p.mesh.material.opacity = Math.min(1, p.life / 0.4);
            p.mesh.scale.multiplyScalar(1 - 1.5 * delta);
        }
        if (allDead && !exp.flash) explosions.splice(i, 1);
    }
}

//Adding screen shake animation
let shakeIntensity = 0;

export function triggerShake(intensity) {
    shakeIntensity = intensity;
}

export function updateShake(delta) {
    if (shakeIntensity > 0) {
        camera.position.x += (Math.random() - 0.5) * shakeIntensity;
        camera.position.y += (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= Math.max(0, 1 - 6 * delta);
        if (shakeIntensity < 0.005) shakeIntensity = 0;
    }
}

export const SHIP_SPEED = 12;

const speedLines = [];
const speedLineMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.4 });
const speedLineGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4);
speedLineGeo.rotateX(Math.PI / 2);

for (let i = 0; i < 80; i++) {
    const mesh = new THREE.Mesh(speedLineGeo, speedLineMat);
    mesh.position.set(4.5 + (Math.random()-0.5)*40, (Math.random()-0.5)*20, -4.5 + (Math.random()-0.5)*100);
    scene.add(mesh);
    speedLines.push(mesh);
}

export function updateSpeedLines(delta) {
    for (const sl of speedLines) {
        sl.position.z += SHIP_SPEED * delta;
        if (sl.position.z > camera.position.z + 10) {
            sl.position.z = camera.position.z - 40 - Math.random() * 60;
            sl.position.x = 4.5 + (Math.random()-0.5)*40;
            sl.position.y = (Math.random()-0.5)*20;
        }
    }
}
