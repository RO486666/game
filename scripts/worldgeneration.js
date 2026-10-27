/***********************************************************************
 * 2. PROZEDURALER WELTGENERATOR (TEKTONIK, FLÜSSE, 3D-RELIEF & BIOME)
 ***********************************************************************/

function getGeneratorConfig() {
    const size = parseInt(document.getElementById('genMapSize')?.value, 10) || 650;
    const preset = document.getElementById('menuMapType')?.value || 'with_water';
    const seed = document.getElementById('genSeedInput')?.value.trim() || '849204';
    
    // Geometrie & Tektonik
    const waterPct = parseInt(document.getElementById('genWaterLevel')?.value, 10) || 48;
    const scaleVal = parseInt(document.getElementById('genContinentScale')?.value, 10) || 55;
    const plateCount = parseInt(document.getElementById('genPlateCount')?.value, 10) || 5;
    const warpVal = parseInt(document.getElementById('genWarpIntensity')?.value, 10) || 50;
    const octaves = parseInt(document.getElementById('genCoastDetail')?.value, 10) || 5;
    const islandVal = parseInt(document.getElementById('genIslands')?.value, 10) || 45;

    // Relief, Erosion & Flussläufe
    const mountainVal = parseInt(document.getElementById('genMountains')?.value, 10) || 50;
    const riverVal = parseInt(document.getElementById('genRivers')?.value, 10) || 40;

    // Globale Klimaverschiebung
    const tempShift = parseInt(document.getElementById('genTemperature')?.value, 10) || 0;
    const moistShift = parseInt(document.getElementById('genMoisture')?.value, 10) || 0;

    return { 
        size, preset, seed, 
        waterPct, scaleVal, plateCount, warpVal, octaves, islandVal, 
        mountainVal, riverVal, tempShift, moistShift 
    };
}

function applyPresetDefaults(preset) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    if (preset === 'no_water') {
        setVal('genWaterLevel', 4);
        setVal('genContinentScale', 85);
        setVal('genPlateCount', 3);
        setVal('genWarpIntensity', 35);
        setVal('genCoastDetail', 4);
        setVal('genIslands', 10);
        setVal('genMountains', 30);
        setVal('genRivers', 10);
    } else {
        setVal('genWaterLevel', 48);
        setVal('genContinentScale', 55);
        setVal('genPlateCount', 5);
        setVal('genWarpIntensity', 50);
        setVal('genCoastDetail', 5);
        setVal('genIslands', 45);
        setVal('genMountains', 50);
        setVal('genRivers', 40);
    }
    setVal('genTemperature', 0);
    setVal('genMoisture', 0);
    syncGeneratorLabels();
}

// Deterministischer Pseudo-Zufallsgenerator für Kontinentalplatten & Flüsse
function createSeededRNG(seedStr) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
    }
    return function() {
        h += h << 13; h ^= h >>> 7;
        h += h << 3;  h ^= h >>> 17;
        h += h << 5;
        return (h >>> 0) / 4294967296;
    };
}

