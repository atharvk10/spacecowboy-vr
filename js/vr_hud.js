// VR HUD — 3D canvas-textured panels that float in world space.

import * as THREE from 'three';
import { scene, camera } from './scene.js';

function makeCanvasTexture(w, h) {
    const canvas  = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx     = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    return { canvas, ctx, texture };
}

function makePanelMesh(texture, worldW, worldH) {
    const geo = new THREE.PlaneGeometry(worldW, worldH);
    const mat = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
}

const HUD_W = 512, HUD_H = 160;
const { ctx: hudCtx, texture: hudTex } = makeCanvasTexture(HUD_W, HUD_H);
const hudMesh = makePanelMesh(hudTex, 0.9, 0.28);
hudMesh.renderOrder = 999;
hudMesh.visible = false;
scene.add(hudMesh);

function drawHUDPanel(lives, score) {
    hudCtx.clearRect(0, 0, HUD_W, HUD_H);

    hudCtx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(hudCtx, 4, 4, HUD_W - 8, HUD_H - 8, 18);
    hudCtx.fill();

    hudCtx.font      = 'bold 58px Arial';
    hudCtx.fillStyle = '#ff4444';
    hudCtx.shadowColor = 'rgba(255,60,60,0.9)';
    hudCtx.shadowBlur  = 14;
    hudCtx.fillText('❤ '.repeat(Math.max(0, lives)), 20, 78);

    hudCtx.font        = 'bold 36px "Courier New", monospace';
    hudCtx.fillStyle   = '#00aaff';
    hudCtx.shadowColor = 'rgba(0,150,255,0.8)';
    hudCtx.shadowBlur  = 10;
    hudCtx.fillText('SCORE: ' + Math.floor(score), 20, 130);

    hudCtx.shadowBlur  = 0;
    hudTex.needsUpdate = true;
}

const SS_W = 768, SS_H = 420;
const { ctx: ssCtx, texture: ssTex } = makeCanvasTexture(SS_W, SS_H);
const ssMesh = makePanelMesh(ssTex, 1.5, 0.82);
ssMesh.renderOrder = 1000;
ssMesh.visible = false;
scene.add(ssMesh);

function drawStartScreen() {
    ssCtx.clearRect(0, 0, SS_W, SS_H);

    ssCtx.fillStyle = 'rgba(0,0,20,0.92)';
    roundRect(ssCtx, 4, 4, SS_W - 8, SS_H - 8, 24);
    ssCtx.fill();

    ssCtx.strokeStyle = 'rgba(0,200,255,0.7)';
    ssCtx.lineWidth   = 4;
    roundRect(ssCtx, 4, 4, SS_W - 8, SS_H - 8, 24);
    ssCtx.stroke();

    ssCtx.textAlign = 'center';

    ssCtx.font        = 'bold 82px Arial';
    ssCtx.fillStyle   = '#00eeff';
    ssCtx.shadowColor = 'rgba(0,220,255,0.95)';
    ssCtx.shadowBlur  = 24;
    ssCtx.fillText('SPACE VOYAGE', SS_W / 2, 100);

    ssCtx.font        = '30px Arial';
    ssCtx.fillStyle   = '#aaaacc';
    ssCtx.shadowBlur  = 0;
    ssCtx.fillText('Survive the asteroid field!', SS_W / 2, 150);

    ssCtx.font        = 'bold 28px "Courier New", monospace';
    ssCtx.fillStyle   = '#00ffcc';
    ssCtx.shadowColor = 'rgba(0,255,180,0.7)';
    ssCtx.shadowBlur  = 8;
    ssCtx.fillText('LEFT GRIP  →  shoot', SS_W / 2, 220);
    ssCtx.fillText('RIGHT GRIP →  lasso & fling', SS_W / 2, 260);

    ssCtx.font        = 'bold 36px Arial';
    ssCtx.fillStyle   = '#ffffff';
    ssCtx.shadowColor = 'rgba(255,255,255,0.9)';
    ssCtx.shadowBlur  = 16;
    ssCtx.fillText('Squeeze RIGHT GRIP to start', SS_W / 2, 350);

    ssCtx.textAlign   = 'left';
    ssCtx.shadowBlur  = 0;
    ssTex.needsUpdate = true;
}

const GO_W = 768, GO_H = 384;
const { ctx: goCtx, texture: goTex } = makeCanvasTexture(GO_W, GO_H);
const goMesh = makePanelMesh(goTex, 1.4, 0.7);
goMesh.renderOrder = 1000;
goMesh.visible = false;
scene.add(goMesh);

function drawGameOverPanel(finalScore) {
    goCtx.clearRect(0, 0, GO_W, GO_H);

    goCtx.fillStyle = 'rgba(0,0,0,0.88)';
    roundRect(goCtx, 4, 4, GO_W - 8, GO_H - 8, 24);
    goCtx.fill();

    goCtx.strokeStyle = 'rgba(255,30,30,0.8)';
    goCtx.lineWidth   = 4;
    roundRect(goCtx, 4, 4, GO_W - 8, GO_H - 8, 24);
    goCtx.stroke();

    goCtx.textAlign = 'center';

    goCtx.font        = 'bold 80px Arial';
    goCtx.fillStyle   = '#ff3333';
    goCtx.shadowColor = 'rgba(255,0,0,0.9)';
    goCtx.shadowBlur  = 22;
    goCtx.fillText('SHIP DESTROYED', GO_W / 2, 110);

    goCtx.font        = 'bold 48px "Courier New", monospace';
    goCtx.fillStyle   = '#00aaff';
    goCtx.shadowColor = 'rgba(0,150,255,0.8)';
    goCtx.shadowBlur  = 14;
    goCtx.fillText('FINAL SCORE: ' + Math.floor(finalScore), GO_W / 2, 200);

    goCtx.textAlign   = 'left';
    goTex.needsUpdate = true;
}

const HUD_OFFSET   = new THREE.Vector3(-0.38,  0.18, -0.9);
const CENTER_OFFSET = new THREE.Vector3( 0,     0,   -1.1);

const _q     = new THREE.Quaternion();
const _fwd   = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up    = new THREE.Vector3();

function positionPanel(mesh, offset) {
    camera.getWorldQuaternion(_q);
    _fwd.set(0, 0, -1).applyQuaternion(_q);
    _right.set(1, 0, 0).applyQuaternion(_q);
    _up.set(0, 1, 0).applyQuaternion(_q);

    mesh.position.copy(camera.position)
        .addScaledVector(_fwd,   -offset.z)
        .addScaledVector(_right,  offset.x)
        .addScaledVector(_up,     offset.y);

    mesh.quaternion.copy(_q);
}


export function updateVRHUD(lives, score) {
    drawHUDPanel(lives, score);
}

export function setVRHUDVisible(visible) {
    hudMesh.visible = visible;
}

export function showVRStartScreen() {
    drawStartScreen();
    ssMesh.visible = true;
}

export function hideVRStartScreen() {
    ssMesh.visible = false;
}

export function showVRGameOver(finalScore) {
    drawGameOverPanel(finalScore);
    goMesh.visible = true;
}

export function hideVRGameOver() {
    goMesh.visible = false;
}

export function updateVRHUDPosition() {
    if (hudMesh.visible) positionPanel(hudMesh, HUD_OFFSET);
    if (ssMesh.visible)  positionPanel(ssMesh,  CENTER_OFFSET);
    if (goMesh.visible)  positionPanel(goMesh,  CENTER_OFFSET);
}


