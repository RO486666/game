/***********************************************************************
 * 2. PROZEDURALER WELTGENERATOR (ALLE 26 PRESETS & ECHTE GEOMETRIE)
 ***********************************************************************/

function getGeneratorConfig() {
    const getInt = (id, fallback) => {
        const el = document.getElementById(id);
        if (!el || el.value === '') return fallback;
        const val = parseInt(el.value, 10);
        return Number.isNaN(val) ? fallback : val;
    };

    const size = getInt('genMapSize', 650);
    const preset = document.getElementById('menuMapType')?.value || 'with_water';
    const seed = document.getElementById('genSeedInput')?.value.trim() || '849204';
    
    const waterPct = getInt('genWaterLevel', 48);
    const scaleVal = getInt('genContinentScale', 55);
    const plateCount = getInt('genPlateCount', 5);
    const warpVal = getInt('genWarpIntensity', 50);
    const octaves = getInt('genCoastDetail', 5);
    const islandVal = getInt('genIslands', 45);

    const mountainVal = getInt('genMountains', 50);
    const riverVal = getInt('genRivers', 40);

    const tempShift = getInt('genTemperature', 0);
    const moistShift = getInt('genMoisture', 0);

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

    // Standard-Klima (wird von spezifischen Presets überschrieben)
    setVal('genTemperature', 0);
    setVal('genMoisture', 0);
    setVal('genCoastDetail', 5);
    setVal('genRivers', 40);

    switch(preset) {
        case 'no_water':
            setVal('genWaterLevel', 5); setVal('genContinentScale', 90); setVal('genPlateCount', 4); setVal('genWarpIntensity', 35); setVal('genCoastDetail', 4); setVal('genIslands', 0); setVal('genMountains', 45); setVal('genRivers', 0);
            break;
        case 'archipelago':
            setVal('genWaterLevel', 68); setVal('genContinentScale', 25); setVal('genPlateCount', 10); setVal('genWarpIntensity', 80); setVal('genCoastDetail', 6); setVal('genIslands', 95); setVal('genMountains', 35); setVal('genRivers', 15);
            break;
        case 'pangea':
            setVal('genWaterLevel', 28); setVal('genContinentScale', 95); setVal('genPlateCount', 2); setVal('genWarpIntensity', 40); setVal('genIslands', 10); setVal('genMountains', 60); setVal('genRivers', 55);
            break;
        case 'ring_world':
            setVal('genWaterLevel', 50); setVal('genContinentScale', 70); setVal('genPlateCount', 6); setVal('genWarpIntensity', 45); setVal('genIslands', 30); setVal('genMountains', 50);
            break;
        case 'shattered':
            setVal('genWaterLevel', 56); setVal('genContinentScale', 35); setVal('genPlateCount', 9); setVal('genWarpIntensity', 95); setVal('genCoastDetail', 7); setVal('genIslands', 85); setVal('genMountains', 75);
            break;
        case 'four_corners':
            setVal('genWaterLevel', 44); setVal('genContinentScale', 65); setVal('genPlateCount', 4); setVal('genWarpIntensity', 30); setVal('genIslands', 20); setVal('genMountains', 45);
            break;
        case 'twin_continents':
            setVal('genWaterLevel', 48); setVal('genContinentScale', 70); setVal('genPlateCount', 2); setVal('genWarpIntensity', 45); setVal('genIslands', 25); setVal('genMountains', 55);
            break;
        case 'spiral_galaxy':
            setVal('genWaterLevel', 52); setVal('genContinentScale', 55); setVal('genPlateCount', 6); setVal('genWarpIntensity', 35); setVal('genIslands', 60); setVal('genMountains', 50);
            break;
        case 'snake_world':
            setVal('genWaterLevel', 60); setVal('genContinentScale', 75); setVal('genPlateCount', 4); setVal('genWarpIntensity', 40); setVal('genIslands', 20); setVal('genMountains', 60);
            break;
        case 'crossroads':
            setVal('genWaterLevel', 50); setVal('genContinentScale', 65); setVal('genPlateCount', 5); setVal('genWarpIntensity', 30); setVal('genIslands', 15); setVal('genMountains', 55);
            break;
        case 'crescent_moon':
            setVal('genWaterLevel', 52); setVal('genContinentScale', 65); setVal('genPlateCount', 4); setVal('genWarpIntensity', 45); setVal('genIslands', 35); setVal('genMountains', 50);
            break;
        case 'mediterranean':
            setVal('genWaterLevel', 46); setVal('genContinentScale', 65); setVal('genPlateCount', 6); setVal('genWarpIntensity', 55); setVal('genIslands', 45); setVal('genMountains', 55); setVal('genTemperature', 25); setVal('genMoisture', -15);
            break;
        case 'british_isles':
            setVal('genWaterLevel', 58); setVal('genContinentScale', 45); setVal('genPlateCount', 5); setVal('genWarpIntensity', 60); setVal('genCoastDetail', 6); setVal('genIslands', 65); setVal('genMountains', 40); setVal('genMoisture', 25);
            break;
        case 'scandinavia':
            setVal('genWaterLevel', 54); setVal('genContinentScale', 55); setVal('genPlateCount', 5); setVal('genWarpIntensity', 85); setVal('genCoastDetail', 7); setVal('genIslands', 75); setVal('genMountains', 80); setVal('genTemperature', -35);
            break;
        case 'southeast_asia':
            setVal('genWaterLevel', 64); setVal('genContinentScale', 35); setVal('genPlateCount', 8); setVal('genWarpIntensity', 75); setVal('genCoastDetail', 6); setVal('genIslands', 90); setVal('genMountains', 50); setVal('genTemperature', 30); setVal('genMoisture', 35);
            break;
        case 'caribbean':
            setVal('genWaterLevel', 70); setVal('genContinentScale', 30); setVal('genPlateCount', 7); setVal('genWarpIntensity', 65); setVal('genIslands', 85); setVal('genMountains', 35); setVal('genTemperature', 30); setVal('genMoisture', 20);
            break;
        case 'japan_archipelago':
            setVal('genWaterLevel', 62); setVal('genContinentScale', 40); setVal('genPlateCount', 6); setVal('genWarpIntensity', 65); setVal('genCoastDetail', 6); setVal('genIslands', 70); setVal('genMountains', 75);
            break;
        case 'atoll_chain':
            setVal('genWaterLevel', 76); setVal('genContinentScale', 20); setVal('genPlateCount', 8); setVal('genWarpIntensity', 50); setVal('genIslands', 100); setVal('genMountains', 15); setVal('genTemperature', 25);
            break;
        case 'labyrinth':
            setVal('genWaterLevel', 38); setVal('genContinentScale', 60); setVal('genPlateCount', 8); setVal('genWarpIntensity', 85); setVal('genIslands', 40); setVal('genMountains', 92); setVal('genRivers', 85);
            break;
        case 'panthalassa':
            setVal('genWaterLevel', 84); setVal('genContinentScale', 25); setVal('genPlateCount', 6); setVal('genWarpIntensity', 60); setVal('genIslands', 75); setVal('genMountains', 40);
            break;
        case 'vertical_wall':
            setVal('genWaterLevel', 42); setVal('genContinentScale', 75); setVal('genPlateCount', 4); setVal('genWarpIntensity', 25); setVal('genIslands', 15); setVal('genMountains', 95);
            break;
        case 'peninsula_clash':
            setVal('genWaterLevel', 54); setVal('genContinentScale', 55); setVal('genPlateCount', 6); setVal('genWarpIntensity', 65); setVal('genIslands', 45); setVal('genMountains', 50);
            break;
        case 'volcanic_cluster':
            setVal('genWaterLevel', 60); setVal('genContinentScale', 35); setVal('genPlateCount', 9); setVal('genWarpIntensity', 80); setVal('genIslands', 80); setVal('genMountains', 90); setVal('genTemperature', 35);
            break;
        case 'hyper_chaos':
            setVal('genWaterLevel', 50); setVal('genContinentScale', 45); setVal('genPlateCount', 10); setVal('genWarpIntensity', 100); setVal('genCoastDetail', 7); setVal('genIslands', 95); setVal('genMountains', 65); setVal('genRivers', 70);
            break;
        case 'the_pit':
            setVal('genWaterLevel', 48); setVal('genContinentScale', 75); setVal('genPlateCount', 6); setVal('genWarpIntensity', 50); setVal('genIslands', 20); setVal('genMountains', 60);
            break;
        default: // 'with_water'
            setVal('genWaterLevel', 48); setVal('genContinentScale', 55); setVal('genPlateCount', 5); setVal('genWarpIntensity', 50); setVal('genCoastDetail', 5); setVal('genIslands', 45); setVal('genMountains', 50); setVal('genRivers', 40);
            break;
    }
    syncGeneratorLabels();
}

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