function generateWorldFromUI() {
    const cfg = getGeneratorConfig();

    if (GRID_W !== cfg.size || GRID_H !== cfg.size) {
        allocateMapBuffers(cfg.size);
    }

    initNoiseSeed(cfg.seed);
    const rng = createSeededRNG(cfg.seed);

    totalLandCells = 0;
    selectedSpawnPoint = null;

    // -------------------------------------------------------------------
    // 1. TEKTONISCHE KONTINENT-KERNE AUSWÜRFELN
    // -------------------------------------------------------------------
    const baseFreq = 0.0011 + ((100 - cfg.scaleVal) / 100) * 0.0042;
    const plates = [];

    for (let i = 0; i < cfg.plateCount; i++) {
        const angle = rng() * Math.PI * 2;
        const dist = rng() * 0.54;
        plates.push({
            cx: 0.5 + Math.cos(angle) * dist * 0.72,
            cy: 0.5 + Math.sin(angle) * dist * 0.72,
            radius: (0.18 + rng() * 0.28) * (0.65 + (cfg.scaleVal / 100) * 0.75),
            weight: 0.75 + rng() * 0.5,
            stretchX: 0.7 + rng() * 0.6,
            stretchY: 0.7 + rng() * 0.6
        });
    }

    // Zufallsvektoren für diesen Seed
    const ox1 = rng() * 500, oy1 = rng() * 500;
    const ox2 = rng() * 500, oy2 = rng() * 500;
    const ox3 = rng() * 500, oy3 = rng() * 500;

    // Meeresspiegel & Gebirge
    const seaLevelThreshold = cfg.preset === 'no_water'
        ? -0.68
        : -0.28 + (cfg.waterPct / 100) * 0.68;

    const mountainFactor = cfg.mountainVal / 100;
    const mountainMinHeight = 0.52 - (mountainFactor * 0.24);

    // Warp-Intensität skaliert über den Slider
    const warpMult = cfg.warpVal / 50;
    const warpAmp1 = (32.0 + cfg.octaves * 8.0) * warpMult;
    const warpAmp2 = (16.0 + cfg.octaves * 4.0) * warpMult;

    const islandDensity = (cfg.islandVal / 100) * 0.65;
    const riverStrength = cfg.riverVal / 100;

    for (let y = 0; y < GRID_H; y++) {
        const rowOffset = y * GRID_W;
        const ny = y / GRID_H;         // 0.0 bis 1.0
        const cy = (ny - 0.5) * 2.0;   // -1.0 bis +1.0

        for (let x = 0; x < GRID_W; x++) {
            const idx = rowOffset + x;
            const nx = x / GRID_W;       // 0.0 bis 1.0
            const cx = (nx - 0.5) * 2.0; // -1.0 bis +1.0

            // -----------------------------------------------------------
            // 2. DREISTUFIGES DOMAIN WARPING (Fjorde & Meeresbuchten)
            // -----------------------------------------------------------
            const w1X = fastNoise2D(x * baseFreq * 0.9 + ox1, y * baseFreq * 0.9 + oy1);
            const w1Y = fastNoise2D(x * baseFreq * 0.9 + ox2, y * baseFreq * 0.9 + oy2);

            const wx1 = x + w1X * warpAmp1;
            const wy1 = y + w1Y * warpAmp1;

            const w2X = fastNoise2D(wx1 * baseFreq * 2.1 + ox3, wy1 * baseFreq * 2.1 + oy1);
            const w2Y = fastNoise2D(wx1 * baseFreq * 2.1 + oy3, wy1 * baseFreq * 2.1 + ox2);

            const finalX = x + w1X * warpAmp1 * 0.6 + w2X * warpAmp2;
            const finalY = y + w1Y * warpAmp1 * 0.6 + w2Y * warpAmp2;

            // -----------------------------------------------------------
            // 3. TEKTONISCHE PLATTENMASKE
            // -----------------------------------------------------------
            let plateInfluence = -0.35;
            const warpedNX = finalX / GRID_W;
            const warpedNY = finalY / GRID_H;

            for (let p = 0; p < cfg.plateCount; p++) {
                const pl = plates[p];
                const dx = (warpedNX - pl.cx) / pl.stretchX;
                const dy = (warpedNY - pl.cy) / pl.stretchY;
                const d = Math.hypot(dx, dy);
                if (d < pl.radius * 1.45) {
                    const t = Math.max(0, 1.0 - (d / (pl.radius * 1.35)));
                    const smooth = t * t * (3.0 - 2.0 * t);
                    plateInfluence = Math.max(plateInfluence, smooth * pl.weight - 0.22);
                }
            }

            // -----------------------------------------------------------
            // 4. FRAKTALES TERRAIN & INSELARCHIPELE
            // -----------------------------------------------------------
            const fbmVal = fbmFast(finalX * baseFreq * 1.25, finalY * baseFreq * 1.25, cfg.octaves);

            let archipelago = 0;
            if (islandDensity > 0.05) {
                const archNoise = fastNoise2D(finalX * 0.014 + ox2, finalY * 0.014 + oy3);
                if (archNoise > 0.22) {
                    archipelago = Math.pow((archNoise - 0.22) / 0.78, 2.1) * islandDensity;
                }
            }

            let elevation = fbmVal * 0.68 + plateInfluence * 0.58 + archipelago;

            // Organischer Kantenabfall (kein Viereck am Rand)
            if (cfg.preset !== 'no_water') {
                const radial = Math.hypot(cx, cy) + fastNoise2D(x * 0.005 + ox1, y * 0.005 + oy2) * 0.22;
                if (radial > 0.76) {
                    const fall = Math.min(1.0, (radial - 0.76) / 0.28);
                    const smoothFall = fall * fall * (3.0 - 2.0 * fall);
                    elevation = elevation * (1.0 - smoothFall) - smoothFall * 0.65;
                }
            }

            // -----------------------------------------------------------
            // 5. GEBIRGSZÜGE & FLUSSEROSION
            // -----------------------------------------------------------
            let relHeight = elevation - seaLevelThreshold;

            if (relHeight > -0.02) {
                if (mountainFactor > 0.05) {
                    const r1 = ridgedNoise(finalX * baseFreq * 2.2 + ox3, finalY * baseFreq * 2.2 + oy3, 3);
                    const r2 = ridgedNoise(x * baseFreq * 4.5 + w1X, y * baseFreq * 4.5 + w1Y, 2);
                    const mtnMask = Math.max(0.15, fastNoise2D(x * baseFreq * 0.7 + oy1, y * baseFreq * 0.7 + ox1) + 0.55);
                    relHeight += (Math.pow(r1, 2.3) * 0.75 + Math.pow(r2, 2.0) * 0.25) * mountainFactor * 0.72 * mtnMask;
                }

                // Natürliche Flussrinnen & Canyons
                if (cfg.preset !== 'no_water' && riverStrength > 0.05 && relHeight > 0.0 && relHeight < mountainMinHeight * 0.92) {
                    const riverNoise = Math.abs(fastNoise2D((x + w1X * 35.0) * 0.0038 + ox2, (y + w1Y * 35.0) * 0.0038 + oy1));
                    const threshold = 0.015 + riverStrength * 0.025;
                    if (riverNoise < threshold) {
                        const riverDepth = (1.0 - (riverNoise / threshold));
                        relHeight -= Math.pow(riverDepth, 1.8) * (relHeight + 0.028) * (riverStrength * 1.2);
                    }
                }
            }

            elevationGrid[idx] = relHeight;

            if (relHeight >= 0) {
                if (mountainFactor > 0.15 && relHeight > mountainMinHeight) {
                    terrainGrid[idx] = TERRAIN_MOUNTAIN;
                    ownerGrid[idx] = OWNER_MOUNTAIN;
                } else {
                    terrainGrid[idx] = TERRAIN_LAND;
                    ownerGrid[idx] = OWNER_NEUTRAL;
                    totalLandCells++;
                }
            } else {
                terrainGrid[idx] = TERRAIN_WATER;
                ownerGrid[idx] = OWNER_WATER;
            }
        }
    }

    cleanUpMicroArtifacts();
    bakeTopographicRelief();

    // ==============================================================
    // BOT-SPAWNS VORBEREITEN
    // ==============================================================
    window.previewBotSpawns = [];
    const botEl = document.getElementById('genBotCount');
    const botCount = botEl ? (parseInt(botEl.value, 10) || 10) : 10;
    const idealDist = Math.max(16, Math.floor(GRID_W / Math.sqrt(botCount + 2) * 0.72));

    for (let b = 0; b < botCount; b++) {
        let bestPos = null;
        for (let attempt = 0; attempt < 250; attempt++) {
            const rx = Math.floor(Math.random() * (GRID_W - 16)) + 8;
            const ry = Math.floor(Math.random() * (GRID_H - 16)) + 8;
            const rIdx = ry * GRID_W + rx;

            if (terrainGrid[rIdx] === TERRAIN_LAND) {
                let tooClose = false;
                const minDist = attempt < 150 ? idealDist : idealDist * 0.5;
                for (const p of window.previewBotSpawns) {
                    if (Math.hypot(rx - p.x, ry - p.y) < minDist) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) {
                    const colorPick = PALETTE[(b + 1) % PALETTE.length].rgb;
                    bestPos = { x: rx, y: ry, color: colorPick };
                    break;
                }
            }
        }
        if (bestPos) {
            window.previewBotSpawns.push(bestPos);
        }
    }

    // POIs (Minen & Häfen) generieren
    spawnStrategicPOIs();

    factions = [null];
    activeAttacks = [];
    updateBordersAndCentroids();
    mapDirty = true;

    renderMiniPreview();
    const landRatio = Math.round((totalLandCells / TOTAL_CELLS) * 100);
    const badgeRes = document.getElementById('menuResBadge');
    const badgeLand = document.getElementById('menuLandRatioBadge');
    if (badgeRes) badgeRes.textContent = `${GRID_W}×${GRID_H} px`;
    if (badgeLand) badgeLand.textContent = `Landanteil: ${landRatio}%`;
}

