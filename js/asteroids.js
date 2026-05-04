// Asteroid spawning, cannon-es physics bodies, and game collision logic

import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { state, updateHUD, triggerDamageFlash, showGameOver, INVINCIBLE_DURATION } from './hud.js';
import { controls } from './player.js';
import { createExplosion, triggerShake } from './effects.js';
import { releaseLasso, lassoTarget } from './lasso.js';
import { world, CANNON, asteroidMaterial, shipBody } from './physics.js';

const SHIP_SPEED = 12;

const planetBounds = [
    { center: new THREE.Vector3(35, 20, -30), radius: 12},
    { center: new THREE.Vector3(-20, 15, -25), radius: 4 },
    { center: new THREE.Vector3(15, 25, 30), radius: 3},
];

const asteroidGeos = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 1),
];
const asteroidMats = [
    new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9,  metalness: 0.1,  flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.85, metalness: 0.15, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.95, metalness: 0.05, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9,  metalness: 0.2,  flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8,  metalness: 0.1,  flatShading: true }),
];

export const asteroids = [];
const collidedPairs = new Set();

export function getAsteroidRadius(mesh) {
    return (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
}

function removeAsteroid(index) {
    const a = asteroids[index];
    scene.remove(a.mesh);
    world.removeBody(a.body);
    asteroids.splice(index, 1);
}


export function spawnAsteroid(initialSpread = false) {
    const geo = asteroidGeos[Math.floor(Math.random() * asteroidGeos.length)];
    const mat = asteroidMats[Math.floor(Math.random() * asteroidMats.length)];
    const mesh = new THREE.Mesh(geo, mat);

    const scale = 0.3 + Math.random() * 3.5;
    const sx = scale * (0.6 + Math.random() * 0.8);
    const sy = scale * (0.6 + Math.random() * 0.8);
    const sz = scale * (0.6 + Math.random() * 0.8);
    mesh.scale.set(sx, sy, sz);

    let px, py, pz;
    if (initialSpread) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 20 + Math.random() * 80;
        px = 4.5 + Math.cos(angle) * dist * 0.5;
        py = (Math.random()-0.5) * 30;
        pz = -4.5 + (Math.random()-0.5) * 150;
    } else {
        px = 4.5 + (Math.random()-0.5) * 60;
        py = (Math.random()-0.5) * 25;
        pz = camera.position.z - 60 - Math.random() * 60;
    }
    mesh.position.set(px, py, pz);
    scene.add(mesh);

    const radius = (sx + sy + sz) / 3;
    const body = new CANNON.Body({
        mass: radius * 2,
        material: asteroidMaterial,
        shape: new CANNON.Sphere(radius),
        linearDamping: 0.0,
        angularDamping: 0.0,
        allowSleep: false,
    });
    body.position.set(px, py, pz);
    body.velocity.set( (Math.random()-0.5) * 2, (Math.random()-0.5) * 2, SHIP_SPEED * (0.6 + Math.random() * 0.8));
    body.angularVelocity.set((Math.random()-0.5) * 2, (Math.random()-0.5) * 2,(Math.random()-0.5) * 2);
    world.addBody(body);

    const asteroid = { mesh, body, alive: true, flung: false, _hitShip: false };
 
    body.addEventListener('collide', (e) => {
        if (e.body === shipBody) asteroid._hitShip = true;
    });

    asteroids.push(asteroid);
    return asteroid;
}

export function clearAsteroids() {
    for (const a of asteroids) {
        scene.remove(a.mesh);
        world.removeBody(a.body);
    }
    asteroids.length = 0;
}

export function setAsteroidVelocity(asteroid, vx, vy, vz) {
    asteroid.body.velocity.set(vx, vy, vz);
    asteroid.body.wakeUp();
}

export function updateAsteroids(delta) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (!a.alive) continue;

        a.mesh.position.copy(a.body.position);
        a.mesh.quaternion.copy(a.body.quaternion);
        if (a.body.position.z > camera.position.z + 30) {
            if (a === lassoTarget) releaseLasso(false);
            removeAsteroid(i);
            continue;
        }
        const lat = Math.abs(a.body.position.x - 4.5) + Math.abs(a.body.position.y);
        if (lat > 100) {
            if (a === lassoTarget) releaseLasso(false);
            removeAsteroid(i);
        }
    }

    if (asteroids.length < 35 && Math.random() < 0.15) spawnAsteroid(false);
    if (asteroids.length < 10)  { for (let k = 0; k < 2; k++) spawnAsteroid(false); }
}

export function checkCollisions(onScoreAdd) {
    if (state.gameOver) return;
    collidedPairs.clear();

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (!a.alive || a === lassoTarget || !a._hitShip) continue;
        a._hitShip = false;

        const r = getAsteroidRadius(a.mesh);
        createExplosion(a.mesh.position.clone(), r * 0.8, 0xff2200);
        removeAsteroid(i);

        if (!state.invincible) {
            state.lives--;
            updateHUD(); triggerDamageFlash(); triggerShake(0.4);
            state.invincible      = true;
            state.invincibleTimer = INVINCIBLE_DURATION;
            if (state.lives <= 0) {
                controls.unlock();
                showGameOver(state.score);
                releaseLasso(false);
            }
        }
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
        if (!asteroids[i]?.alive) continue;
        for (let j = i - 1; j >= 0; j--) {
            if (!asteroids[j]?.alive) continue;
            const a = asteroids[i], b = asteroids[j];
            const ra = getAsteroidRadius(a.mesh), rb = getAsteroidRadius(b.mesh);
            const key = `${i}_${j}`;
            if (collidedPairs.has(key)) continue;

            if (a.body.position.distanceTo(b.body.position) < ra + rb + 0.1) {
                collidedPairs.add(key);
                const mid = new THREE.Vector3(
                    (a.body.position.x + b.body.position.x) / 2,
                    (a.body.position.y + b.body.position.y) / 2,
                    (a.body.position.z + b.body.position.z) / 2,
                );
                const wasFlung = a.flung || b.flung;
                createExplosion(mid, Math.max(ra, rb) * (wasFlung ? 1.0 : 0.7), wasFlung ? 0xff00aa : 0xffaa22);
                onScoreAdd(Math.floor((ra + rb) * (wasFlung ? 25 : 5)));
                if (a === lassoTarget || b === lassoTarget) releaseLasso(false);
                a.alive = false; b.alive = false;
                // Remove higher index first so lower index stays valid
                if (i > j) { removeAsteroid(i); removeAsteroid(j); }
                else        { removeAsteroid(j); removeAsteroid(i); }
                updateHUD(); break;
            }
        }
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (!a.alive) continue;
        const ra = getAsteroidRadius(a.mesh);
        for (const planet of planetBounds) {
            const aPos = new THREE.Vector3(a.body.position.x, a.body.position.y, a.body.position.z);
            if (aPos.distanceTo(planet.center) < planet.radius + ra) {
                createExplosion(a.mesh.position.clone(), ra * 0.8, a.flung ? 0xff00aa : 0xff6600);
                onScoreAdd(Math.floor(ra * (a.flung ? 20 : 8)));
                if (a === lassoTarget) releaseLasso(false);
                a.alive = false;
                removeAsteroid(i);
                updateHUD(); break;
            }
        }
    }
}
