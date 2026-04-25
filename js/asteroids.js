// Asteroid spawning, movement, and collision detection

import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { state, updateHUD, triggerDamageFlash, showGameOver, INVINCIBLE_DURATION } from './hud.js';
import { controls } from './player.js';
import { createExplosion } from './effects.js';
import { releaseLasso, lassoTarget } from './lasso.js';
import { triggerShake } from './effects.js';

//Ship constants
const SHIP_CENTER = new THREE.Vector3(4.5, 0.5, -4.5);
const SHIP_RADIUS = 5.5;
const SHIP_SPEED  = 12;

const planetBounds = [
    { center: new THREE.Vector3(35, 20, -30),  radius: 12 },
    { center: new THREE.Vector3(-20, 15, -25), radius: 4  },
    { center: new THREE.Vector3(15, 25, 30),   radius: 3  },
];

//Material of Asteroids
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

export function getAsteroidRadius(mesh) {
    return (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
}

//Spawning asteroid
export function spawnAsteroid(initialSpread = false) {
    const geo   = asteroidGeos[Math.floor(Math.random() * asteroidGeos.length)];
    const mat   = asteroidMats[Math.floor(Math.random() * asteroidMats.length)];
    const mesh  = new THREE.Mesh(geo, mat);
    const scale = 0.3 + Math.random() * 3.5;
    mesh.scale.set(
        scale * (0.6 + Math.random() * 0.8),
        scale * (0.6 + Math.random() * 0.8),
        scale * (0.6 + Math.random() * 0.8)
    );

    if (initialSpread) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 20 + Math.random() * 80;
        mesh.position.set(
            4.5 + Math.cos(angle) * dist * 0.5,
            (Math.random()-0.5) * 30,
            -4.5 + (Math.random()-0.5) * 150
        );
    } else {
        mesh.position.set(
            4.5 + (Math.random()-0.5) * 60,
            (Math.random()-0.5) * 25,
            camera.position.z - 60 - Math.random() * 60
        );
    }

    mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
    );

    const drift  = new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*1, SHIP_SPEED*(0.6+Math.random()*0.8));
    const tumble = new THREE.Vector3((Math.random()-0.5)*1, (Math.random()-0.5)*1, (Math.random()-0.5)*1);
    scene.add(mesh);
    asteroids.push({ mesh, vel: drift, tumble, alive: true, flung: false });
}

export function clearAsteroids() {
    for (const a of asteroids) scene.remove(a.mesh);
    asteroids.length = 0;
}

export function updateAsteroids(delta) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (!a.alive) continue;

        a.mesh.position.addScaledVector(a.vel, delta);
        a.mesh.rotation.x += a.tumble.x * delta;
        a.mesh.rotation.y += a.tumble.y * delta;
        a.mesh.rotation.z += a.tumble.z * delta;

        if (a.mesh.position.z > camera.position.z + 30) {
            scene.remove(a.mesh);
            if (a === lassoTarget) releaseLasso(false);
            asteroids.splice(i, 1);
            continue;
        }
        const lat = Math.abs(a.mesh.position.x - 4.5) + Math.abs(a.mesh.position.y);
        if (lat > 100) {
            scene.remove(a.mesh);
            if (a === lassoTarget) releaseLasso(false);
            asteroids.splice(i, 1);
        }
    }

    
    let asteroid_count = 20;
    if (asteroids.length < asteroid_count && Math.random() < 0.15) spawnAsteroid(false);
    if (asteroids.length < asteroid_count/2) { for (let i = 0; i < 3; i++) spawnAsteroid(false); }
}


const _v = new THREE.Vector3();

//Checking collisions between different objects
export function checkCollisions(onScoreAdd) {
    if (state.gameOver) return;

    // Asteroid vs Ship hull
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (!a.alive || a === lassoTarget) continue;
        const r = getAsteroidRadius(a.mesh);
        if (a.mesh.position.distanceTo(SHIP_CENTER) < SHIP_RADIUS + r) {
            createExplosion(a.mesh.position.clone(), r * 0.8, 0xff2200);
            scene.remove(a.mesh); asteroids.splice(i, 1);
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
    }

    // Asteroid vs Asteroid
    for (let i = asteroids.length - 1; i >= 0; i--) {
        if (!asteroids[i]?.alive) continue;
        for (let j = i - 1; j >= 0; j--) {
            if (!asteroids[j]?.alive) continue;
            const a = asteroids[i], b = asteroids[j];
            const ra = getAsteroidRadius(a.mesh), rb = getAsteroidRadius(b.mesh);
            if (a.mesh.position.distanceTo(b.mesh.position) < ra + rb) {
                const mid      = _v.copy(a.mesh.position).add(b.mesh.position).multiplyScalar(0.5);
                const wasFlung = a.flung || b.flung;
                createExplosion(mid.clone(), Math.max(ra, rb) * (wasFlung ? 1.0 : 0.7), wasFlung ? 0xff00aa : 0xffaa22);
                onScoreAdd(Math.floor((ra + rb) * (wasFlung ? 25 : 5)));
                if (a === lassoTarget || b === lassoTarget) releaseLasso(false);
                a.alive = false; b.alive = false;
                scene.remove(a.mesh); scene.remove(b.mesh);
                asteroids.splice(i, 1); asteroids.splice(j, 1);
                updateHUD(); break;
            }
        }
    }

    // Asteroid vs Planet
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (!a.alive) continue;
        const ra = getAsteroidRadius(a.mesh);
        for (const planet of planetBounds) {
            if (a.mesh.position.distanceTo(planet.center) < planet.radius + ra) {
                createExplosion(a.mesh.position.clone(), ra * 0.8, a.flung ? 0xff00aa : 0xff6600);
                onScoreAdd(Math.floor(ra * (a.flung ? 20 : 8)));
                if (a === lassoTarget) releaseLasso(false);
                a.alive = false; scene.remove(a.mesh); asteroids.splice(i, 1);
                updateHUD(); break;
            }
        }
    }
}
