// ---- Constants ----

const DISC_COLORS = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b',
    '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4'
];
const DARK_TEXT = new Set([9, 10, 11]); // amber, yellow, lime

const A = 0, B = 1, C = 2;
const MAX_DISCS = 12;

// ---- DOM ----

const canvas = document.getElementById('tower-canvas');
const ctx = canvas.getContext('2d');
const discsCountEl = document.querySelector('.discs-count-number');
const moveCounterEl = document.querySelector('.moves-count');

// ---- State ----

let moves = 0;
let selectedPeg = null;
let animQueue = [];
let currentAnim = null;
let flashState = null; // { peg, until } — red flash for invalid move

const app = {
    discs: 5,
    hanoi: [[], [], []]
};

// ---- Layout ----

function getLayout() {
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const colW = W / 3;
    const discH = Math.max(16, Math.min(22, H / 14));
    const discGap = 2;
    const baseH = 10;
    const baseY = H - 28;
    const maxDiscW = colW * 0.9;
    const pegX = [colW * 0.5, colW * 1.5, colW * 2.5];
    return { W, H, colW, discH, discGap, baseH, baseY, maxDiscW, pegX };
}

function discWidth(discId, maxW) {
    return maxW * (0.16 + discId * 0.06);
}

// Y coordinate of top edge of a disc at a given stack position (0 = bottom)
function discY(posFromBottom, layout) {
    const { baseY, discH, discGap } = layout;
    return baseY - (posFromBottom + 1) * discH - posFromBottom * discGap;
}

// ---- Canvas Setup ----

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---- Drawing Helpers ----

function rr(x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        const R = Math.min(r, w / 2, h / 2);
        ctx.moveTo(x + R, y);
        ctx.lineTo(x + w - R, y);
        ctx.arcTo(x + w, y, x + w, y + R, R);
        ctx.lineTo(x + w, y + h - R);
        ctx.arcTo(x + w, y + h, x + w - R, y + h, R);
        ctx.lineTo(x + R, y + h);
        ctx.arcTo(x, y + h, x, y + h - R, R);
        ctx.lineTo(x, y + R);
        ctx.arcTo(x, y, x + R, y, R);
        ctx.closePath();
    }
}

// ---- Draw Peg ----

function drawPeg(pegIndex, layout, highlighted) {
    const { pegX, colW, baseY, baseH, H } = layout;
    const x = pegX[pegIndex];
    const rodH = baseY;

    // Rod
    ctx.save();
    const rodGrad = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
    rodGrad.addColorStop(0, '#2a3040');
    rodGrad.addColorStop(0.5, highlighted ? '#8090a8' : '#5a6478');
    rodGrad.addColorStop(1, '#2a3040');
    ctx.fillStyle = rodGrad;
    ctx.beginPath();
    rr(x - 4, 20, 8, rodH - 20, [3, 3, 0, 0]);
    ctx.fill();

    // Base
    const bx = x - colW * 0.43;
    const bw = colW * 0.86;
    const baseGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    baseGrad.addColorStop(0, '#1a2030');
    baseGrad.addColorStop(0.5, highlighted ? '#607090' : '#4a5568');
    baseGrad.addColorStop(1, '#1a2030');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    rr(bx, baseY, bw, baseH, 4);
    ctx.fill();
    ctx.restore();

    // Label
    ctx.save();
    ctx.fillStyle = '#2d3748';
    ctx.font = '700 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '0.1em';
    ctx.fillText(['A', 'B', 'C'][pegIndex], x, baseY + baseH + 4);
    ctx.restore();
}

// ---- Draw Disc ----