// Glättet einzelne verwaiste 1px-Pixel für saubere Kanten
function cleanUpMicroArtifacts() {
    for (let y = 1; y < GRID_H - 1; y++) {
        const row = y * GRID_W;
        for (let x = 1; x < GRID_W - 1; x++) {
            const idx = row + x;
            const current = terrainGrid[idx];
            const n1 = terrainGrid[idx - 1];
            const n2 = terrainGrid[idx + 1];
            const n3 = terrainGrid[idx - GRID_W];
            const n4 = terrainGrid[idx + GRID_W];

            if (current !== n1 && n1 === n2 && n2 === n3 && n3 === n4) {
                if (current === TERRAIN_LAND) totalLandCells--;
                if (n1 === TERRAIN_LAND) totalLandCells++;
                terrainGrid[idx] = n1;
                ownerGrid[idx] = n1 === TERRAIN_WATER ? OWNER_WATER : (n1 === TERRAIN_MOUNTAIN ? OWNER_MOUNTAIN : OWNER_NEUTRAL);
                elevationGrid[idx] = (elevationGrid[idx - 1] + elevationGrid[idx + 1]) * 0.5;
            }
        }
    }
}

/***********************************************************************
 * PROZEDURALES POI-SYSTEM (GOLDMINEN & HANDELSHÄFEN)
 ***********************************************************************/
