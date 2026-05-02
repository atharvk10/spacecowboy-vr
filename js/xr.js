// js/xr.js
// WebXR controller input
//
// RT  (right trigger / selectstart) → shoot laser        (held)
// LT  (left  trigger / selectstart) → lasso grab/fling   (press=grab, release=fling)
// LG  (left  grip   / squeezestart) → jetpack            (hold=up, release=fall)
// Right joystick (axes 2/3)         → move fwd/back/left/right

import * as THREE from 'three';
import { renderer, scene, camera } from './scene.js';

// ─── Exported state ───────────────────────────────────────────────────────────

export const xrState = {
    isPresenting:           false,
    rightTriggerDown:       false,   // RT held
    leftTriggerDown:        false,   // LT held
    leftTriggerJustPressed:  false,  // LT went down this frame
    leftTriggerJustReleased: false,  // LT went up this frame
    leftGripDown:           false,   // LG held
    rightStickX:            0,
    rightStickY:            0,
};

// ─── Three.js controller objects ─────────────────────────────────────────────
// Index 0/1 from getController may be either hand depending on device.
// We assign them by handedness once sources arrive, but we still need
// both indices in the scene so events fire.

const ctrl  = [renderer.xr.getController(0), renderer.xr.getController(1)];
const grip  = [renderer.xr.getControllerGrip(0), renderer.xr.getControllerGrip(1)];
ctrl.forEach(c => scene.add(c));
grip.forEach(g => scene.add(g));

// Hand references — set correctly once input sources report handedness
let ctrlR = null;   // right hand Three.js controller
let ctrlL = null;   // left  hand Three.js controller

// Controller visual boxes
function makeHandBox(color) {
    return new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 })
    );
}
// Ray pointer lines
function makeRay(color) {
    const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -25),
    ]);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }));
}

// ─── Input source tracking ────────────────────────────────────────────────────

const sources = { left: null, right: null };

function assignController(src, index) {
    const hand = src.handedness;
    if (hand === 'right') {
        sources.right = src;
        ctrlR = ctrl[index];
        // Attach visuals to the correct grip
        const g = grip[index];
        g.add(makeHandBox(0x00ffcc));
        ctrl[index].add(makeRay(0x00ffcc));
    } else if (hand === 'left') {
        sources.left = src;
        ctrlL = ctrl[index];
        const g = grip[index];
        g.add(makeHandBox(0xff00aa));
        ctrl[index].add(makeRay(0xff00aa));
    }
}

renderer.xr.addEventListener('sessionstart', () => {
    xrState.isPresenting = true;
    ctrlR = null; ctrlL = null;
    sources.left = null; sources.right = null;

    const session = renderer.xr.getSession();

    // Assign any already-connected sources
    for (let i = 0; i < session.inputSources.length; i++) {
        assignController(session.inputSources[i], i);
    }

    session.addEventListener('inputsourceschange', (e) => {
        for (const src of e.added) {
            // Find which ctrl index this source corresponds to
            const idx = [...session.inputSources].indexOf(src);
            if (idx !== -1) assignController(src, idx);
        }
        for (const src of e.removed) {
            if (src.handedness === 'left')  { sources.left  = null; ctrlL = null; }
            if (src.handedness === 'right') { sources.right = null; ctrlR = null; }
        }
    });
});

renderer.xr.addEventListener('sessionend', () => {
    Object.assign(xrState, {
        isPresenting: false,
        rightTriggerDown: false,
        leftTriggerDown: false,
        leftTriggerJustPressed: false,
        leftTriggerJustReleased: false,
        leftGripDown: false,
        rightStickX: 0,
        rightStickY: 0,
    });
    sources.left = null; sources.right = null;
    ctrlR = null; ctrlL = null;
});

// ─── Button events (fire on either controller index; filter by handedness) ────

function onSelect(src, down) {
    if (!src) return;
    if (src.handedness === 'right') {
        xrState.rightTriggerDown = down;
    } else if (src.handedness === 'left') {
        xrState.leftTriggerDown = down;
        if (down)  xrState.leftTriggerJustPressed  = true;
        if (!down) xrState.leftTriggerJustReleased = true;
    }
}

function onSqueeze(src, down) {
    if (!src) return;
    if (src.handedness === 'left') xrState.leftGripDown = down;
}

// Wire both controller slots — the correct one will match handedness
for (let i = 0; i < 2; i++) {
    const idx = i;
    ctrl[idx].addEventListener('selectstart',  () => {
        const session = renderer.xr.getSession();
        if (session) onSelect(session.inputSources[idx], true);
    });
    ctrl[idx].addEventListener('selectend', () => {
        const session = renderer.xr.getSession();
        if (session) onSelect(session.inputSources[idx], false);
    });
    ctrl[idx].addEventListener('squeezestart', () => {
        const session = renderer.xr.getSession();
        if (session) onSqueeze(session.inputSources[idx], true);
    });
    ctrl[idx].addEventListener('squeezeend', () => {
        const session = renderer.xr.getSession();
        if (session) onSqueeze(session.inputSources[idx], false);
    });
}

// ─── Axis polling — call once per frame AFTER lasso reads edge flags ──────────

export function pollXRAxes() {
    if (!xrState.isPresenting) return;

    // Right stick: axes[2]=X, axes[3]=Y on Quest/Index
    const r = sources.right;
    if (r?.gamepad?.axes?.length >= 4) {
        xrState.rightStickX = Math.abs(r.gamepad.axes[2]) > 0.12 ? r.gamepad.axes[2] : 0;
        xrState.rightStickY = Math.abs(r.gamepad.axes[3]) > 0.12 ? r.gamepad.axes[3] : 0;
    } else {
        xrState.rightStickX = 0;
        xrState.rightStickY = 0;
    }

    // Clear one-frame edge flags AFTER game logic has read them
    xrState.leftTriggerJustPressed  = false;
    xrState.leftTriggerJustReleased = false;
}

// ─── Controller ray helpers ───────────────────────────────────────────────────

const _pos  = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _dir  = new THREE.Vector3();

export function getRightControllerRay() {
    if (!xrState.isPresenting || !ctrlR) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        return { position: camera.position.clone(), direction: dir };
    }
    ctrlR.getWorldPosition(_pos);
    ctrlR.getWorldQuaternion(_quat);
    _dir.set(0, 0, -1).applyQuaternion(_quat);
    return { position: _pos.clone(), direction: _dir.clone() };
}

export function getLeftControllerRay() {
    if (!xrState.isPresenting || !ctrlL) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        return { position: camera.position.clone(), direction: dir };
    }
    ctrlL.getWorldPosition(_pos);
    ctrlL.getWorldQuaternion(_quat);
    _dir.set(0, 0, -1).applyQuaternion(_quat);
    return { position: _pos.clone(), direction: _dir.clone() };
}
