/***********************************************************************
 * 6. WIRTSCHAFT, DYNAMISCHE PREISE, JAHRESZEITEN, REBELLIONEN & GEFECHTS-SHOP
 ***********************************************************************/

// Globaler Spielstand
let playerGold = parseInt(localStorage.getItem('thd_gold') || '0', 10);
let upgradeMercLevel = parseInt(localStorage.getItem('thd_upg_merc') || '0', 10);
let upgradeFortLevel = parseInt(localStorage.getItem('thd_upg_fort') || '0', 10);
let upgradeTaxLevel = parseInt(localStorage.getItem('thd_upg_tax') || '0', 10);

// Status für temporäre In-Game-Aktionen
let pendingFortressBuild = false;
let buffRushTicks = 0;   // Sturmangriff: 2.5x Front-Tempo
let buffShieldTicks = 0; // Abwehrriegel: 3x Schutz

function saveAccountData() {
    localStorage.setItem('thd_gold', String(playerGold));
    localStorage.setItem('thd_upg_merc', String(upgradeMercLevel));
    localStorage.setItem('thd_upg_fort', String(upgradeFortLevel));
    localStorage.setItem('thd_upg_tax', String(upgradeTaxLevel));
}

function getUpgradeCost(baseCost, currentLevel) {
    return Math.floor(baseCost * Math.pow(1.35, currentLevel));
}

function getCapPerPixel() {
    const sizeScale = (240 * 180) / TOTAL_CELLS;
    return Math.max(15, Math.round(100 * sizeScale));
}

function getInterestRate(faction) {
    if (!faction || faction.landCount === 0) return 0;
    const maxCap = faction.landCount * getCapPerPixel();
    const ratio = Math.min(1, faction.troops / maxCap);
    const sizeBonus = faction.landCount < 350 ? 1.45 : 1.0;
    return Math.max(0.008, 0.082 * (1 - ratio * 0.80) * sizeBonus);
}

function updateWinterIce(freeze) {
    let changed = false;
    for (let y = 0; y < GRID_H; y++) {
        const rowOffset = y * GRID_W;
        for (let x = 0; x < GRID_W; x++) {
            const idx = rowOffset + x;
            const h = elevationGrid[idx];

            if (freeze) {
                if (terrainGrid[idx] === TERRAIN_WATER && h > -0.06) {
                    terrainGrid[idx] = TERRAIN_ICE;
                    ownerGrid[idx] = OWNER_NEUTRAL;
                    baseR[idx] = 205;
                    baseG[idx] = 230;
                    baseB[idx] = 250;
                    changed = true;
                }
            } else {
                if (terrainGrid[idx] === TERRAIN_ICE) {
                    terrainGrid[idx] = TERRAIN_WATER;
                    ownerGrid[idx] = OWNER_WATER;
                    changed = true;
                }
            }
        }
    }
    if (changed) {
        if (!freeze && typeof bakeTopographicRelief === 'function') {
            bakeTopographicRelief();
        }
        updateBordersAndCentroids();
        mapDirty = true;
    }
}

function triggerSecession(factionId) {
    const parent = factions[factionId];
    if (!parent || !parent.alive || parent.landCount < 300) return;

    let farIdx = -1;
    let maxDist = 0;

    for (let y = 0; y < GRID_H; y += 4) {
        for (let x = 0; x < GRID_W; x += 4) {
            const idx = y * GRID_W + x;
            if (ownerGrid[idx] === factionId && borderMask[idx] === 1) {
                const d = Math.hypot(x - parent.centroidX, y - parent.centroidY);
                if (d > maxDist) {
                    maxDist = d;
                    farIdx = idx;
                }
            }
        }
    }

    if (farIdx === -1) return;

    const spawnX = farIdx % GRID_W;
    const spawnY = Math.floor(farIdx / GRID_W);
    const rebelTroops = Math.floor(parent.troops * 0.25);
    parent.troops -= rebelTroops;
    parent.stability = 60;

    const rebelId = factions.length;
    const rebelColor = [225, 29, 72];
    const rebelFaction = createFaction(rebelId, `Rebellen (${parent.name})`, rebelColor, true);
    rebelFaction.troops = rebelTroops;
    rebelFaction.archetype = 'berserker';
    factions.push(rebelFaction);

    claimStartingCircle(rebelId, spawnX, spawnY, 8);
    updateBordersAndCentroids();
    mapDirty = true;

    addVisualEffect(spawnX, spawnY, 'AUFSTAND! REBELLION!', '#f43f5e', '🔥');
    if (typeof playSoundCapitalFall === 'function') playSoundCapitalFall();
}