function spawnStrategicPOIs() {
    mapPOIs = [];

    // 1. Neutrale Goldminen im Landesinneren (liefern Passiv-Gold)
    const mineCount = Math.max(3, Math.floor(GRID_W / 115));
    for (let i = 0; i < mineCount; i++) {
        for (let attempt = 0; attempt < 180; attempt++) {
            const rx = Math.floor(Math.random() * (GRID_W - 30)) + 15;
            const ry = Math.floor(Math.random() * (GRID_H - 30)) + 15;
            const idx = ry * GRID_W + rx;

            if (terrainGrid[idx] === TERRAIN_LAND) {
                const tooClose = mapPOIs.some(p => Math.hypot(p.x - rx, p.y - ry) < 42);
                if (!tooClose) {
                    mapPOIs.push({
                        type: 'mine',
                        x: rx,
                        y: ry,
                        idx: idx,
                        name: 'Goldmine',
                        icon: '⛏️',
                        bonusGold: 15
                    });
                    break;
                }
            }
        }
    }

    // 2. Handelshäfen an Küstenfeldern (beschleunigen Marine-Invasionen)
    const portCount = Math.max(2, Math.floor(GRID_W / 150));
    for (let i = 0; i < portCount; i++) {
        for (let attempt = 0; attempt < 220; attempt++) {
            const rx = Math.floor(Math.random() * (GRID_W - 20)) + 10;
            const ry = Math.floor(Math.random() * (GRID_H - 20)) + 10;
            const idx = ry * GRID_W + rx;

            if (terrainGrid[idx] === TERRAIN_LAND) {
                let hasWaterNeighbor = false;
                for (let d = 0; d < 4; d++) {
                    const nx = rx + DIR4_X[d];
                    const ny = ry + DIR4_Y[d];
                    if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                        if (terrainGrid[ny * GRID_W + nx] === TERRAIN_WATER) {
                            hasWaterNeighbor = true;
                            break;
                        }
                    }
                }

                if (hasWaterNeighbor) {
                    const tooClose = mapPOIs.some(p => Math.hypot(p.x - rx, p.y - ry) < 45);
                    if (!tooClose) {
                        mapPOIs.push({
                            type: 'port',
                            x: rx,
                            y: ry,
                            idx: idx,
                            name: 'Handelshafen',
                            icon: '⚓',
                            speedMultiplier: 2.0
                        });
                        break;
                    }
                }
            }
        }
    }
}

