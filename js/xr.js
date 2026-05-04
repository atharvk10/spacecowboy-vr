// js/xr.js
// WebXR controller input — modelled on the Three.js dragging lab example.
//
// Uses XRControllerModelFactory for real controller visuals (Quest/Index/etc.)
// Events are wired directly on controller objects (event.target = controller),
// which is the correct Three.js XR pattern. No session.inputSources[idx] lookup.
//
// Controls:
//   RT  (right selectstart/end)   → shoot laser (held)
//   LT  (left  selectstart/end)   → lasso grab on press, fling on release
//   LG  (left  squeezestart/end)  → jetpack thrust
//   Right joystick (axes 2/3)     → move forward/back/left/right

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { renderer, scene, camera } from './scene.js';

// ─── Exported state (read every frame by player, weapons, lasso) ──────────────

export const xrState = {
    isPresenting:            false,
    rightTriggerDown:        false,
    leftTriggerDown:         false,
    leftTriggerJustPressed:  false,   // true for exactly one frame
    leftTriggerJustReleased: false,   // true for exactly one frame
    leftGripDown:            false,
    rightStickX:             0,
    rightStickY:             0,
};

// ─── Controller objects ───────────────────────────────────────────────────────

const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1);
scene.add(controller2);

// Grip spaces — this is where the controller model attaches
const controllerGrip1 = renderer.xr.getControllerGrip(0);
const controllerGrip2 = renderer.xr.getControllerGrip(1);
scene.add(controllerGrip1);
scene.add(controllerGrip2);

// Real controller models (Quest controllers, Index, etc.)
const controllerModelFactory = new XRControllerModelFactory();
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));

// Laser pointer lines — same technique as the lab example
const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
]);
const line1 = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 }));
line1.name = 'line'; line1.scale.z = 10;
const line2 = new THREE.Line(lineGeometry.clone(), new THREE.LineBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.5 }));
line2.name = 'line'; line2.scale.z = 10;
controller1.add(line1);
controller2.add(line2);

// ─── Handedness tracking ──────────────────────────────────────────────────────
// We track which Three.js controller object is left/right so ray helpers work.

let ctrlRight = null;
let ctrlLeft  = null;

// Sources for gamepad axis polling
const sources = { left: null, right: null };

// ─── Session events ───────────────────────────────────────────────────────────

renderer.xr.addEventListener('sessionstart', () => {
    xrState.isPresenting = true;
    ctrlRight = null; ctrlLeft = null;
    sources.left = null; sources.right = null;

    const session = renderer.xr.getSession();
    session.addEventListener('inputsourceschange', onInputSourcesChange);

    // Handle sources that may already exist when session starts
    if (session.inputSources.length > 0) {
        onInputSourcesChange({ added: [...session.inputSources], removed: [] });
    }
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
    ctrlRight = null; ctrlLeft = null;
    sources.left = null; sources.right = null;
});

function onInputSourcesChange(e) {
    for (const src of e.added) {
        if (src.handedness === 'right') {
            sources.right = src;
            // Figure out which Three.js controller this source maps to
            // by checking renderer.xr.getSession().inputSources order
            const session = renderer.xr.getSession();
            const idx = [...session.inputSources].indexOf(src);
            ctrlRight = idx === 0 ? controller1 : controller2;
        }
        if (src.handedness === 'left') {
            sources.left = src;
            const session = renderer.xr.getSession();
            const idx = [...session.inputSources].indexOf(src);
            ctrlLeft = idx === 0 ? controller1 : controller2;
        }
    }
    for (const src of e.removed) {
        if (src.handedness === 'right') { sources.right = null; ctrlRight = null; }
        if (src.handedness === 'left')  { sources.left  = null; ctrlLeft  = null; }
    }
}

// ─── Button events — wired directly on controller objects (lab pattern) ───────
// event.target IS the controller object, so we check which one it is.

function getHandedness(controller) {
    if (controller === ctrlRight) return 'right';
    if (controller === ctrlLeft)  return 'left';
    // Fallback: check the source directly
    if (sources.right && (controller === controller1 || controller === controller2)) {
        const session = renderer.xr.getSession();
        if (!session) return 'unknown';
        for (const src of session.inputSources) {
            const idx = [...session.inputSources].indexOf(src);
            const ctrl = idx === 0 ? controller1 : controller2;
            if (ctrl === controller) return src.handedness;
        }
    }
    return 'unknown';
}

function onSelectStart(event) {
    const hand = getHandedness(event.target);
    if (hand === 'right') {
        xrState.rightTriggerDown = true;
    } else if (hand === 'left') {
        xrState.leftTriggerDown        = true;
        xrState.leftTriggerJustPressed = true;
    }
}

function onSelectEnd(event) {
    const hand = getHandedness(event.target);
    if (hand === 'right') {
        xrState.rightTriggerDown = false;
    } else if (hand === 'left') {
        xrState.leftTriggerDown          = false;
        xrState.leftTriggerJustReleased  = true;
    }
}

function onSqueezeStart(event) {
    const hand = getHandedness(event.target);
    if (hand === 'left') xrState.leftGripDown = true;
}

function onSqueezeEnd(event) {
    const hand = getHandedness(event.target);
    if (hand === 'left') xrState.leftGripDown = false;
}

controller1.addEventListener('selectstart',  onSelectStart);
controller1.addEventListener('selectend',    onSelectEnd);
controller1.addEventListener('squeezestart', onSqueezeStart);
controller1.addEventListener('squeezeend',   onSqueezeEnd);

controller2.addEventListener('selectstart',  onSelectStart);
controller2.addEventListener('selectend',    onSelectEnd);
controller2.addEventListener('squeezestart', onSqueezeStart);
controller2.addEventListener('squeezeend',   onSqueezeEnd);

// ─── Axis polling — call once per frame AFTER all game logic reads edge flags ──

export function pollXRAxes() {
    if (!xrState.isPresenting) return;

    const r = sources.right;
    if (r?.gamepad?.axes?.length >= 4) {
        // axes[2] = right stick X, axes[3] = right stick Y on Quest/Index
        xrState.rightStickX = Math.abs(r.gamepad.axes[2]) > 0.12 ? r.gamepad.axes[2] : 0;
        xrState.rightStickY = Math.abs(r.gamepad.axes[3]) > 0.12 ? r.gamepad.axes[3] : 0;
    } else {
        xrState.rightStickX = 0;
        xrState.rightStickY = 0;
    }

    // Clear one-frame edge flags after game logic has consumed them
    xrState.leftTriggerJustPressed  = false;
    xrState.leftTriggerJustReleased = false;
}

// ─── Controller ray helpers ───────────────────────────────────────────────────

const _pos  = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _dir  = new THREE.Vector3();

export function getRightControllerRay() {
    if (!xrState.isPresenting || !ctrlRight) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        return { position: camera.position.clone(), direction: dir };
    }
    ctrlRight.getWorldPosition(_pos);
    ctrlRight.getWorldQuaternion(_quat);
    _dir.set(0, 0, -1).applyQuaternion(_quat);
    return { position: _pos.clone(), direction: _dir.clone() };
}

export function getLeftControllerRay() {
    if (!xrState.isPresenting || !ctrlLeft) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        return { position: camera.position.clone(), direction: dir };
    }
    ctrlLeft.getWorldPosition(_pos);
    ctrlLeft.getWorldQuaternion(_quat);
    _dir.set(0, 0, -1).applyQuaternion(_quat);
    return { position: _pos.clone(), direction: _dir.clone() };
}