function processGameTick() {
    if (appPhase !== 'PLAYING') return;

    if (buffRushTicks > 0) buffRushTicks--;
    if (buffShieldTicks > 0) buffShieldTicks--;

    processActiveAttacks();

    currentCycleTick++;
    const capMult = getCapPerPixel();
    const incomePerPixel = capMult * 0.015;

    // Laufende Zinsen & BOT-FESTUNGS-REINFORCEMENT (alle 10 Ticks)
    if (currentCycleTick % 10 === 0) {
        for (let i = 1; i < factions.length; i++) {
            const f = factions[i];
            if (!f || !f.alive) continue;
            const maxCap = f.landCount * capMult;
            const interest = f.troops * (getInterestRate(f) * 0.22);
            f.troops = Math.min(maxCap, f.troops + interest);
        }

        // Bots verstärken vorhandene Festungen moderat
        if (typeof mapPOIs !== 'undefined' && mapPOIs.length > 0) {
            for (let p = 0; p < mapPOIs.length; p++) {
                const poi = mapPOIs[p];
                if (poi.type === 'garrison_fort' && poi.factionId > 1) {
                    const bot = factions[poi.factionId];
                    if (bot && bot.alive && bot.troops > 350) {
                        const desiredGarrison = Math.floor(bot.troops * 0.25);
                        if (poi.garrison < desiredGarrison) {
                            const transfer = Math.max(15, Math.floor(bot.troops * 0.05));
                            if (bot.troops - transfer > 150) {
                                bot.troops -= transfer;
                                poi.garrison += transfer;
                            }
                        }
                    }
                }
            }
        }
    }

    // Zyklus vollendet
    if (currentCycleTick >= CYCLE_DURATION_TICKS) {
        currentCycleTick = 0;
        cycleCount++;

        if (cycleCount % 3 === 0 && typeof SEASONS !== 'undefined') {
            const prevSeason = currentSeason;
            currentSeasonIdx = (currentSeasonIdx + 1) % SEASONS.length;
            currentSeason = SEASONS[currentSeasonIdx];

            if (currentSeason === 'WINTER') {
                updateWinterIce(true);
                addVisualEffect(camX, camY, 'Winter: Küsten gefrieren!', '#38bdf8', '❄️');
            } else if (prevSeason === 'WINTER') {
                updateWinterIce(false);
                addVisualEffect(camX, camY, 'Frühling: Tauwetter!', '#10b981', '🌸');
            }
        }

        const seasonGrowthMult = (typeof currentSeason !== 'undefined' && currentSeason === 'SUMMER') ? 1.25 : 1.0;

        for (let i = 1; i < factions.length; i++) {
            const f = factions[i];
            if (!f || !f.alive) continue;

            const maxCap = f.landCount * capMult;
            const landIncome = f.landCount * incomePerPixel * seasonGrowthMult;
            f.troops = Math.min(maxCap, f.troops + landIncome);

            const landRatio = totalLandCells > 0 ? (f.landCount / totalLandCells) : 0;
            const activeWars = activeAttacks.filter(a => a.attackerId === f.id || a.targetOwnerId === f.id).length;

            let stabilityDrain = (landRatio * 45) + (activeWars * 7);
            if (f.id === OWNER_PLAYER) {
                const sliderVal = parseInt(document.getElementById('hudAttackSlider')?.value || '30', 10);
                if (sliderVal > 60) stabilityDrain += 12;
            }

            f.stability = Math.max(0, Math.min(100, Math.floor(100 - stabilityDrain)));

            if (f.stability < 22 && f.landCount > 380 && Math.random() < 0.35) {
                triggerSecession(f.id);
            }
        }

        // POI-Erträge
        if (typeof mapPOIs !== 'undefined' && mapPOIs.length > 0) {
            for (const poi of mapPOIs) {
                const holderId = ownerGrid[poi.idx];
                if (holderId <= 0) continue;

                if (poi.type === 'mine') {
                    if (holderId === OWNER_PLAYER) {
                        playerGold += poi.bonusGold;
                        addVisualEffect(poi.x, poi.y, `+${poi.bonusGold} Gold`, '#fbbf24', '⛏️');
                    } else if (factions[holderId] && factions[holderId].alive) {
                        const botBonus = Math.floor(65 * (typeof getAiDifficultyMultiplier === 'function' ? getAiDifficultyMultiplier() : 1.0));
                        factions[holderId].troops += botBonus;
                    }
                } else if (poi.type === 'port') {
                    if (holderId === OWNER_PLAYER) {
                        playerGold += 4;
                    }
                }
            }
        }

        const p = factions[OWNER_PLAYER];
        if (p && p.alive) {
            const taxMultiplier = 1.0 + (upgradeTaxLevel * 0.50);
            const earnedGold = Math.max(1, Math.floor((p.landCount * 0.05) * taxMultiplier));
            playerGold += earnedGold;
            saveAccountData();
            updateUI();
        }
    }

    // ==============================================================
    // BOT-KI: KONTROLLIERTER FESTUNGSBAU & STRATEGIE
    // ==============================================================
    const diffMult = typeof getAiDifficultyMultiplier === 'function' ? getAiDifficultyMultiplier() : 1.0;
    const powerLevel = typeof getPlayerPowerLevel === 'function' ? getPlayerPowerLevel() : 0;
    const diffSelect = document.getElementById('genAiDifficulty');
    const diffMode = diffSelect ? diffSelect.value : 'normal';

    for (let i = 2; i < factions.length; i++) {
        const bot = factions[i];
        if (!bot || !bot.alive) continue;

        // Eigener Cooldown für Festungsbau wird kontinuierlich abgebaut
        if (bot.fortCooldown && bot.fortCooldown > 0) {
            bot.fortCooldown--;
        }

        bot.aiCooldown--;
        if (bot.aiCooldown > 0) continue;

        const baseCooldown = diffMult >= 1.20 ? 4 : 7;
        bot.aiCooldown = Math.floor(Math.random() * baseCooldown) + 3;

        const maxCap = bot.landCount * capMult;
        const capRatio = maxCap > 0 ? bot.troops / maxCap : 0;

        if (diffMult > 1.0 && powerLevel > 0) {
            const scalingBonus = bot.troops * (0.003 * diffMult * Math.min(3.0, 1 + powerLevel * 0.05));
            bot.troops = Math.min(maxCap, bot.troops + scalingBonus);
        }

        // ==========================================================
        // STRIKTER, SELTENER KI-FESTUNGSBAU (KEIN SPAM)
        // ==========================================================
        const canBuildFort = (!bot.fortCooldown || bot.fortCooldown <= 0) &&
                             bot.landCount > 350 && 
                             bot.troops > 1200;

        if (typeof mapPOIs !== 'undefined' && canBuildFort) {
            const maxFortsAllowed = bot.landCount > 1500 ? 2 : 1;
            const myFortsCount = mapPOIs.filter(p => p.type === 'garrison_fort' && p.factionId === bot.id).length;

            if (myFortsCount < maxFortsAllowed && Math.random() < 0.04) {
                bot.fortCooldown = 400; // ~20 Sekunden Cooldown

                const borderCandidates = [];
                for (let y = 0; y < GRID_H; y += 4) {
                    const row = y * GRID_W;
                    for (let x = 0; x < GRID_W; x += 4) {
                        const idx = row + x;
                        if (ownerGrid[idx] === bot.id && borderMask[idx] === 1 && terrainGrid[idx] === TERRAIN_LAND) {
                            // Nur an Grenzfeldern zu echten Feinden bauen
                            let hasHostileNeighbor = false;
                            for (let d = 0; d < 4; d++) {
                                const nx = x + DIR4_X[d];
                                const ny = y + DIR4_Y[d];
                                if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                                    const nOwner = ownerGrid[ny * GRID_W + nx];
                                    if (nOwner > 0 && nOwner !== bot.id) {
                                        hasHostileNeighbor = true;
                                        break;
                                    }
                                }
                            }

                            if (hasHostileNeighbor) {
                                const tooClose = mapPOIs.some(p => Math.hypot(p.x - x, p.y - y) < 80);
                                if (!tooClose) {
                                    borderCandidates.push({ x, y, idx });
                                }
                            }
                        }
                    }
                }

                if (borderCandidates.length > 0) {
                    const pick = borderCandidates[Math.floor(Math.random() * borderCandidates.length)];
                    const initialGarrison = Math.max(80, Math.floor(bot.troops * 0.15));

                    bot.troops -= initialGarrison;
                    mapPOIs.push({
                        type: 'garrison_fort',
                        factionId: bot.id,
                        x: pick.x,
                        y: pick.y,
                        idx: pick.idx,
                        name: `Festung (${bot.name})`,
                        icon: '🛡️',
                        garrison: initialGarrison,
                        protectRadius: 26
                    });

                    addVisualEffect(pick.x, pick.y, `🛡️ Festung erbaut (${bot.name})`, '#f59e0b', '🏰');
                    mapDirty = true;
                    continue;
                }
            }
        }

        // Bereits in eine Schlacht verwickelt?
        const alreadyAttacking = activeAttacks.some(a => a.attackerId === bot.id) || 
            (typeof activeFleets !== 'undefined' && activeFleets.some(f => f.attackerId === bot.id));
        
        if (alreadyAttacking && capRatio < 0.85) continue;

        // Sicherheitsprüfung mit Festungs-Einberechnung
        const evaluateTargetSafety = (targetFactionId) => {
            const enemy = factions[targetFactionId];
            if (!enemy || !enemy.alive) return { safe: true, effectiveTroops: 1 };

            let totalDefTroops = enemy.troops;

            if (typeof mapPOIs !== 'undefined') {
                for (let p = 0; p < mapPOIs.length; p++) {
                    const poi = mapPOIs[p];
                    if (poi.type === 'garrison_fort' && poi.factionId === targetFactionId && poi.garrison > 0) {
                        const dist = Math.hypot(poi.x - bot.centroidX, poi.y - bot.centroidY);
                        if (dist < GRID_W * 0.40) {
                            totalDefTroops += poi.garrison * 2.0;
                        }
                    }
                }
            }

            const minRatio = bot.archetype === 'berserker' ? 0.85 : 1.25;
            const isSafe = (bot.troops * 0.50) >= (totalDefTroops * 0.40 * minRatio) || capRatio > 0.90;
            return { safe: isSafe, effectiveTroops: totalDefTroops };
        };

        // 1. Neutrale Expansion
        if (bot.hasNeutralNeighbor && bot.troops > 60) {
            if (bot.archetype === 'expander' || capRatio > 0.45 || bot.troops > 200) {
                const expandPct = bot.archetype === 'berserker' ? 0.35 : 0.22;
                initiateAttack(bot.id, OWNER_NEUTRAL, expandPct);
                continue;
            }
        }

        // 2. Strategische POIs einnehmen
        let poiTargetOwner = null;
        if (typeof mapPOIs !== 'undefined' && Math.random() < 0.40) {
            for (const poi of mapPOIs) {
                const pOwner = ownerGrid[poi.idx];
                if (pOwner !== bot.id && (pOwner === OWNER_NEUTRAL || bot.neighbors.has(pOwner))) {
                    if (pOwner > 0 && !evaluateTargetSafety(pOwner).safe) continue;

                    const distToCentroid = Math.hypot(poi.x - bot.centroidX, poi.y - bot.centroidY);
                    if (distToCentroid < GRID_W * 0.30) {
                        poiTargetOwner = pOwner;
                        break;
                    }
                }
            }
        }

        if (poiTargetOwner !== null && bot.troops > 120) {
            initiateAttack(bot.id, poiTargetOwner, 0.30);
            continue;
        }

        // 3. Gegner-Auswahl
        let targetCandidate = null;
        let lowestDefPower = Infinity;

        for (const nId of bot.neighbors) {
            if (nId <= 0) continue;
            const check = evaluateTargetSafety(nId);
            if (!check.safe) continue;

            if (check.effectiveTroops < lowestDefPower) {
                lowestDefPower = check.effectiveTroops;
                targetCandidate = nId;
            }
        }

        if (targetCandidate) {
            const enemy = factions[targetCandidate];
            if (enemy && enemy.alive) {
                const isBerserker = bot.archetype === 'berserker';
                const requiredRatio = diffMode === 'impossible' ? 0.95 : (isBerserker ? 1.05 : 1.25);
                const isOverCap = capRatio >= 0.80;

                if ((bot.troops > lowestDefPower * requiredRatio) || isOverCap) {
                    const attackPct = isBerserker ? 0.45 : (isOverCap ? 0.35 : 0.25);
                    initiateAttack(bot.id, enemy.id, attackPct);
                }
            }
        }
    }

    updateUI();
}

