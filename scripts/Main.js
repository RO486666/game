/***********************************************************************
 * 1. GLOBALE KONSTANTEN, PUFFER & INITIALISIERUNG
 ***********************************************************************/
let GRID_W = 650;
let GRID_H = 650;
let TOTAL_CELLS = GRID_W * GRID_H;

const TERRAIN_WATER = 0;
const TERRAIN_LAND = 1;
const TERRAIN_MOUNTAIN = 2;
const TERRAIN_ICE = 3;

const OWNER_WATER = -1;
const OWNER_MOUNTAIN = -2;
const OWNER_NEUTRAL = 0;
const OWNER_PLAYER = 1;

const BOT_NAMES = [
    "Preußen", "Bavaria", "Sachsen", "Hanse", "Helvetia",
    "Habsburg", "Burgund", "Nordmark", "Westfalen", "Schwaben",
    "Thüringen", "Friesland", "Lothringen", "Brandenburg", "Pfalz",
    "Pommern", "Schlesien", "Tirol", "Baden", "Kurland",
    "Flandern", "Normandie", "Böhmen", "Mähren", "Savoyen",
    "Gothia", "Vandalia", "Franken", "Holstein", "Mecklenburg",
    "Nassau", "Oldenburg", "Anhalt", "Lippe", "Waldeck",
    "Kärnten", "Steiermark", "Salzburg", "Vorarlberg", "Krainer",
    "Geldern", "Kleve", "Jülich", "Berg", "Ravensberg",
    "Ostfriesland", "Lüneburg", "Calenberg", "Grubenhagen", "Verden",
    "Bremen", "Lübeck", "Danzig", "Riga", "Reval",
    "Dorpat", "Ösel", "Gotland", "Bornholm", "Rügen",
    "Usedom", "Wollin", "Stettin", "Kolberg", "Köslin",
    "Marienburg", "Elbing", "Königsberg", "Memel", "Tilsit",
    "Allenstein", "Gumbinnen", "Lausitz", "Glatz", "Troppau"
];

const PALETTE = [
    { name: "Eisblau", rgb: [14, 165, 233] },
    { name: "Smaragd", rgb: [16, 185, 129] },
    { name: "Karmesin", rgb: [239, 68, 68] },
    { name: "Goldgelb", rgb: [245, 158, 11] },
    { name: "Violett", rgb: [168, 85, 247] },
    { name: "Pink", rgb: [236, 72, 153] },
    { name: "Limette", rgb: [132, 204, 22] },
    { name: "Orange", rgb: [249, 115, 22] },
    { name: "Türkis", rgb: [6, 182, 212] },
    { name: "Indigo", rgb: [99, 102, 241] },
    { name: "Koralle", rgb: [244, 63, 94] },
    { name: "Apfelgrün", rgb: [34, 197, 94] }
];

// Grid-Puffer
let terrainGrid = new Uint8Array(TOTAL_CELLS);
let elevationGrid = new Float32Array(TOTAL_CELLS);
let ownerGrid = new Int16Array(TOTAL_CELLS);
let borderMask = new Uint8Array(TOTAL_CELLS);

let baseR = new Uint8Array(TOTAL_CELLS);
let baseG = new Uint8Array(TOTAL_CELLS);
let baseB = new Uint8Array(TOTAL_CELLS);

// POI-System (Strategische Knotenpunkte: Hauptstädte, Minen, Häfen)
let mapPOIs = [];

// Jahreszeiten-System (Wetter- & Geländebeeinflussung)
const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
let currentSeasonIdx = 0;
let currentSeason = SEASONS[0];

// Offscreen-Buffer für HD-Pixelrendering
const mapCanvas = document.createElement('canvas');
const mapCtx = mapCanvas.getContext('2d');
let mapImageData = null;
let pixelBuffer = null;

// Haupt-Viewport
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
let viewW = window.innerWidth;
let viewH = window.innerHeight;

// Kamera & Steuerung
let camX = GRID_W / 2;
let camY = GRID_H / 2;
let camZoom = 1.0;
let targetCamX = null;
let targetCamY = null;
let targetCamZoom = null;

let appPhase = 'MENU';
let selectedColorIdx = 0;
let selectedSpawnPoint = null;
let visualEffects = [];

let gameSpeed = 1;
let totalLandCells = 0;
let factions = [];
let activeAttacks = [];
let mapDirty = true;

const CYCLE_DURATION_TICKS = 100;
let currentCycleTick = 0;
let cycleCount = 1;
let tickAccumulator = 0;

const DIR4_X = [0, 1, 0, -1];
const DIR4_Y = [-1, 0, 1, 0];

/***********************************************************************
 * SPEICHER-ALLOKATION & SYNCHRONISATION FÜR GROSSE KARTEN
 ***********************************************************************/
