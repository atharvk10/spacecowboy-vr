// HUD rendering, game state, and game-over logic

export const state = {
    lives: 5,
    score: 0,
    gameOver: false,
    invincible: false,
    invincibleTimer: 0,
};

export const INVINCIBLE_DURATION = 2.0;

export const dom = {
    blocker: document.getElementById('blocker'),
    crosshair: document.getElementById('crosshair'),
    hud: document.getElementById('hud'),
    lives: document.getElementById('lives'),
    score: document.getElementById('score'),
    damageFlash: document.getElementById('damage-flash'),
    gameOver: document.getElementById('game-over'),
    lassoIndicator: document.getElementById('lasso-indicator'),
    jetpackBarWrap: document.getElementById('jetpack-bar-wrap'),
    jetpackBar: document.getElementById('jetpack-bar'),
    jetpackLabel: document.getElementById('jetpack-label'),
};

let _getJetpackFuel = () => 100;
let _getJetpackMax  = () => 100;
export function registerJetpackFuelGetter(getFuel, getMax) {
    _getJetpackFuel = getFuel;
    _getJetpackMax  = getMax;
}

export function updateHUD() {
    dom.lives.textContent = '\u2764 '.repeat(state.lives);
    dom.score.textContent = 'SCORE: ' + Math.floor(state.score);
    dom.jetpackBar.style.width = Math.floor(_getJetpackFuel() / _getJetpackMax() * 100) + '%';
}

export function showGameHUD(show) {
    const d = show ? 'block' : 'none';
    const df = show ? 'flex'  : 'none';
    dom.hud.style.display = df;
    dom.crosshair.style.display = d;
    dom.jetpackBarWrap.style.display = d;
    dom.jetpackLabel.style.display = d;
}

export function showGameOver(finalScore) {
    state.gameOver = true;
    dom.crosshair.style.display = 'none';
    dom.hud.style.display = 'none';
    dom.jetpackBarWrap.style.display = 'none';
    dom.jetpackLabel.style.display = 'none';
    dom.lassoIndicator.style.display = 'none';
    dom.gameOver.style.display = 'flex';
    dom.gameOver.querySelector('.final-score').textContent = 'FINAL SCORE: ' + Math.floor(finalScore);
}

export function triggerDamageFlash() {
    dom.damageFlash.style.background = 'rgba(255,0,0,0.5)';
    setTimeout(() => { dom.damageFlash.style.background = 'rgba(255,0,0,0.2)'; }, 80);
    setTimeout(() => { dom.damageFlash.style.background = 'rgba(255,0,0,0)';   }, 250);
}
