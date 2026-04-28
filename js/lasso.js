
// Lasso grab-and-fling system

import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { state, dom } from './hud.js';
import { playLassoGrabSound, playLassoFlingSound, startLassoHum, stopLassoHum, setLassoHumFrequency } from './audio.js';
import { setAsteroidVelocity } from './asteroids.js';

const LASSO_RANGE = 60;
const LASSO_ANGLE = 0.3;  
const FLING_SPEED = 80;

export let lassoTarget = null;
let lassoLine = null;

const lassoLineMat = new THREE.LineBasicMaterial({
    color: 0xff00aa, transparent: true, opacity: 0.8, linewidth: 2
});
const lassoLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3()
]);

export const lassoGlow = new THREE.PointLight(0xff00aa, 0, 8);
scene.add(lassoGlow);

//Grabbing objects with lasso
export function tryLassoGrab(asteroids) {
    if (state.gameOver || lassoTarget) return;

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir).normalize();

    let bestAsteroid = null;
    let bestAngle = LASSO_ANGLE;

    for (const a of asteroids) {
        if (!a.alive) continue;
        const toAsteroid = new THREE.Vector3().subVectors(a.mesh.position, camera.position);
        const dist = toAsteroid.length();
        if (dist > LASSO_RANGE) continue;
        const angle = toAsteroid.normalize().angleTo(camDir);
        if (angle < bestAngle) { bestAngle = angle; bestAsteroid = a; }
    }

    if (bestAsteroid) {
        lassoTarget = bestAsteroid;
        lassoLine = new THREE.Line(lassoLineGeo.clone(), lassoLineMat);
        scene.add(lassoLine);
        dom.lassoIndicator.style.display = 'block';
        lassoGlow.intensity = 5;
        playLassoGrabSound();
        startLassoHum();
    }
}

//Releasing the lasso
export function releaseLasso(fling) {
    if (!lassoTarget) return;

    if (fling && lassoTarget.alive) {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir).normalize();
        const fv = camDir.multiplyScalar(FLING_SPEED);
        setAsteroidVelocity(lassoTarget, fv.x, fv.y, fv.z);
        lassoTarget.flung = true;
        playLassoFlingSound();
    }

    if (lassoLine) {
        scene.remove(lassoLine);
        lassoLine.geometry.dispose();
        lassoLine = null;
    }
    lassoTarget = null;
    dom.lassoIndicator.style.display = 'none';
    lassoGlow.intensity = 0;
    stopLassoHum();
}

//Updating the lasso
export function updateLasso(delta) {
    if (!lassoTarget) return;
    if (!lassoTarget.alive) { releaseLasso(false); return; }

    const camDir  = new THREE.Vector3();
    camera.getWorldDirection(camDir).normalize();
    const holdDist = 12;
    const targetPos = camera.position.clone().addScaledVector(camDir, holdDist);

    const pullStrength = 8.0;
    const toTarget = new THREE.Vector3().subVectors(targetPos, new THREE.Vector3(lassoTarget.body.position.x, lassoTarget.body.position.y, lassoTarget.body.position.z));
    const pull = toTarget.multiplyScalar(pullStrength);
    const cv = lassoTarget.body.velocity;
    cv.x += (pull.x - cv.x) * 0.1;
    cv.y += (pull.y - cv.y) * 0.1;
    cv.z += (pull.z - cv.z) * 0.1;
    lassoTarget.body.wakeUp();

    if (lassoLine) {
        const pos = lassoLine.geometry.attributes.position;
        pos.setXYZ(0, camera.position.x, camera.position.y - 0.3, camera.position.z);
        pos.setXYZ(1, lassoTarget.mesh.position.x, lassoTarget.mesh.position.y, lassoTarget.mesh.position.z);
        pos.needsUpdate = true;
    }

    lassoGlow.position.copy(new THREE.Vector3(lassoTarget.body.position.x, lassoTarget.body.position.y, lassoTarget.body.position.z));

    const dist = camera.position.distanceTo(new THREE.Vector3(lassoTarget.body.position.x, lassoTarget.body.position.y, lassoTarget.body.position.z));
    setLassoHumFrequency(60 + (1 - Math.min(dist / LASSO_RANGE, 1)) * 120);

    if (dist > LASSO_RANGE * 1.5) releaseLasso(false);
}