function allocateMapBuffers(size) {
    GRID_W = size;
    GRID_H = size;
    TOTAL_CELLS = GRID_W * GRID_H;

    // 1. Typed-Arrays vollständig neu zuweisen
    terrainGrid = new Uint8Array(TOTAL_CELLS);
    elevationGrid = new Float32Array(TOTAL_CELLS);
    ownerGrid = new Int16Array(TOTAL_CELLS);
    borderMask = new Uint8Array(TOTAL_CELLS);

    baseR = new Uint8Array(TOTAL_CELLS);
    baseG = new Uint8Array(TOTAL_CELLS);
    baseB = new Uint8Array(TOTAL_CELLS);

    // 2. POIs und Jahreszeiten zurücksetzen
    mapPOIs = [];
    currentSeasonIdx = 0;
    currentSeason = SEASONS[0];

    // 3. Offscreen Canvas auf exakte Dimension anpassen
    mapCanvas.width = GRID_W;
    mapCanvas.height = GRID_H;
    mapImageData = mapCtx.createImageData(GRID_W, GRID_H);
    pixelBuffer = new Uint32Array(mapImageData.data.buffer);

    // 4. Mini-Vorschau-Canvas synchronisieren
    const pCanvas = document.getElementById('previewCanvas');
    if (pCanvas) {
        pCanvas.width = GRID_W;
        pCanvas.height = GRID_H;
    }

    // 5. Kamera-Fokus zentrieren
    camX = GRID_W / 2;
    camY = GRID_H / 2;
}

function packRGBA(r, g, b, a = 255) {
    return (a << 24) | (b << 16) | (g << 8) | r;
}

function formatNumber(num) {
    num = Math.floor(num);
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 10000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString('de-DE');
}

function addVisualEffect(gridX, gridY, text, color = '#38bdf8', icon = '⚔️') {
    visualEffects.push({
        x: gridX + 0.5,
        y: gridY + 0.5,
        text,
        icon,
        color,
        age: 0,
        maxAge: 44
    });
}

/***********************************************************************
 * FAST PERLIN & FRACTAL NOISE ENGINE
 ***********************************************************************/
const perm = new Uint8Array(512);

function initNoiseSeed(seedStr) {
    let h = 2166136261 >>> 0;
    const str = String(seedStr || '849204');
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
        const j = (h >>> 0) % (i + 1);
        const tmp = p[i];
        p[i] = p[j];
        p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}

function fastNoise2D(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;

    const u = xf * xf * (3.0 - 2.0 * xf);
    const v = yf * yf * (3.0 - 2.0 * yf);

    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];

    const top = aa + u * (ba - aa);
    const bot = ab + u * (bb - ab);
    return (top + v * (bot - top)) * (1.0 / 255.0);
}

function fbmFast(x, y, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
        val += amp * fastNoise2D(x * freq, y * freq);
        norm += amp;
        freq *= 2.03;
        amp *= 0.5;
    }
    return val / norm;
}

function ridgedNoise(x, y, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
        let n = fastNoise2D(x * freq + 51.7, y * freq + 93.1);
        n = 1.0 - Math.abs(n * 2.0 - 1.0);
        val += amp * (n * n);
        norm += amp;
        freq *= 2.1;
        amp *= 0.5;
    }
    return val / norm;
}

/***********************************************************************
 * DYNAMISCHES AUDIO-SYSTEM (WEB AUDIO API OHNE EXTERNE DATEIEN)
 ***********************************************************************/
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// 1. Klick / Marschbefehl (kurzer perkussiver Ton)
function playSoundAttack() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

// 2. Eroberung / Front-Tickern (hohes kurzes Geräusch)
let lastCaptureSoundTime = 0;
function playSoundCapture() {
    if (!audioCtx) return;
    const now = performance.now();
    if (now - lastCaptureSoundTime < 45) return;
    lastCaptureSoundTime = now;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 + Math.random() * 80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(260, audioCtx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
}

// 3. Burg / Hauptstadt gefallen (wuchtiger Bass-Schlag)
function playSoundCapitalFall() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
}

/***********************************************************************
 * HAUPTSCHLEIFE & ENGINE-START
 ***********************************************************************/
let lastFrameTime = performance.now();
const TICK_INTERVAL_MS = 50;

function gameLoop(now) {
    const dt = now - lastFrameTime;
    lastFrameTime = now;

    if (appPhase === 'PLAYING') {
        tickAccumulator += dt * gameSpeed;
        let maxSteps = 5;
        while (tickAccumulator >= TICK_INTERVAL_MS && maxSteps > 0) {
            processGameTick();
            tickAccumulator -= TICK_INTERVAL_MS;
            maxSteps--;
        }
    }

    renderFrame(now);
    requestAnimationFrame(gameLoop);
}

window.onload = function () {
    const cfgSize = parseInt(document.getElementById('genMapSize')?.value, 10) || 650;
    allocateMapBuffers(cfgSize);
    initColorPicker();
    syncGeneratorLabels();
    resizeViewportCanvas();
    generateWorldFromUI();
    setPhase('MENU');
    requestAnimationFrame(gameLoop);
};