/***********************************************************************
 * 3D-BIOM- & TOPOGRAPHIE-RENDERER (SONNENLICHT, FLÜSSE & 14 BIOME)
 ***********************************************************************/
function bakeTopographicRelief() {
    const cfg = getGeneratorConfig();

    // Sonnenvektor aus Nordwesten
    const sunX = -0.62, sunY = -0.62, sunZ = 0.48;
    const tempGlobalOffset = cfg.tempShift / 100;
    const moistGlobalOffset = cfg.moistShift / 100;

    for (let y = 0; y < GRID_H; y++) {
        const rowOffset = y * GRID_W;
        const yUp = Math.max(0, y - 1) * GRID_W;
        const yDown = Math.min(GRID_H - 1, y + 1) * GRID_W;
        const rawLat = (y / GRID_H) * 2.0 - 1.0;

        for (let x = 0; x < GRID_W; x++) {
            const idx = rowOffset + x;
            const xLeft = Math.max(0, x - 1);
            const xRight = Math.min(GRID_W - 1, x + 1);

            const h = elevationGrid[idx];
            const t = terrainGrid[idx];

            // Normal-Mapping
            const dX = (elevationGrid[rowOffset + xRight] - elevationGrid[rowOffset + xLeft]) * 14.5;
            const dY = (elevationGrid[yDown + x] - elevationGrid[yUp + x]) * 14.5;
            const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + 1.0);
            const nx = -dX * invLen;
            const ny = -dY * invLen;
            const nz = 1.0 * invLen;

            const dotLight = nx * sunX + ny * sunY + nz * sunZ;
            const shade = Math.max(-42, Math.min(42, Math.floor((dotLight - 0.45) * 95)));
            const slope = Math.hypot(dX, dY);
            const microGrain = ((x * 73856093 ^ y * 19349663) & 7) - 3;

            let r = 0, g = 0, b = 0;

            if (t === TERRAIN_WATER) {
                let shoreNeighbors = 0;
                if (terrainGrid[rowOffset + xLeft] !== TERRAIN_WATER) shoreNeighbors++;
                if (terrainGrid[rowOffset + xRight] !== TERRAIN_WATER) shoreNeighbors++;
                if (terrainGrid[yUp + x] !== TERRAIN_WATER) shoreNeighbors++;
                if (terrainGrid[yDown + x] !== TERRAIN_WATER) shoreNeighbors++;

                const waterShade = Math.floor(shade * 0.25);

                if (shoreNeighbors > 0) {
                    r = 92 + waterShade; g = 206 + waterShade; b = 232 + waterShade;
                } else if (h > -0.025) {
                    const f = (h + 0.025) / 0.025;
                    r = Math.floor(38 + f * 38) + waterShade;
                    g = Math.floor(135 + f * 52) + waterShade;
                    b = Math.floor(192 + f * 32) + waterShade;
                } else if (h > -0.09) {
                    const f = (h + 0.09) / 0.065;
                    r = Math.floor(18 + f * 20) + waterShade;
                    g = Math.floor(72 + f * 63) + waterShade;
                    b = Math.floor(138 + f * 54) + waterShade;
                } else {
                    const depth = Math.max(0, Math.min(1, (-h - 0.09) / 0.42));
                    r = Math.floor(16 * (1 - depth) + 5 * depth) + (waterShade >> 1);
                    g = Math.floor(68 * (1 - depth) + 22 * depth) + (waterShade >> 1);
                    b = Math.floor(132 * (1 - depth) + 58 * depth) + (waterShade >> 1);
                }
            } else {
                const latWobble = fastNoise2D(x * 0.003 + 77.7, y * 0.003 + 33.3) * 0.16;
                const latNorm = Math.min(1.0, Math.max(0.0, Math.abs(rawLat + latWobble)));

                const tempNoise = fastNoise2D(x * 0.0055 + 140.0, y * 0.0055 + 190.0) * 0.18;
                const temperature = (1.0 - Math.pow(latNorm, 1.35) * 0.88) - (h * 0.45) + tempNoise + tempGlobalOffset;

                const moistMacro = fastNoise2D(x * 0.0045 + 310.0, y * 0.0045 + 410.0) * 0.65;
                const moistDetail = fastNoise2D(x * 0.018 + 520.0, y * 0.018 + 610.0) * 0.35;
                let moisture = moistMacro + moistDetail + moistGlobalOffset;
                if (h < 0.045) moisture += (0.045 - h) * 3.8;

                if (t === TERRAIN_MOUNTAIN) {
                    const snowLine = 0.38 - (latNorm * 0.24) + (tempGlobalOffset * 0.3);
                    if (h > snowLine && slope < 1.35) {
                        r = 238 + shade + microGrain; g = 244 + shade + microGrain; b = 252 + shade + microGrain;
                    } else if (h > snowLine - 0.10) {
                        r = 142 + shade + microGrain; g = 138 + shade + microGrain; b = 134 + shade + microGrain;
                    } else {
                        r = 98 + shade + microGrain; g = 96 + shade + microGrain; b = 102 + shade + microGrain;
                    }
                } else {
                    if (h < 0.015 && temperature > 0.28) {
                        r = 226 + (shade >> 1) + microGrain; g = 208 + (shade >> 1) + microGrain; b = 152 + (shade >> 1) + microGrain;
                    } else if (slope > 1.15 && h > 0.14) {
                        r = 122 + shade + microGrain; g = 116 + shade + microGrain; b = 108 + shade + microGrain;
                    } else if (temperature < 0.16) {
                        r = 220 + shade + microGrain; g = 232 + shade + microGrain; b = 242 + shade + microGrain;
                    } else if (temperature < 0.25) {
                        r = 168 + shade + microGrain; g = 178 + shade + microGrain; b = 165 + shade + microGrain;
                    } else if (temperature < 0.34) {
                        r = 118 + shade + microGrain; g = 130 + shade + microGrain; b = 98 + shade + microGrain;
                    } else if (temperature < 0.48 && moisture > -0.08) {
                        r = 44 + shade + microGrain; g = 86 + shade + microGrain; b = 58 + shade + microGrain;
                    } else if (temperature < 0.48) {
                        r = 138 + shade + microGrain; g = 142 + shade + microGrain; b = 92 + shade + microGrain;
                    } else if (temperature > 0.72 && moisture < -0.32) {
                        r = 198 + (shade >> 1) + microGrain; g = 118 + (shade >> 1) + microGrain; b = 74 + (shade >> 1) + microGrain;
                    } else if (temperature > 0.62 && moisture < -0.14) {
                        r = 224 + (shade >> 1) + microGrain; g = 188 + (shade >> 1) + microGrain; b = 118 + (shade >> 1) + microGrain;
                    } else if (temperature > 0.56 && moisture < 0.04) {
                        r = 172 + shade + microGrain; g = 166 + shade + microGrain; b = 78 + shade + microGrain;
                    } else if (temperature > 0.62 && moisture > 0.22) {
                        r = 24 + shade + microGrain; g = 94 + shade + microGrain; b = 38 + shade + microGrain;
                    } else if (temperature > 0.54 && moisture > 0.08) {
                        r = 42 + shade + microGrain; g = 124 + shade + microGrain; b = 48 + shade + microGrain;
                    } else if (moisture > 0.10) {
                        r = 52 + shade + microGrain; g = 128 + shade + microGrain; b = 56 + shade + microGrain;
                    } else {
                        r = 88 + shade + microGrain; g = 156 + shade + microGrain; b = 70 + shade + microGrain;
                    }
                }
            }

            baseR[idx] = Math.max(0, Math.min(255, r));
            baseG[idx] = Math.max(0, Math.min(255, g));
            baseB[idx] = Math.max(0, Math.min(255, b));
        }
    }
}