/**
 * Hilfsfunktion: Kürzester Abstand eines Punktes (px, py) zu einem Liniensegment (ax, ay) -> (bx, by)
 */
function distToSegment(px, py, ax, ay, bx, by) {
    const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
    if (l2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
}

/**
 * Vorberechnung spezieller Ankerpunkte für komplexe Presets (Atolle, Vulkane, Halbinseln, Spiralen)
 */
function buildPresetMeta(preset, rng) {
    const meta = {
        phase: rng() * Math.PI * 2,
        rot: (rng() - 0.5) * 0.7,
        dir: rng() > 0.5 ? 1 : -1,
        atolls: [],
        volcanoes: [],
        peninsulas: []
    };

    if (preset === 'atoll_chain') {
        const count = 6 + Math.floor(rng() * 4);
        for (let i = 0; i < count; i++) {
            meta.atolls.push({
                cx: (rng() - 0.5) * 1.45,
                cy: (rng() - 0.5) * 1.45,
                r: 0.16 + rng() * 0.16,
                thickness: 0.045 + rng() * 0.035,
                gapAngle: (rng() - 0.5) * Math.PI * 2
            });
        }
    } else if (preset === 'volcanic_cluster') {
        const count = 7 + Math.floor(rng() * 4);
        for (let i = 0; i < count; i++) {
            meta.volcanoes.push({
                cx: (rng() - 0.5) * 1.35,
                cy: (rng() - 0.5) * 1.35,
                outerR: 0.18 + rng() * 0.14,
                calderaR: 0.045 + rng() * 0.04
            });
        }
    } else if (preset === 'peninsula_clash') {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.35;
            const startDist = 1.05;
            const endDist = 0.08 + rng() * 0.18;
            meta.peninsulas.push({
                ax: Math.cos(angle) * startDist,
                ay: Math.sin(angle) * startDist,
                bx: Math.cos(angle + (rng() - 0.5) * 0.3) * endDist,
                by: Math.sin(angle + (rng() - 0.5) * 0.3) * endDist,
                width: 0.13 + rng() * 0.06
            });
        }
    }

    return meta;
}

/**
 * Berechnet für jeden Kartenpunkt die exakte geometrische Maske passend zum gewählten Preset.
 * Rückgabe:
 *   elevBias: Direkter Höhen-Bonus/Malus für Land & Ozean
 *   plateWeight: Wie stark die zufälligen Plattenkerne hier noch wirken dürfen
 *   edgeMode: 'none' (geht bis zum Rand), 'soft' (leichter Randabfall), 'round' (Ozean-Rahmen)
 *   forceMountain: Erzwingt Gebirgsketten (z.B. Vertikale Mauer, Labyrinth, Vulkankrater)
 */
