// All Web Audio API sound effects

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function ensureAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function playBlasterSound() {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

export function playLassoGrabSound() {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

export function playLassoFlingSound() {
    ensureAudio();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.start(); osc.stop(audioCtx.currentTime + 0.25);
}

let lassoHumOsc  = null;
let lassoHumGain = null;

export function startLassoHum() {
    ensureAudio();
    lassoHumOsc  = audioCtx.createOscillator();
    lassoHumGain = audioCtx.createGain();
    lassoHumOsc.connect(lassoHumGain); lassoHumGain.connect(audioCtx.destination);
    lassoHumOsc.type = 'sine';
    lassoHumOsc.frequency.value = 80;
    lassoHumGain.gain.value = 0.06;
    lassoHumOsc.start();
}

export function stopLassoHum() {
    if (lassoHumOsc) { lassoHumOsc.stop(); lassoHumOsc = null; lassoHumGain = null; }
}

export function setLassoHumFrequency(freq) {
    if (lassoHumOsc) lassoHumOsc.frequency.value = freq;
}