function renderMiniPreview() {
    const pCanvas = document.getElementById('previewCanvas');
    if (!pCanvas) return;
    updateMapPixelBuffer();
    pCanvas.width = GRID_W;
    pCanvas.height = GRID_H;
    const pCtx = pCanvas.getContext('2d');
    pCtx.drawImage(mapCanvas, 0, 0);
}

/***********************************************************************
 * 10. MENÜ-, GENERATOR- & HUD-EVENTS
 ***********************************************************************/
function syncGeneratorLabels() {
    const getV = (id, fallback) => {
        const val = document.getElementById(id)?.value;
        return val !== undefined ? parseInt(val, 10) : fallback;
    };

    const water = getV('genWaterLevel', 48);
    const scale = getV('genContinentScale', 55);
    const plates = getV('genPlateCount', 5);
    const warp = getV('genWarpIntensity', 50);
    const coast = getV('genCoastDetail', 5);
    const islands = getV('genIslands', 45);
    const mtn = getV('genMountains', 50);
    const rivers = getV('genRivers', 40);
    const temp = getV('genTemperature', 0);
    const moist = getV('genMoisture', 0);
    const bots = document.getElementById('genBotCount')?.value || 10;

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('valWaterLevel', water + '%');
    setText('valContinentScale', scale < 30 ? 'Inselkette' : (scale < 50 ? 'Archipel' : (scale < 75 ? 'Kontinente' : 'Pangaea')));
    setText('valPlateCount', plates + (plates === 1 ? ' Kern' : ' Kerne'));
    setText('valWarpIntensity', warp < 25 ? 'Sanft' : (warp < 65 ? 'Mittel' : 'Zerklüftet'));
    setText('valCoastDetail', coast + ' Okt.');
    setText('valIslands', islands < 20 ? 'Keine' : (islands < 60 ? 'Moderat' : 'Archipele'));
    setText('valMountains', mtn < 20 ? 'Flach' : (mtn < 55 ? 'Hügel' : (mtn < 80 ? 'Alpin' : 'Extrem')));
    setText('valRivers', rivers < 15 ? 'Keine' : (rivers < 55 ? 'Normal' : 'Verzweigt'));
    setText('valTemperature', temp < -25 ? 'Eiszeit' : (temp < -8 ? 'Kühl' : (temp < 15 ? 'Gemäßigt' : (temp < 35 ? 'Warm' : 'Gluthitze'))));
    setText('valMoisture', moist < -25 ? 'Ödland' : (moist < -8 ? 'Trocken' : (moist < 15 ? 'Ausgeglichen' : (moist < 35 ? 'Feucht' : 'Dschungel'))));
    setText('valBotCount', bots);
}