function getPresetShapeMask(preset, cx, cy, wcx, wcy, plates, plateInfluence, meta) {
    let elevBias = 0;
    let plateWeight = 0.55;
    let edgeMode = 'soft';
    let forceMountain = 0;

    switch (preset) {
        case 'no_water': {
            elevBias = 0.85;
            plateWeight = 0.25;
            edgeMode = 'none';
            break;
        }

        case 'with_water': {
            elevBias = 0.04;
            plateWeight = 0.65;
            edgeMode = 'soft';
            break;
        }

        case 'pangea': {
            // Massiver, zusammenhängender Superkontinent mit unregelmäßigen Halbinseln
            const d = Math.hypot(wcx * 0.92, wcy * 1.05);
            if (d < 0.72) {
                elevBias = 0.45 * (1.0 - (d / 0.72) * 0.4);
            } else {
                elevBias = -0.75 * ((d - 0.72) / 0.35);
            }
            plateWeight = 0.45;
            edgeMode = 'round';
            break;
        }

        case 'archipelago': {
            elevBias = -0.18;
            plateWeight = 0.40;
            edgeMode = 'none';
            break;
        }

        case 'ring_world': {
            // Donut-Kontinent mit echtem Binnenmeer und schiffbaren Kanälen
            const d = Math.hypot(wcx, wcy);
            const ringDist = Math.abs(d - 0.56);
            if (ringDist < 0.22) {
                elevBias = 0.52 * (1.0 - ringDist / 0.22);
            } else {
                elevBias = -0.65;
            }
            plateWeight = 0.20;
            edgeMode = 'round';
            break;
        }

        case 'the_pit': {
            // Land komplett außen am Kartenrand, riesiger Krater-Ozean im Zentrum
            const d = Math.hypot(wcx, wcy);
            if (d < 0.56) {
                elevBias = -0.95 * (1.0 - (d / 0.56) * 0.3);
            } else {
                elevBias = 0.55 * Math.min(1.0, (d - 0.56) / 0.25);
            }
            plateWeight = 0.15;
            edgeMode = 'none';
            break;
        }

        case 'four_corners': {
            // 4 mächtige Eck-Reiche + 1 umkämpfte Zentralinsel + schmale Landbrücken
            const corners = [
                [-0.78, -0.78], [0.78, -0.78],
                [-0.78,  0.78], [0.78,  0.78]
            ];
            let bestCorner = -0.60;
            for (let i = 0; i < 4; i++) {
                const cd = Math.hypot(wcx - corners[i][0], wcy - corners[i][1]);
                if (cd < 0.68) {
                    bestCorner = Math.max(bestCorner, 0.58 * (1.0 - cd / 0.68));
                }
            }
            // Zentrales Schlachtfeld
            const centerD = Math.hypot(wcx, wcy);
            if (centerD < 0.26) {
                bestCorner = Math.max(bestCorner, 0.44 * (1.0 - centerD / 0.26));
            }
            // Diagonale Untiefen / Landbrücken
            const diag1 = Math.abs(wcx - wcy) * 0.707;
            const diag2 = Math.abs(wcx + wcy) * 0.707;
            if (Math.min(diag1, diag2) < 0.095 && centerD < 0.85) {
                bestCorner = Math.max(bestCorner, 0.20);
            }
            elevBias = bestCorner;
            plateWeight = 0.15;
            edgeMode = 'none';
            break;
        }

        case 'twin_continents': {
            // Zwei klar getrennte Großkontinente (West & Ost) mit Tiefsee-Graben in der Mitte
            const dWest = Math.hypot((wcx + 0.54) * 1.25, wcy * 0.82);
            const dEast = Math.hypot((wcx - 0.54) * 1.25, wcy * 0.82);
            const minD = Math.min(dWest, dEast);
            if (minD < 0.58) {
                elevBias = 0.55 * (1.0 - minD / 0.58);
            } else {
                elevBias = -0.60;
            }
            // Garantierte Ozean-Meerenge in der Mitte
            if (Math.abs(wcx) < 0.16) {
                elevBias -= (0.16 - Math.abs(wcx)) * 4.2;
            }
            plateWeight = 0.25;
            edgeMode = 'soft';
            break;
        }

        case 'spiral_galaxy': {
            // Zwei gedrehte Galaxie-Arme aus dem Zentrum bis zum Rand
            const r = Math.hypot(wcx, wcy);
            const angle = Math.atan2(wcy, wcx) * meta.dir;
            const spiralWave = Math.cos(2.0 * angle - r * 6.8 + meta.phase);
            if (r < 0.18) {
                elevBias = 0.55 * (1.0 - r / 0.18);
            } else if (r < 0.96) {
                elevBias = spiralWave * 0.52 - r * 0.12;
            } else {
                elevBias = -0.75;
            }
            plateWeight = 0.12;
            edgeMode = 'round';
            break;
        }

        case 'snake_world': {
            // Eine riesige S-förmig geschwungene Schlangen-Landbrücke
            let bestSnake = 999;
            const steps = 28;
            let prevX = 0, prevY = -0.92;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const sy = -0.88 + t * 1.76;
                const sx = Math.sin(t * Math.PI * 2.5 + meta.phase) * 0.56;
                if (i > 0) {
                    const segDist = distToSegment(wcx, wcy, prevX, prevY, sx, sy);
                    if (segDist < bestSnake) bestSnake = segDist;
                }
                prevX = sx;
                prevY = sy;
            }
            const snakeWidth = 0.19;
            if (bestSnake < snakeWidth) {
                elevBias = 0.62 * (1.0 - Math.pow(bestSnake / snakeWidth, 1.6));
                if (bestSnake < 0.035) forceMountain = 0.35; // Gebirgskamm auf dem Rücken
            } else {
                elevBias = -0.68;
            }
            plateWeight = 0.10;
            edgeMode = 'soft';
            break;
        }

        case 'crossroads': {
            // X- bzw. Plus-förmige Fronten, die im Zentrum aufeinanderprallen
            const rotCos = Math.cos(meta.rot);
            const rotSin = Math.sin(meta.rot);
            const rx = wcx * rotCos - wcy * rotSin;
            const ry = wcx * rotSin + wcy * rotCos;
            const armDist = Math.min(Math.abs(rx), Math.abs(ry));
            const armWidth = 0.24;
            if (armDist < armWidth) {
                elevBias = 0.55 * (1.0 - armDist / armWidth);
            } else {
                elevBias = -0.65;
            }
            plateWeight = 0.15;
            edgeMode = 'none';
            break;
        }

        case 'crescent_moon': {
            // Echter Sichelmond mit geschützter innerer Bucht und kleiner Perlen-Insel
            const outerD = Math.hypot(wcx + 0.08, wcy);
            const innerCutD = Math.hypot(wcx - 0.28, wcy - 0.05);
            const pearlD = Math.hypot(wcx - 0.52, wcy - 0.05);

            if (outerD < 0.82 && innerCutD > 0.48) {
                const outerEdge = (0.82 - outerD) / 0.82;
                const innerEdge = Math.min(1.0, (innerCutD - 0.48) / 0.22);
                elevBias = 0.62 * Math.min(outerEdge * 2.2, innerEdge);
            } else if (pearlD < 0.15) {
                elevBias = 0.48 * (1.0 - pearlD / 0.15);
            } else {
                elevBias = -0.68;
            }
            plateWeight = 0.15;
            edgeMode = 'round';
            break;
        }

        case 'mediterranean': {
            // Mittelmeer-Becken: Südeuropa (oben), Nordafrika (unten), Levante (rechts), Stiefel-Halbinsel (Mitte)
            let medBias = 0.42;
            // Hauptbecken des Mittelmeers
            const seaMain = Math.hypot((wcx + 0.05) * 0.78, (wcy - 0.04) * 1.65);
            if (seaMain < 0.62) {
                medBias = -0.72 * (1.0 - (seaMain / 0.62) * 0.4);
            }
            // Schwarzes Meer (oben rechts)
            const blackSea = Math.hypot((wcx - 0.55) * 1.3, (wcy + 0.58) * 1.8);
            if (blackSea < 0.34) {
                medBias = -0.65;
            }
            // Italien-Halbinsel ragt von Norden ins Mittelmeer
            const italyDist = distToSegment(wcx, wcy, -0.12, -0.45, 0.04, 0.08);
            if (italyDist < 0.11) {
                medBias = Math.max(medBias, 0.52 * (1.0 - italyDist / 0.11));
            }
            // Griechenland / Peleponnes
            const greeceDist = distToSegment(wcx, wcy, 0.28, -0.42, 0.30, -0.05);
            if (greeceDist < 0.12) {
                medBias = Math.max(medBias, 0.48 * (1.0 - greeceDist / 0.12));
            }
            // Iberische Halbinsel & Straße von Gibraltar (links)
            const spainD = Math.hypot((wcx + 0.68) * 1.2, (wcy + 0.28) * 1.2);
            if (spainD < 0.36) {
                medBias = Math.max(medBias, 0.52);
            }
            elevBias = medBias;
            plateWeight = 0.18;
            edgeMode = 'none';
            break;
        }

        case 'british_isles': {
            // Großbritannien (rechts, langgestreckt), Irland (links), Kontinentaleuropa (unten rechts)
            let ukBias = -0.62;
            // Hauptinsel Großbritannien
            const gbDist = distToSegment(wcx, wcy, 0.05, -0.68, 0.16, 0.52);
            const gbWidth = 0.22 + (wcy > 0 ? wcy * 0.18 : 0); // Im Süden breiter (England), im Norden schmaler (Schottland)
            if (gbDist < gbWidth) {
                ukBias = Math.max(ukBias, 0.58 * (1.0 - gbDist / gbWidth));
            }
            // Irland (westlich)
            const irelandD = Math.hypot((wcx + 0.46) * 1.45, (wcy - 0.04) * 1.05);
            if (irelandD < 0.32) {
                ukBias = Math.max(ukBias, 0.54 * (1.0 - irelandD / 0.32));
            }
            // Normandie / Flandern (Südost-Ecke)
            if (wcx > 0.35 && wcy > 0.55) {
                const franceD = Math.hypot(wcx - 0.85, wcy - 0.90);
                if (franceD < 0.65) ukBias = Math.max(ukBias, 0.50);
            }
            elevBias = ukBias;
            plateWeight = 0.18;
            edgeMode = 'soft';
            break;
        }

        case 'scandinavia': {
            // Skandinavische Halbinsel von Nordost nach Südwest, Dänemark im Süden, Baltikum im Südosten
            let scanBias = -0.60;
            const scanDist = distToSegment(wcx, wcy, 0.45, -0.85, -0.28, 0.32);
            if (scanDist < 0.34) {
                scanBias = Math.max(scanBias, 0.62 * (1.0 - scanDist / 0.34));
                if (scanDist < 0.09) forceMountain = 0.55; // Skanden-Gebirge
            }
            // Finnland (Nordosten)
            const finD = Math.hypot((wcx - 0.58) * 1.2, (wcy + 0.35) * 1.1);
            if (finD < 0.42) {
                scanBias = Math.max(scanBias, 0.48 * (1.0 - finD / 0.42));
            }
            // Jütland / Dänemark (Südwesten)
            const dkD = Math.hypot((wcx + 0.32) * 1.8, (wcy - 0.72) * 1.3);
            if (dkD < 0.28) {
                scanBias = Math.max(scanBias, 0.46 * (1.0 - dkD / 0.28));
            }
            // Baltische Küste (Südosten)
            if (wcx > 0.35 && wcy > 0.45) {
                scanBias = Math.max(scanBias, 0.42);
            }
            elevBias = scanBias;
            plateWeight = 0.20;
            edgeMode = 'none';
            break;
        }

        case 'southeast_asia': {
            // Indochina/Malakka-Halbinsel im Nordwesten + Sunda-Bogen + große Inseln (Borneo, Sumatra, Java)
            let seaBias = -0.52;
            // Indochina & Malakka-Halbinsel
            const malayDist = distToSegment(wcx, wcy, -0.75, -0.85, -0.25, 0.15);
            if (malayDist < 0.26) {
                seaBias = Math.max(seaBias, 0.56 * (1.0 - malayDist / 0.26));
            }
            // Sumatra -> Java Inselbogen
            const sundaDist = distToSegment(wcx, wcy, -0.65, -0.05, 0.55, 0.68);
            if (sundaDist < 0.14) {
                seaBias = Math.max(seaBias, 0.48 * (1.0 - sundaDist / 0.14));
            }
            // Borneo (Zentral-Ost)
            const borneoD = Math.hypot((wcx - 0.15) * 1.25, (wcy - 0.05) * 1.25);
            if (borneoD < 0.28) {
                seaBias = Math.max(seaBias, 0.55 * (1.0 - borneoD / 0.28));
            }
            // Philippinen-Cluster (Nordosten)
            const philD = Math.hypot((wcx - 0.58) * 1.6, (wcy + 0.45) * 1.1);
            if (philD < 0.32) {
                seaBias = Math.max(seaBias, 0.38 * (1.0 - philD / 0.32));
            }
            elevBias = seaBias;
            plateWeight = 0.28;
            edgeMode = 'none';
            break;
        }

        case 'caribbean': {
            // Golf-Bogen: Mittelamerika im Südwesten, Florida im Nordwesten, Große & Kleine Antillen als Bogen
            let caribBias = -0.58;
            // Yucatan / Mittelamerika (Südwesten)
            const mayaDist = distToSegment(wcx, wcy, -0.95, 0.15, -0.35, 0.95);
            if (mayaDist < 0.25) {
                caribBias = Math.max(caribBias, 0.58 * (1.0 - mayaDist / 0.25));
            }
            // Florida-Spitze (Nordwesten)
            const flDist = distToSegment(wcx, wcy, -0.55, -0.95, -0.32, -0.45);
            if (flDist < 0.16) {
                caribBias = Math.max(caribBias, 0.52 * (1.0 - flDist / 0.16));
            }
            // Kuba & Hispaniola Bogen
            const cubaDist = distToSegment(wcx, wcy, -0.35, -0.22, 0.35, -0.05);
            if (cubaDist < 0.13) {
                caribBias = Math.max(caribBias, 0.52 * (1.0 - cubaDist / 0.13));
            }
            // Kleine Antillen (Perlenkette im Osten)
            const antillesDist = distToSegment(wcx, wcy, 0.42, 0.02, 0.55, 0.75);
            if (antillesDist < 0.12) {
                caribBias = Math.max(caribBias, 0.34 * (1.0 - antillesDist / 0.12));
            }
            elevBias = caribBias;
            plateWeight = 0.25;
            edgeMode = 'none';
            break;
        }

        case 'japan_archipelago': {
            // Geschwungener Japanischer Inselbogen (Honshu, Hokkaido, Kyushu) + koreanisches Festland im Nordwesten
            let jpnBias = -0.62;
            // Gebogener Hauptbogen über 3 Segmente
            const d1 = distToSegment(wcx, wcy, -0.45, 0.68, 0.08, 0.22);
            const d2 = distToSegment(wcx, wcy, 0.08, 0.22, 0.42, -0.35);
            const d3 = distToSegment(wcx, wcy, 0.42, -0.35, 0.58, -0.75);
            const arcDist = Math.min(d1, d2, d3);
            if (arcDist < 0.18) {
                jpnBias = Math.max(jpnBias, 0.62 * (1.0 - arcDist / 0.18));
                if (arcDist < 0.05) forceMountain = 0.55; // Japanische Alpen
            }
            // Festland-Halbinsel oben links (Korea / Primorje)
            const mainlandDist = distToSegment(wcx, wcy, -0.95, -0.85, -0.52, -0.15);
            if (mainlandDist < 0.28) {
                jpnBias = Math.max(jpnBias, 0.58 * (1.0 - mainlandDist / 0.28));
            }
            elevBias = jpnBias;
            plateWeight = 0.18;
            edgeMode = 'none';
            break;
        }

        case 'atoll_chain': {
            // Echte Ring-Atolle mit Lagune in der Mitte und Riff-Öffnungen
            let atollBias = -0.70;
            for (let i = 0; i < meta.atolls.length; i++) {
                const a = meta.atolls[i];
                const dx = wcx - a.cx;
                const dy = wcy - a.cy;
                const d = Math.hypot(dx, dy);
                const ringDiff = Math.abs(d - a.r);
                if (ringDiff < a.thickness) {
                    const ang = Math.atan2(dy, dx);
                    const angDiff = Math.abs(Math.atan2(Math.sin(ang - a.gapAngle), Math.cos(ang - a.gapAngle)));
                    // Kleine Einfahrtslücke in die Lagune lassen
                    if (angDiff > 0.35) {
                        const ringVal = 0.65 * (1.0 - ringDiff / a.thickness);
                        if (ringVal > atollBias) atollBias = ringVal;
                    }
                }
            }
            elevBias = atollBias;
            plateWeight = 0.10;
            edgeMode = 'soft';
            break;
        }

        case 'labyrinth': {
            // Verwinkelte Täler, abgetrennt durch massive Gebirgs- und Wasser-Korridore
            const labPattern = Math.sin(wcx * 7.5 + Math.cos(wcy * 6.0) * 1.8) * Math.cos(wcy * 7.5 - Math.sin(wcx * 6.0) * 1.8);
            elevBias = 0.25 + labPattern * 0.45;
            if (Math.abs(labPattern) < 0.16) {
                forceMountain = 0.85; // Gebirgswände entlang der Korridore
            }
            plateWeight = 0.20;
            edgeMode = 'none';
            break;
        }

        case 'panthalassa': {
            // 90% Ozeanwelt mit kleinen, weit verstreuten Inselgruppen
            elevBias = -0.45;
            plateWeight = 0.45;
            edgeMode = 'soft';
            break;
        }

        case 'vertical_wall': {
            // Norden vs. Süden, getrennt durch ein unüberwindbares Zentralgebirge mit 2 schmalen Pässen
            elevBias = 0.32;
            const wallDist = Math.abs(wcy);
            // Zwei Gebirgspässe bei cx = -0.45 und cx = +0.45
            const pass1 = Math.hypot(wcx + 0.45, wcy);
            const pass2 = Math.hypot(wcx - 0.45, wcy);
            const isPass = (pass1 < 0.14 || pass2 < 0.14);

            if (wallDist < 0.085 && !isPass) {
                elevBias = 0.85;
                forceMountain = 1.0;
            } else if (isPass) {
                elevBias = 0.22; // Begehbarer Tal-Pass!
                forceMountain = -1.0;
            }
            plateWeight = 0.35;
            edgeMode = 'soft';
            break;
        }

        case 'peninsula_clash': {
            // 6 lange Halbinseln, die vom Rand wie Schwerter auf die Kartenmitte zeigen
            let penBias = -0.62;
            for (let i = 0; i < meta.peninsulas.length; i++) {
                const p = meta.peninsulas[i];
                const d = distToSegment(wcx, wcy, p.ax, p.ay, p.bx, p.by);
                if (d < p.width) {
                    penBias = Math.max(penBias, 0.58 * (1.0 - d / p.width));
                }
            }
            // Kleine umkämpfte Mittelinsel
            const cDist = Math.hypot(wcx, wcy);
            if (cDist < 0.16) {
                penBias = Math.max(penBias, 0.45 * (1.0 - cDist / 0.16));
            }
            elevBias = penBias;
            plateWeight = 0.15;
            edgeMode = 'none';
            break;
        }

        case 'volcanic_cluster': {
            // Mehrere Vulkaninseln mit Gebirgskranz und Lava-/Wasser-Caldera im Inneren
            let volcBias = -0.65;
            for (let i = 0; i < meta.volcanoes.length; i++) {
                const v = meta.volcanoes[i];
                const d = Math.hypot(wcx - v.cx, wcy - v.cy);
                if (d < v.calderaR) {
                    volcBias = Math.max(volcBias, -0.75); // Kratersee im Zentrum
                } else if (d < v.outerR) {
                    const t = (d - v.calderaR) / (v.outerR - v.calderaR);
                    const cone = Math.sin(t * Math.PI);
                    volcBias = Math.max(volcBias, 0.62 * cone);
                    if (t > 0.12 && t < 0.42) {
                        forceMountain = Math.max(forceMountain, 0.85); // Kraterrand aus Fels
                    }
                }
            }
            elevBias = volcBias;
            plateWeight = 0.15;
            edgeMode = 'soft';
            break;
        }

        case 'shattered':
        case 'hyper_chaos': {
            // Extrem zerklüftete Tektonik-Brüche
            const shatterWave = Math.sin(wcx * 9.0) * Math.cos(wcy * 9.0);
            elevBias = shatterWave * 0.28 - 0.08;
            plateWeight = 0.65;
            edgeMode = 'none';
            break;
        }
    }

    return { elevBias, plateWeight, edgeMode, forceMountain };
}