function checkWinLossConditions() {
    if (appPhase !== 'PLAYING') return;
    const player = factions[OWNER_PLAYER];
    if (!player) return;

    if (!player.alive || player.landCount === 0) {
        appPhase = 'ENDED';
        showEndModal(false);
        return;
    }

    const anyBotAlive = factions.slice(2).some(b => b && b.alive && b.landCount > 0);
    if (!anyBotAlive) {
        appPhase = 'ENDED';
        playerGold += 250;
        saveAccountData();
        showEndModal(true);
    }
}

function showEndModal(isVictory) {
    const modal = document.getElementById('endModal');
    const icon = document.getElementById('endModalIcon');
    const title = document.getElementById('endModalTitle');
    const desc = document.getElementById('endModalDesc');
    const player = factions[OWNER_PLAYER];
    const pct = totalLandCells > 0 ? ((player.landCount / totalLandCells) * 100).toFixed(1) : '0.0';

    document.getElementById('endModalLand').textContent = pct + '%';
    document.getElementById('endModalCycles').textContent = cycleCount;

    if (isVictory) {
        icon.textContent = '👑';
        title.textContent = 'WELTHERRSCHAFT!';
        title.className = 'text-2xl font-black text-amber-400 mb-1';
        desc.textContent = 'Alle Reiche besiegt! +250 💰 Siegesbeute erhalten!';
    } else {
        icon.textContent = '💀';
        title.textContent = 'REICH GEFALLEN';
        title.className = 'text-2xl font-black text-rose-500 mb-1';
        desc.textContent = 'Deine Gebiete wurden erobert. Behalte dein Gold und rüste auf!';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function updateShopLabels() {
    const goldBadges = [document.getElementById('menuGoldBadge'), document.getElementById('shopTreasuryCount')];
    goldBadges.forEach(el => {
        if (el) el.textContent = formatNumber(playerGold);
    });

    const costMerc = getUpgradeCost(100, upgradeMercLevel);
    const costFort = getUpgradeCost(250, upgradeFortLevel);
    const costTax = getUpgradeCost(400, upgradeTaxLevel);

    const mercBtn = document.getElementById('menuBuyMercBtn');
    if (mercBtn) mercBtn.textContent = `Lvl ${upgradeMercLevel} (${formatNumber(costMerc)} 💰)`;

    const fortBtn = document.getElementById('menuBuyFortBtn');
    if (fortBtn) fortBtn.textContent = `Lvl ${upgradeFortLevel} (${formatNumber(costFort)} 💰)`;

    const taxBtn = document.getElementById('menuBuyTaxBtn');
    if (taxBtn) taxBtn.textContent = `Lvl ${upgradeTaxLevel} (${formatNumber(costTax)} 💰)`;

    const totalMercPct = Math.round(upgradeMercLevel * 15);
    const totalFortPct = Math.round(upgradeFortLevel * 25);
    const totalTaxPct = Math.round(upgradeTaxLevel * 50);

    const subMerc = document.getElementById('subMercBonus');
    if (subMerc) subMerc.textContent = `+15% Truppen • Gesamt: +${totalMercPct}% ⚔️`;

    const subFort = document.getElementById('subFortBonus');
    if (subFort) subFort.textContent = `+25% Schutz • Gesamt: +${totalFortPct}% 🛡️`;

    const subTax = document.getElementById('subTaxBonus');
    if (subTax) subTax.textContent = `+50% Gold • Gesamt: +${totalTaxPct}% 💰`;
}

document.addEventListener('DOMContentLoaded', () => {
    updateShopLabels();

    const mercBtn = document.getElementById('menuBuyMercBtn');
    if (mercBtn) {
        mercBtn.addEventListener('click', () => {
            const cost = getUpgradeCost(100, upgradeMercLevel);
            if (playerGold >= cost) {
                playerGold -= cost;
                upgradeMercLevel++;
                saveAccountData();
                updateShopLabels();
            } else {
                alert(`Nicht genug Gold! Benötigt: ${formatNumber(cost)} 💰`);
            }
        });
    }

    const fortBtn = document.getElementById('menuBuyFortBtn');
    if (fortBtn) {
        fortBtn.addEventListener('click', () => {
            const cost = getUpgradeCost(250, upgradeFortLevel);
            if (playerGold >= cost) {
                playerGold -= cost;
                upgradeFortLevel++;
                saveAccountData();
                updateShopLabels();
            } else {
                alert(`Nicht genug Gold! Benötigt: ${formatNumber(cost)} 💰`);
            }
        });
    }

    const taxBtn = document.getElementById('menuBuyTaxBtn');
    if (taxBtn) {
        taxBtn.addEventListener('click', () => {
            const cost = getUpgradeCost(400, upgradeTaxLevel);
            if (playerGold >= cost) {
                playerGold -= cost;
                upgradeTaxLevel++;
                saveAccountData();
                updateShopLabels();
            } else {
                alert(`Nicht genug Gold! Benötigt: ${formatNumber(cost)} 💰`);
            }
        });
    }

    const hudShopBtn = document.getElementById('hudShopBtn');
    const shopDrawer = document.getElementById('shopDrawer');
    const closeShopBtn = document.getElementById('closeShopBtn');

    if (hudShopBtn && shopDrawer) {
        hudShopBtn.addEventListener('click', () => {
            shopDrawer.classList.toggle('hidden');
        });
    }

    if (closeShopBtn && shopDrawer) {
        closeShopBtn.addEventListener('click', () => {
            shopDrawer.classList.add('hidden');
        });
    }

    const btnBuildFortress = document.getElementById('btnBuildFortress');
    if (btnBuildFortress) {
        btnBuildFortress.addEventListener('click', () => {
            if (playerGold >= 150) {
                pendingFortressBuild = true;
                if (shopDrawer) shopDrawer.classList.add('hidden');
                addVisualEffect(camX, camY, 'Tippe auf dein Land für die Festung!', '#f59e0b', '🏰');
            } else {
                alert('Nicht genug Gold! (150 💰 benötigt)');
            }
        });
    }

    const btnTacticalRush = document.getElementById('btnTacticalRush');
    if (btnTacticalRush) {
        btnTacticalRush.addEventListener('click', () => {
            if (playerGold >= 120) {
                playerGold -= 120;
                buffRushTicks = 300;
                saveAccountData();
                updateUI();
                if (shopDrawer) shopDrawer.classList.add('hidden');
                addVisualEffect(camX, camY, 'STURMANGRIFF AKTIV!', '#10b981', '⚡');
            } else {
                alert('Nicht genug Gold! (120 💰 benötigt)');
            }
        });
    }

    const btnTacticalShield = document.getElementById('btnTacticalShield');
    if (btnTacticalShield) {
        btnTacticalShield.addEventListener('click', () => {
            if (playerGold >= 180) {
                playerGold -= 180;
                buffShieldTicks = 400;
                saveAccountData();
                updateUI();
                if (shopDrawer) shopDrawer.classList.add('hidden');
                addVisualEffect(camX, camY, 'ABWEHRRIEGEL AKTIV!', '#38bdf8', '🛡️');
            } else {
                alert('Nicht genug Gold! (180 💰 benötigt)');
            }
        });
    }
});