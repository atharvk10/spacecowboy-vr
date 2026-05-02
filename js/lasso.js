// js/lasso.js
// Lasso grab-and-fling
// Desktop: right mouse button — press = grab, release = fling
// XR:      LT (left trigger)  — press = grab, release = fling

import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { state, dom } from './hud.js';
import { playLassoGrabSound, playLassoFlingSound, startLassoHum, stopLassoHum, setLassoHumFrequency } from './audio.js';
import { setAsteroidVelocity } from './asteroids.js';
import { xrState, getLeftControllerRay } from './xr.js';

const LASSO_RANGE = 60;
const LASSO_ANGLE = 0.3;
const FLING_SPEED = 80;

export let lassoTarget = null;
let lassoLine = null;

const lassoLineMat = new THREE.LineBasicMaterial({
    color: 0xff00aa, transparent: true, opacity: 0.8, linewidth: 2,
});
const lassoLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(),
]);

export const lassoGlow = new THREE.PointLight(0xff00aa, 0, 8);
scene.add(lassoGlow);

// ─── Grab ─────────────────────────────────────────────────────────────────────

export function tryLassoGrab(asteroids) {
    if (state.gameOver || lassoTarget) return;

    // Use left controller ray in XR, camera ray on desktop
    const { position: origin, direction: dir } = xrState.isPresenting
        ? getLeftControllerRay()
        : (() => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return { position: camera.position.clone(), direction: d }; })();

    let bestAsteroid = null;
    let bestAngle    = LASSO_ANGLE;

    for (const a of asteroids) {
        if (!a.alive) continue;
        const toAsteroid = new THREE.Vector3().subVectors(a.mesh.position, origin);
        const dist = toAsteroid.length();
        if (dist > LASSO_RANGE) continue;
        const angle = toAsteroid.normalize().angleTo(dir);
        if (angle < bestAngle) { bestAngle = angle; bestAsteroid = a; }
    }

    if (bestAsteroid) {
        lassoTarget = bestAsteroid;
        lassoLine   = new THREE.Line(lassoLineGeo.clone(), lassoLineMat);
        scene.add(lassoLine);
        dom.lassoIndicator.style.display = 'block';
        lassoGlow.intensity = 5;
        playLassoGrabSound();
        startLassoHum();
    }
}

// ─── Release / Fling ──────────────────────────────────────────────────────────

export function releaseLasso(fling) {
    if (!lassoTarget) return;

    if (fling && lassoTarget.alive) {
        const { direction: dir } = xrState.isPresenting
            ? getLeftControllerRay()
            : (() => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return { direction: d }; })();
        const fv = dir.clone().multiplyScalar(FLING_SPEED);
        setAsteroidVelocity(lassoTarget, fv.x, fv.y, fv.z);
        lassoTarget.flung = true;
        playLassoFlingSound();
    }

    if (lassoLine) { scene.remove(lassoLine); lassoLine.geometry.dispose(); lassoLine = null; }
    lassoTarget = null;
    dom.lassoIndicator.style.display = 'none';
    lassoGlow.intensity = 0;
    stopLassoHum();
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function updateLasso(delta, asteroids) {
    // XR: read LT edge flags set by xr.js event listeners
    if (xrState.isPresenting) {
        if (xrState.leftTriggerJustPressed)  tryLassoGrab(asteroids);
        if (xrState.leftTriggerJustReleased) releaseLasso(true);
    }

    if (!lassoTarget) return;
    if (!lassoTarget.alive) { releaseLasso(false); return; }

    // Rope origin — controller in XR, camera on desktop
    const { position: origin, direction: dir } = xrState.isPresenting
        ? getLeftControllerRay()
        : (() => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return { position: camera.position.clone(), direction: d }; })();

    const targetPos = origin.clone().addScaledVector(dir, 12);
    const toTarget  = new THREE.Vector3().subVectors(
        targetPos,
        new THREE.Vector3(lassoTarget.body.position.x, lassoTarget.body.position.y, lassoTarget.body.position.z)
    );
    const pull = toTarget.multiplyScalar(8.0);
    const cv   = lassoTarget.body.velocity;
    cv.x += (pull.x - cv.x) * 0.1;
    cv.y += (pull.y - cv.y) * 0.1;
    cv.z += (pull.z - cv.z) * 0.1;
    lassoTarget.body.wakeUp();

    if (lassoLine) {
        const pos = lassoLine.geometry.attributes.position;
        pos.setXYZ(0, origin.x, origin.y - 0.3, origin.z);
        pos.setXYZ(1, lassoTarget.mesh.position.x, lassoTarget.mesh.position.y, lassoTarget.mesh.position.z);
        pos.needsUpdate = true;
    }

    lassoGlow.position.copy(lassoTarget.mesh.position);
    const dist = origin.distanceTo(lassoTarget.mesh.position);
    setLassoHumFrequency(60 + (1 - Math.min(dist / LASSO_RANGE, 1)) * 120);
    if (dist > LASSO_RANGE * 1.5) releaseLasso(false);
}