function initColorPicker() {
    const grid = document.getElementById('colorPickerGrid');
    if (!grid) return;
    grid.innerHTML = PALETTE.map((p, idx) => {
        const [r, g, b] = p.rgb;
        const activeClass = idx === selectedColorIdx ? 'ring-2 ring-white scale-105' : 'opacity-75 hover:opacity-100';
        return `
            <button type="button" data-idx="${idx}"
                class="color-swatch h-9 rounded-xl transition transform ${activeClass}"
                style="background-color: rgb(${r},${g},${b})"
                title="${p.name}">
            </button>
        `;
    }).join('');

    grid.querySelectorAll('.color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedColorIdx = parseInt(btn.getAttribute('data-idx'), 10);
            initColorPicker();
        });
    });
}

// Event-Listener scharfstellen
const menuMapType = document.getElementById('menuMapType');
if (menuMapType) {
    menuMapType.addEventListener('change', (e) => {
        applyPresetDefaults(e.target.value);
        generateWorldFromUI();
        fitCameraToMap();
    });
}

const genMapSize = document.getElementById('genMapSize');
if (genMapSize) {
    genMapSize.addEventListener('change', () => {
        generateWorldFromUI();
        fitCameraToMap();
    });
}

// Alle 10 Slider live anbinden
[
    'genWaterLevel', 'genContinentScale', 'genPlateCount', 'genWarpIntensity',
    'genCoastDetail', 'genIslands', 'genMountains', 'genRivers',
    'genTemperature', 'genMoisture'
].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            syncGeneratorLabels();
            generateWorldFromUI();
        });
    }
});

const genBotCount = document.getElementById('genBotCount');
if (genBotCount) {
    genBotCount.addEventListener('input', () => {
        syncGeneratorLabels();
        generateWorldFromUI();
    });
}

const genSeedInput = document.getElementById('genSeedInput');
if (genSeedInput) {
    genSeedInput.addEventListener('change', () => {
        generateWorldFromUI();
    });
}