function generateWorldFromUI() {
    const cfg = getGeneratorConfig();

    if (GRID_W !== cfg.size || GRID_H !== cfg.size) {
        allocateMapBuffers(cfg.size);
    }

    initNoiseSeed(cfg.seed);
    const rng = createSeededRNG(cfg.seed);
    const presetMeta = buildPresetMeta(cfg.preset, rng);

    totalLandCells = 0;
    selectedSpawnPoint = null;

    const baseFreq = 0.0011 + ((100 - cfg.scaleVal) / 100) * 0.0042;
    const plates = [];

    // Plattenkerne über die Karte verteilen (nicht mehr nur starr im Kreis)
    const activePlateCount = Math.max(1, cfg.plateCount);
    for (let i = 0; i < activePlateCount; i++) {
        const px = 0.14 + rng() * 0.72;
        const py = 0.14 + rng() * 0.72;
        plates.push({
            cx: px,
            cy: py,
            radius: 0.14 + (cfg.scaleVal / 100) * 0.22 + rng() * 0.12,
            weight: 0.65 + rng() * 0.45,
            stretchX: 0.55 + rng() * 1.1,
            stretchY: 0.55 + rng() * 1.1
        });
    }

    const ox1 = rng() * 500, oy1 = rng() * 500;
    const ox2 = rng() * 500, oy2 = rng() * 500;
    const ox3 = rng() * 500, oy3 = rng() * 500;

    const seaLevelThreshold = cfg.preset === 'no_water'
        ? -0.85
        : -0.26 + (cfg.waterPct / 100) * 0.64;

    const mountainFactor = cfg.mountainVal / 100;
    const mountainMinHeight = 0.52 - (mountainFactor * 0.25);

    const warpMult = cfg.warpVal / 50;
    const warpAmp1 = (28.0 + cfg.octaves * 7.0) * warpMult;
    const warpAmp2 = (14.0 + cfg.octaves * 3.5) * warpMult;

    const islandDensity = (cfg.islandVal / 100) * 0.75;
    const riverStrength = cfg.riverVal / 100;

    const isIslandHeavy = ['archipelago', 'southeast_asia', 'caribbean', 'atoll_chain', 'japan_archipelago', 'panthalassa', 'hyper_chaos'].includes(cfg.preset);

    for (let y = 0; y < GRID_H; y++) {
        const rowOffset = y * GRID_W;
        const ny = y / GRID_H;
        const cy = (ny - 0.5) * 2.0;

        for (let x = 0; x < GRID_W; x++) {
            const idx = rowOffset + x;
            const nx = x / GRID_W;
            const cx = (nx - 0.5) * 2.0;

            // Domain Warping für organische Küstenlinien
            const w1X = fastNoise2D(x * baseFreq * 0.9 + ox1, y * baseFreq * 0.9 + oy1);
            const w1Y = fastNoise2D(x * baseFreq * 0.9 + ox2, y * baseFreq * 0.9 + oy2);

            const wx1 = x + w1X * warpAmp1;
            const wy1 = y + w1Y * warpAmp1;

            const w2X = fastNoise2D(wx1 * baseFreq * 2.1 + ox3, wy1 * baseFreq * 2.1 + oy1);
            const w2Y = fastNoise2D(wx1 * baseFreq * 2.1 + oy3, wy1 * baseFreq * 2.1 + ox2);

            const finalX = x + w1X * warpAmp1 * 0.6 + w2X * warpAmp2;
            const finalY = y + w1Y * warpAmp1 * 0.6 + w2Y * warpAmp2;

            const warpedNX = finalX / GRID_W;
            const warpedNY = finalY / GRID_H;

            // Leicht verzerrte normierte Koordinaten (-1 bis +1) für natürliche Preset-Formen
            const shapeWarp = 0.08 + (cfg.warpVal / 100) * 0.14;
            const wcx = cx + w1X * shapeWarp + w2X * (shapeWarp * 0.4);
            const wcy = cy + w1Y * shapeWarp + w2Y * (shapeWarp * 0.4);

            // 1. Einfluss der tektonischen Plattenkerne
            let plateInfluence = -0.32;
            for (let p = 0; p < plates.length; p++) {
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

            // 2. Exakte Geometrie-Maske des gewählten Presets abrufen
            const mask = getPresetShapeMask(cfg.preset, cx, cy, wcx, wcy, plates, plateInfluence, presetMeta);

            // 3. Fraktales Basis-Terrain (FBM)
            const fbmVal = fbmFast(finalX * baseFreq * 1.25, finalY * baseFreq * 1.25, cfg.octaves);

            // 4. Prozedurale Inselketten & Archipele
            let archipelago = 0;
            if (islandDensity > 0.02 && cfg.preset !== 'no_water') {
                const archFreq = isIslandHeavy ? 0.022 : 0.018;
                const archNoise = fastNoise2D(finalX * archFreq + ox2, finalY * archFreq + oy3);
                const archCutoff = isIslandHeavy ? 0.06 : 0.20;
                if (archNoise > archCutoff) {
                    archipelago = Math.pow((archNoise - archCutoff) / (1.0 - archCutoff), 1.65) * islandDensity * (isIslandHeavy ? 1.45 : 0.95);
                }
            }

            // 5. Gesamthöhe kombinieren
            let elevation = fbmVal * 0.58 + plateInfluence * mask.plateWeight + mask.elevBias + archipelago;

            // 6. Kanten-Behandlung passend zum Preset (KEIN erzwungener Kreis mehr bei Rand-Maps!)
            if (cfg.preset !== 'no_water' && mask.edgeMode !== 'none') {
                if (mask.edgeMode === 'round') {
                    const radial = Math.hypot(cx, cy) + w1X * 0.15;
                    if (radial > 0.82) {
                        const fall = Math.min(1.0, (radial - 0.82) / 0.20);
                        const smoothFall = fall * fall * (3.0 - 2.0 * fall);
                        elevation = elevation * (1.0 - smoothFall) - smoothFall * 0.85;
                    }
                } else if (mask.edgeMode === 'soft') {
                    // Quadratischer Soft-Border nur ganz nah am Bildrand (erhält rechteckige & schräge Formen)
                    const boxDist = Math.max(Math.abs(cx), Math.abs(cy)) + Math.abs(w1X) * 0.08;
                    if (boxDist > 0.90) {
                        const fall = Math.min(1.0, (boxDist - 0.90) / 0.12);
                        const smoothFall = fall * fall * (3.0 - 2.0 * fall);
                        elevation = elevation * (1.0 - smoothFall) - smoothFall * 0.75;
                    }
                }
            }

            let relHeight = elevation - seaLevelThreshold;

            // 7. Gebirgskämme & Flusssysteme auf dem Festland
            if (relHeight > -0.02) {
                if (mountainFactor > 0.03 && mask.forceMountain >= 0) {
                    const r1 = ridgedNoise(finalX * baseFreq * 2.2 + ox3, finalY * baseFreq * 2.2 + oy3, 3);
                    const r2 = ridgedNoise(x * baseFreq * 4.5 + w1X, y * baseFreq * 4.5 + w1Y, 2);
                    const mtnMask = Math.max(0.15, fastNoise2D(x * baseFreq * 0.7 + oy1, y * baseFreq * 0.7 + ox1) + 0.55);
                    relHeight += (Math.pow(r1, 2.2) * 0.75 + Math.pow(r2, 2.0) * 0.25) * mountainFactor * 0.74 * mtnMask;
                }

                if (mask.forceMountain > 0) {
                    relHeight += mask.forceMountain * 0.48;
                }

                if (cfg.preset !== 'no_water' && riverStrength > 0.03 && mask.forceMountain <= 0 && relHeight > 0.0 && relHeight < mountainMinHeight * 0.92) {
                    const riverNoise = Math.abs(fastNoise2D((x + w1X * 35.0) * 0.0038 + ox2, (y + w1Y * 35.0) * 0.0038 + oy1));
                    const threshold = 0.012 + riverStrength * 0.028;
                    if (riverNoise < threshold) {
                        const riverDepth = (1.0 - (riverNoise / threshold));
                        relHeight -= Math.pow(riverDepth, 1.75) * (relHeight + 0.032) * (riverStrength * 1.25);
                    }
                }
            }

            elevationGrid[idx] = relHeight;

            // 8. Finale Terrain-Zuweisung
            if (mask.forceMountain >= 0.8 && relHeight >= 0) {
                terrainGrid[idx] = TERRAIN_MOUNTAIN;
                ownerGrid[idx] = OWNER_MOUNTAIN;
            } else if (relHeight >= 0) {
                if (mountainFactor > 0.08 && relHeight > mountainMinHeight && mask.forceMountain >= 0) {
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

    // Bot-Vorschau-Spawns setzen
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

function spawnStrategicPOIs() {
    mapPOIs = [];

    const mineCount = Math.max(3, Math.floor(GRID_W / 115));
    for (let i = 0; i < mineCount; i++) {
        for (let attempt = 0; attempt < 180; attempt++) {
            const rx = Math.floor(Math.random() * (GRID_W - 30)) + 15;
            const ry = Math.floor(Math.random() * (GRID_H - 30)) + 15;
            const idx = ry * GRID_W + rx;

            if (terrainGrid[idx] === TERRAIN_LAND) {
                const tooClose = mapPOIs.some(p => Math.hypot(p.x - rx, p.y - ry) < 42);
                if (!tooClose) {
                    mapPOIs.push({ type: 'mine', x: rx, y: ry, idx: idx, name: 'Goldmine', icon: '⛏️', bonusGold: 15 });
                    break;
                }
            }
        }
    }

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
                        if (terrainGrid[ny * GRID_W + nx] === TERRAIN_WATER) { hasWaterNeighbor = true; break; }
                    }
                }
                if (hasWaterNeighbor) {
                    const tooClose = mapPOIs.some(p => Math.hypot(p.x - rx, p.y - ry) < 45);
                    if (!tooClose) {
                        mapPOIs.push({ type: 'port', x: rx, y: ry, idx: idx, name: 'Handelshafen', icon: '⚓', speedMultiplier: 2.0 });
                        break;
                    }
                }
            }
        }
    }
}

function bakeTopographicRelief() {
    const cfg = getGeneratorConfig();
    const sunX = -0.62, sunY = -0.62, sunZ = 0.48;
    const tempGlobalOffset = cfg.tempShift / 55;
    const moistGlobalOffset = cfg.moistShift / 55;

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

            const dX = (elevationGrid[rowOffset + xRight] - elevationGrid[rowOffset + xLeft]) * 14.5;
            const dY = (elevationGrid[yDown + x] - elevationGrid[yUp + x]) * 14.5;
            const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + 1.0);
            const nx = -dX * invLen, ny = -dY * invLen, nz = 1.0 * invLen;

            const dotLight = nx * sunX + ny * sunY + nz * sunZ;
            const shade = Math.max(-42, Math.min(42, Math.floor((dotLight - 0.45) * 95)));
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
                const temperature = (1.0 - Math.pow(latNorm, 1.35) * 0.88) - (h * 0.42) + tempNoise + tempGlobalOffset;

                const moistMacro = fastNoise2D(x * 0.0045 + 310.0, y * 0.0045 + 410.0) * 0.65;
                const moistDetail = fastNoise2D(x * 0.018 + 520.0, y * 0.018 + 610.0) * 0.35;
                let moisture = moistMacro + moistDetail + moistGlobalOffset;
                if (h < 0.045) moisture += (0.045 - h) * 3.8;

                if (t === TERRAIN_MOUNTAIN) {
                    if (h > 0.62 || temperature < 0.12) {
                        // Schneebedeckte Hochgipfel
                        r = 215 + shade + microGrain; g = 222 + shade + microGrain; b = 230 + shade + microGrain;
                    } else {
                        // Alpingestein
                        r = 104 + shade + microGrain; g = 100 + shade + microGrain; b = 108 + shade + microGrain;
                    }
                } else {
                    // Flacher Sandstrand direkt an der Küste
                    if (h < 0.016 && temperature > 0.22) {
                        r = 194 + shade + microGrain; g = 178 + shade + microGrain; b = 128 + shade + microGrain;
                    } else if (temperature < 0.08) {
                        // Arktis / Schnee-Ebene
                        r = 210 + shade + microGrain; g = 220 + shade + microGrain; b = 225 + shade + microGrain;
                    } else if (temperature < 0.22) {
                        // Tundra / Taiga
                        r = 92 + shade + microGrain; g = 118 + shade + microGrain; b = 88 + shade + microGrain;
                    } else if (temperature > 0.72 && moisture < -0.12) {
                        // Wüste / Steppe
                        r = 186 + shade + microGrain; g = 158 + shade + microGrain; b = 96 + shade + microGrain;
                    } else if (temperature > 0.58 && moisture < 0.05) {
                        // Savanne / Trockenland
                        r = 138 + shade + microGrain; g = 156 + shade + microGrain; b = 74 + shade + microGrain;
                    } else if (moisture > 0.22) {
                        // Dichter Wald / Dschungel
                        r = 42 + shade + microGrain; g = 116 + shade + microGrain; b = 52 + shade + microGrain;
                    } else {
                        // Klassisches Grasland
                        r = 76 + shade + microGrain; g = 148 + shade + microGrain; b = 66 + shade + microGrain;
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
        const el = document.getElementById(id);
        if (!el || el.value === '') return fallback;
        const val = parseInt(el.value, 10);
        return Number.isNaN(val) ? fallback : val;
    };

    const water = getV('genWaterLevel', 48);
    const scale = getV('genContinentScale', 55);
    const plates = getV('genPlateCount', 5);
    const warp = getV('genWarpIntensity', 50);
    const coast = getV('genCoastDetail', 5);
    const islands = getV('genIslands', 45);
    const mountains = getV('genMountains', 50);
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
    setText('valWarpIntensity', warp < 25 ? 'Glatt' : (warp < 60 ? 'Mittel' : (warp < 85 ? 'Stark' : 'Chaotisch')));
    setText('valCoastDetail', coast + ' Okt.');
    setText('valIslands', islands < 20 ? 'Wenige' : (islands < 60 ? 'Moderat' : 'Tausende'));
    setText('valMountains', mountains < 20 ? 'Flach' : (mountains < 60 ? 'Alpin' : 'Massiv'));
    setText('valRivers', rivers < 15 ? 'Keine' : (rivers < 55 ? 'Normal' : 'Delta-Netz'));
    setText('valTemperature', temp < -15 ? 'Eiszeit' : (temp > 15 ? 'Tropisch' : 'Gemäßigt'));
    setText('valMoisture', moist < -15 ? 'Arid/Dürre' : (moist > 15 ? 'Regenwald' : 'Ausgeglichen'));
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

// Alle Slider live anbinden
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