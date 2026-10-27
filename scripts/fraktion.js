/***********************************************************************
 * 4. FRAKTIONEN & SCHLACHT-START (INTELLIGENTE & FAIRE KI)
 ***********************************************************************/

function getPlayerPowerLevel() {
    const merc = typeof upgradeMercLevel !== 'undefined' ? upgradeMercLevel : 0;
    const fort = typeof upgradeFortLevel !== 'undefined' ? upgradeFortLevel : 0;
    const tax = typeof upgradeTaxLevel !== 'undefined' ? upgradeTaxLevel : 0;
    return (merc + fort + tax) / 3;
}

// KEINE PRODUKTIONS-BONI MEHR! Nur noch minimale Taktik-Boni für Verteidigung auf höheren Stufen.
function getAiDifficultyDefenseBonus() {
    const diffSelect = document.getElementById('genAiDifficulty');
    const diffMode = diffSelect ? diffSelect.value : 'normal';

    switch (diffMode) {
        case 'easy':       return 0.90; // Leichter Malus für die KI
        case 'normal':     return 1.00; // Fair Play (1:1)
        case 'hard':       return 1.10; // +10% Taktischer Verteidigungs-Bonus (wie von dir vorgeschlagen)
        case 'impossible': return 1.20; // +20% Taktischer Verteidigungs-Bonus
        default:           return 1.00;
    }
}

function createFaction(id, name, colorRGB, isBot) {
    const diffSelect = document.getElementById('genAiDifficulty');
    const diffMode = diffSelect ? diffSelect.value : 'normal';

    const archetypes = ['berserker', 'hoarder', 'expander', 'balanced'];
    const chosenArch = archetypes[Math.floor(Math.random() * archetypes.length)];

    let aggroFactor = 0.35;
    let targetCapThreshold = 0.65;

    if (diffMode === 'easy') {
        aggroFactor = 0.55;
        targetCapThreshold = 0.80;
    } else if (diffMode === 'hard') {
        aggroFactor = 0.22; // Wartet länger, lauert auf Fehler
        targetCapThreshold = 0.50;
    } else if (diffMode === 'impossible') {
        aggroFactor = 0.12; // Äußerst geduldig, schlägt erbarmungslos zu
        targetCapThreshold = 0.35;
    }

    let startingTroops = 600;
    if (!isBot) {
        const merc = typeof upgradeMercLevel !== 'undefined' ? upgradeMercLevel : 0;
        startingTroops = Math.floor(600 * (1 + merc * 0.15));
    }

    return {
        id,
        name,
        color: colorRGB,
        isBot,
        alive: true,
        troops: startingTroops,
        landCount: 0,
        sumX: 0,
        sumY: 0,
        centroidX: 0,
        centroidY: 0,
        neighbors: new Set(),
        hasNeutralNeighbor: true,
        aiCooldown: Math.floor(Math.random() * 6) + 3,
        archetype: chosenArch,
        aggroThreshold: aggroFactor,
        capTrigger: targetCapThreshold,
        stability: 100
    };
}

function claimStartingCircle(factionId, centerX, centerY, radius) {
    const f = factions[factionId];
    const rSq = radius * radius + 1;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= rSq) {
                const nx = centerX + dx;
                const ny = centerY + dy;
                if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                    const idx = ny * GRID_W + nx;
                    if (terrainGrid[idx] === TERRAIN_LAND && ownerGrid[idx] === OWNER_NEUTRAL) {
                        ownerGrid[idx] = factionId;
                    }
                }
            }
        }
    }
    f.centroidX = centerX;
    f.centroidY = centerY;
}

let playerOriginX = 0;
let playerOriginY = 0;