const randomSeedBtn = document.getElementById('randomSeedBtn');
if (randomSeedBtn) {
    randomSeedBtn.addEventListener('click', () => {
        document.getElementById('genSeedInput').value = String(Math.floor(100000 + Math.random() * 900000));
        generateWorldFromUI();
    });
}

const goToSpawnBtn = document.getElementById('goToSpawnBtn');
if (goToSpawnBtn) {
    goToSpawnBtn.addEventListener('click', () => {
        setPhase('SPAWN');
    });
}

const spawnRerollBtn = document.getElementById('spawnRerollBtn');
if (spawnRerollBtn) {
    spawnRerollBtn.addEventListener('click', () => {
        document.getElementById('genSeedInput').value = String(Math.floor(100000 + Math.random() * 900000));
        generateWorldFromUI();
        updateSpawnConfirmButton();
    });
}

const backToMenuBtn = document.getElementById('backToMenuBtn');
if (backToMenuBtn) {
    backToMenuBtn.addEventListener('click', () => {
        setPhase('MENU');
    });
}

const confirmSpawnBtn = document.getElementById('confirmSpawnBtn');
if (confirmSpawnBtn) {
    confirmSpawnBtn.addEventListener('click', () => {
        launchBattleFromSelectedSpawn();
    });
}

const hudSlider = document.getElementById('hudAttackSlider');
const hudSliderPct = document.getElementById('hudSliderPct');

if (hudSlider) {
    hudSlider.addEventListener('input', () => {
        hudSliderPct.textContent = hudSlider.value + '%';
        updateUI();
    });
}

document.querySelectorAll('.pct-pill').forEach(btn => {
    btn.addEventListener('click', () => {
        const pct = btn.getAttribute('data-pct');
        hudSlider.value = pct;
        hudSliderPct.textContent = pct + '%';
        updateUI();
    });
});

const hudSpeedBtn = document.getElementById('hudSpeedBtn');
if (hudSpeedBtn) {
    hudSpeedBtn.addEventListener('click', (e) => {
        gameSpeed = gameSpeed === 1 ? 2 : (gameSpeed === 2 ? 4 : 1);
        e.target.textContent = gameSpeed + 'x';
    });
}

const hudLeaderboardBtn = document.getElementById('hudLeaderboardBtn');
if (hudLeaderboardBtn) {
    hudLeaderboardBtn.addEventListener('click', () => {
        document.getElementById('leaderboardDrawer').classList.toggle('hidden');
    });
}

const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener('click', () => {
        document.getElementById('leaderboardDrawer').classList.add('hidden');
    });
}

const hudMenuBtn = document.getElementById('hudMenuBtn');
if (hudMenuBtn) {
    hudMenuBtn.addEventListener('click', () => {
        generateWorldFromUI();
        setPhase('MENU');
    });
}

const focusPlayerBtn = document.getElementById('focusPlayerBtn');
if (focusPlayerBtn) {
    focusPlayerBtn.addEventListener('click', () => {
        const p = factions[OWNER_PLAYER];
        if (p && p.alive) {
            const focusZoom = Math.max(camZoom, (Math.min(viewW, viewH) / GRID_W) * 2.8);
            smoothFocusOn(p.centroidX, p.centroidY, focusZoom);
            addVisualEffect(p.centroidX, p.centroidY, 'Hier bist du!', '#fde047', '👑');
        }
    });
}

const zoomInBtn = document.getElementById('zoomInBtn');
if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
        smoothFocusOn(camX, camY, camZoom * 1.6);
    });
}

const zoomOutBtn = document.getElementById('zoomOutBtn');
if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
        fitCameraToMap();
    });
}

const modalNewGameBtn = document.getElementById('modalNewGameBtn');
if (modalNewGameBtn) {
    modalNewGameBtn.addEventListener('click', () => {
        document.getElementById('genSeedInput').value = String(Math.floor(100000 + Math.random() * 900000));
        generateWorldFromUI();
        setPhase('MENU');
    });
}

const modalSpectateBtn = document.getElementById('modalSpectateBtn');
if (modalSpectateBtn) {
    modalSpectateBtn.addEventListener('click', () => {
        document.getElementById('endModal').classList.add('hidden');
        document.getElementById('endModal').classList.remove('flex');
        appPhase = 'PLAYING';
    });
}