function drawDisc(cx, y, discId, layout, selected) {
    const { discH, maxDiscW } = layout;
    const w = discWidth(discId, maxDiscW);
    const x = cx - w / 2;
    const color = DISC_COLORS[discId];

    ctx.save();

    if (selected) {
        ctx.shadowColor = 'rgba(255,255,255,0.35)';
        ctx.shadowBlur = 18;
    } else {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
    }

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    rr(x, y, w, discH, 4);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Top highlight
    const hi = ctx.createLinearGradient(0, y, 0, y + discH);
    hi.addColorStop(0, 'rgba(255,255,255,0.16)');
    hi.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = hi;
    ctx.beginPath();
    rr(x, y, w, discH, 4);
    ctx.fill();

    // Selection outline
    if (selected) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        rr(x - 3, y - 3, w + 6, discH + 6, 6);
        ctx.stroke();
    }

    // Number
    if (w > 16) {
        ctx.fillStyle = DARK_TEXT.has(discId) ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.92)';
        ctx.font = `600 ${Math.min(11, discH - 4)}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(discId + 1), cx, y + discH / 2);
    }

    ctx.restore();
}

// ---- Draw Target Hints ----

function drawTargetHints(layout) {
    if (selectedPeg === null) return;
    const topDiscId = app.hanoi[selectedPeg][0];

    for (let i = 0; i < 3; i++) {
        if (i === selectedPeg) continue;
        const topOfTarget = app.hanoi[i][0];
        const valid = topOfTarget === undefined || topOfTarget > topDiscId;

        ctx.save();
        ctx.fillStyle = valid
            ? 'rgba(16,185,129,0.09)'
            : 'rgba(239,68,68,0.05)';
        ctx.strokeStyle = valid
            ? 'rgba(16,185,129,0.28)'
            : 'rgba(239,68,68,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        rr(layout.colW * i + 3, 4, layout.colW - 6, layout.H - 12, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// ---- Easing & Bezier ----

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function bezier(t, p0, p1, p2) {
    const mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

function getAnimPos(anim, t) {
    const e = easeInOut(t);
    const cx = (anim.startX + anim.endX) / 2;
    const cy = 12; // apex: near top of canvas
    return {
        x: bezier(e, anim.startX, cx, anim.endX),
        y: bezier(e, anim.startY, cy, anim.endY)
    };
}

// ---- Animation Queue ----

function animMoveDuration() {
    const totalMoves = (2 ** app.discs) - 1;
    return Math.max(16, Math.min(520, Math.round(12000 / totalMoves)));
}

function startNextAnim(timestamp) {
    if (animQueue.length === 0 || currentAnim) return;
    const { from, to } = animQueue.shift();

    const discId = app.hanoi[from][0];
    const fromPos = app.hanoi[from].length - 1;
    const toPos = app.hanoi[to].length;
    const layout = getLayout();

    currentAnim = {
        discId,
        fromPeg: from,
        toPeg: to,
        startX: layout.pegX[from],
        startY: discY(fromPos, layout),
        endX: layout.pegX[to],
        endY: discY(toPos, layout),
        startTime: timestamp,
        duration: animMoveDuration(),
        t: 0
    };
}

// ---- Render Loop ----

function render(timestamp) {
    const layout = getLayout();
    ctx.clearRect(0, 0, layout.W, layout.H);

    // Advance animation
    if (currentAnim) {
        const t = Math.min((timestamp - currentAnim.startTime) / currentAnim.duration, 1);
        currentAnim.t = t;

        if (t >= 1) {
            // Commit move to state
            const disc = app.hanoi[currentAnim.fromPeg].shift();
            app.hanoi[currentAnim.toPeg].unshift(disc);
            currentAnim = null;
            incrementMoves();

            if (animQueue.length > 0) {
                startNextAnim(timestamp);
            } else {
                checkWin();
            }
        }
    } else if (animQueue.length > 0) {
        startNextAnim(timestamp);
    }

    // Flash state expired?
    if (flashState && Date.now() > flashState.until) flashState = null;

    // Draw target hints (behind pegs)
    if (selectedPeg !== null) drawTargetHints(layout);

    // Flash invalid peg
    if (flashState) {
        const i = flashState.peg;
        ctx.save();
        ctx.fillStyle = 'rgba(239,68,68,0.18)';
        ctx.beginPath();
        rr(layout.colW * i + 3, 4, layout.colW - 6, layout.H - 12, 8);
        ctx.fill();
        ctx.restore();
    }

    // Draw pegs
    for (let i = 0; i < 3; i++) drawPeg(i, layout, false);

    // Draw resting discs (skip the one in flight)
    const animDiscId = currentAnim ? currentAnim.discId : null;

    for (let peg = 0; peg < 3; peg++) {
        const stack = app.hanoi[peg];
        for (let idx = 0; idx < stack.length; idx++) {
            const discId = stack[idx];
            if (discId === animDiscId) continue;
            const posFromBottom = stack.length - 1 - idx;
            const y = discY(posFromBottom, layout);
            const isSelected = selectedPeg === peg && idx === 0;
            drawDisc(layout.pegX[peg], y, discId, layout, isSelected);
        }
    }

    // Draw animating disc on top
    if (currentAnim) {
        const { x, y } = getAnimPos(currentAnim, currentAnim.t);
        drawDisc(x, y, currentAnim.discId, layout, false);
    }

    requestAnimationFrame(render);
}

// ---- Interaction ----

function handleClick(clientX) {
    if (currentAnim) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const layout = getLayout();
    const peg = Math.floor(x / layout.colW);
    if (peg < 0 || peg > 2) return;

    if (selectedPeg === null) {
        if (app.hanoi[peg].length > 0) selectedPeg = peg;
    } else if (selectedPeg === peg) {
        selectedPeg = null;
    } else {
        const topFrom = app.hanoi[selectedPeg][0];
        const topTo = app.hanoi[peg][0];

        if (topTo !== undefined && topTo < topFrom) {
            flashState = { peg, until: Date.now() + 280 };
            selectedPeg = null;
        } else {
            // Queue animated move
            animQueue.push({ from: selectedPeg, to: peg });
            selectedPeg = null;
        }
    }
}

// ---- Game Logic ----

function addListeners() {
    canvas.addEventListener('click', e => handleClick(e.clientX));
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        handleClick(e.changedTouches[0].clientX);
    }, { passive: false });

    document.querySelector('.discs-count .up').addEventListener('click', () => setDiscs(app.discs + 1));
    document.querySelector('.discs-count .down').addEventListener('click', () => setDiscs(app.discs - 1));

    document.querySelector('.restart').addEventListener('click', () => {
        reset();
        generateTower();
        hideWin();
    });
    document.querySelector('.solve').addEventListener('click', autoSolve);
    document.querySelector('.restart-win').addEventListener('click', () => {
        hideWin();
        reset();
        generateTower();
    });

    window.addEventListener('resize', resizeCanvas);
}

function reset() {
    animQueue = [];
    currentAnim = null;
    selectedPeg = null;
    flashState = null;
    setMoves(0);
}

function generateTower() {
    const first = Array.from({ length: app.discs }, (_, i) => i);
    app.hanoi = [first, [], []];
}

function generateMoves(n, from, to, via, result) {
    if (n === 0) return;
    generateMoves(n - 1, from, via, to, result);
    result.push({ from, to });
    generateMoves(n - 1, via, to, from, result);
}

function autoSolve() {
    reset();
    hideWin();
    generateTower();
    generateMoves(app.discs, A, C, B, animQueue);
}

function setDiscs(value) {
    app.discs = Math.max(1, Math.min(MAX_DISCS, value));
    discsCountEl.innerHTML = app.discs;
    reset();
    generateTower();
    hideWin();
}

function setMoves(value) {
    moves = Math.max(0, value);
    moveCounterEl.innerHTML = moves;
}

function incrementMoves() {
    setMoves(moves + 1);
}

function checkWin() {
    if (app.hanoi[C].length === app.discs) {
        setTimeout(showWin, 350);
    }
}

function showWin() {
    document.querySelector('.win-moves').textContent = moves;
    document.querySelector('.win-overlay').classList.add('visible');
}

function hideWin() {
    document.querySelector('.win-overlay').classList.remove('visible');
}

// ---- Init ----

discsCountEl.innerHTML = app.discs;
generateTower();
addListeners();
resizeCanvas();
requestAnimationFrame(render);