function launchBattleFromSelectedSpawn() {
    if (!selectedSpawnPoint) return;

    const { x: gridX, y: gridY } = selectedSpawnPoint;
    playerOriginX = gridX;
    playerOriginY = gridY;

    factions = [null];
    activeAttacks = [];

    if (typeof mapPOIs !== 'undefined') {
        mapPOIs = mapPOIs.filter(p => p.type !== 'capital' && p.type !== 'garrison_fort');
    } else {
        mapPOIs = [];
    }

    const startRadius = Math.max(5, Math.round(GRID_W * 0.011));
    const playerName = document.getElementById('menuPlayerName').value.trim() || 'Kaiserreich';
    const playerColor = PALETTE[selectedColorIdx].rgb;

    const playerFaction = createFaction(OWNER_PLAYER, playerName, playerColor, false);
    factions.push(playerFaction);
    claimStartingCircle(OWNER_PLAYER, gridX, gridY, startRadius);

    mapPOIs.push({
        type: 'capital',
        factionId: OWNER_PLAYER,
        x: gridX,
        y: gridY,
        idx: gridY * GRID_W + gridX,
        name: `Hauptstadt (${playerName})`,
        icon: '👑'
    });

    const botCount = parseInt(document.getElementById('genBotCount').value, 10) || 10;
    const shuffledNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const otherColors = PALETTE.filter((_, idx) => idx !== selectedColorIdx).map(p => p.rgb);

    const spawns = (window.previewBotSpawns && window.previewBotSpawns.length > 0)
        ? window.previewBotSpawns
        : [];

    if (spawns.length > 0) {
        for (let b = 0; b < spawns.length; b++) {
            const bestPos = spawns[b];
            const botId = factions.length;
            const c = bestPos.color || otherColors[b % otherColors.length];
            const variedColor = [
                Math.max(25, Math.min(245, c[0] + ((b * 29) % 44) - 22)),
                Math.max(25, Math.min(245, c[1] + ((b * 43) % 44) - 22)),
                Math.max(25, Math.min(245, c[2] + ((b * 61) % 44) - 22))
            ];
            const botName = shuffledNames[b % shuffledNames.length];
            const botFaction = createFaction(botId, botName, variedColor, true);
            factions.push(botFaction);
            claimStartingCircle(botId, bestPos.x, bestPos.y, Math.max(4, startRadius - 1));

            mapPOIs.push({
                type: 'capital',
                factionId: botId,
                x: bestPos.x,
                y: bestPos.y,
                idx: bestPos.y * GRID_W + bestPos.x,
                name: `Hauptstadt (${botName})`,
                icon: '🏛️'
            });
        }
    } else {
        const spawnedPositions = [{ x: gridX, y: gridY }];
        const idealDist = Math.max(18, Math.floor(GRID_W / Math.sqrt(botCount + 2) * 0.72));

        for (let b = 0; b < botCount; b++) {
            let bestPos = null;
            for (let attempt = 0; attempt < 180; attempt++) {
                const rx = Math.floor(Math.random() * (GRID_W - 16)) + 8;
                const ry = Math.floor(Math.random() * (GRID_H - 16)) + 8;
                const rIdx = ry * GRID_W + rx;

                if (terrainGrid[rIdx] === TERRAIN_LAND && ownerGrid[rIdx] === OWNER_NEUTRAL) {
                    let tooClose = false;
                    const minDist = attempt < 100 ? idealDist : idealDist * 0.55;
                    for (const p of spawnedPositions) {
                        if (Math.hypot(rx - p.x, ry - p.y) < minDist) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (!tooClose) {
                        bestPos = { x: rx, y: ry };
                        break;
                    }
                }
            }

            if (bestPos) {
                const botId = factions.length;
                const c = otherColors[b % otherColors.length];
                const variedColor = [
                    Math.max(25, Math.min(245, c[0] + ((b * 29) % 44) - 22)),
                    Math.max(25, Math.min(245, c[1] + ((b * 43) % 44) - 22)),
                    Math.max(25, Math.min(245, c[2] + ((b * 61) % 44) - 22))
                ];
                const botName = shuffledNames[b % shuffledNames.length];
                const botFaction = createFaction(botId, botName, variedColor, true);
                factions.push(botFaction);
                claimStartingCircle(botId, bestPos.x, bestPos.y, Math.max(4, startRadius - 1));
                spawnedPositions.push(bestPos);

                mapPOIs.push({
                    type: 'capital',
                    factionId: botId,
                    x: bestPos.x,
                    y: bestPos.y,
                    idx: bestPos.y * GRID_W + bestPos.x,
                    name: `Hauptstadt (${botName})`,
                    icon: '🏰'
                });
            }
        }
    }

    updateBordersAndCentroids();
    mapDirty = true;

    const focusZoom = Math.max(camZoom, (Math.min(viewW, viewH) / GRID_W) * 2.6);
    smoothFocusOn(gridX, gridY, focusZoom);
    addVisualEffect(gridX, gridY, 'DEIN REICH!', '#fde047', '👑');

    currentCycleTick = 0;
    cycleCount = 1;
    setPhase('PLAYING');
    updateUI();
}

function relocateCapital(factionId) {
    const f = factions[factionId];
    if (!f || !f.alive || f.landCount === 0) return;

    const targetX = Math.round(f.centroidX);
    const targetY = Math.round(f.centroidY);
    let bestIdx = -1;
    let minDst = Infinity;

    for (let y = 0; y < GRID_H; y += 2) {
        const row = y * GRID_W;
        for (let x = 0; x < GRID_W; x += 2) {
            const idx = row + x;
            if (ownerGrid[idx] === factionId && terrainGrid[idx] === TERRAIN_LAND) {
                const d = Math.hypot(x - targetX, y - targetY);
                if (d < minDst) {
                    minDst = d;
                    bestIdx = idx;
                }
            }
        }
    }

    if (bestIdx !== -1) {
        const nx = bestIdx % GRID_W;
        const ny = Math.floor(bestIdx / GRID_W);

        if (factionId === OWNER_PLAYER) {
            playerOriginX = nx;
            playerOriginY = ny;
        }

        if (typeof mapPOIs !== 'undefined') {
            mapPOIs = mapPOIs.filter(p => !(p.type === 'capital' && p.factionId === factionId));
            
            mapPOIs.push({
                type: 'capital',
                factionId: factionId,
                x: nx,
                y: ny,
                idx: bestIdx,
                name: `Neue Hauptstadt (${f.name})`,
                icon: factionId === OWNER_PLAYER ? '👑' : '🏰'
            });
        }

        addVisualEffect(nx, ny, `Neue Hauptstadt ausgerufen!`, '#fde047', '👑');
    }
}
