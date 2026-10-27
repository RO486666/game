/***********************************************************************
 * 6. WIRTSCHAFT, DYNAMISCHE PREISE, JAHRESZEITEN, REBELLIONEN & GEFECHTS-SHOP
 ***********************************************************************/

// Globaler Spielstand
let playerGold = parseInt(localStorage.getItem('thd_gold') || '100', 10);
let upgradeMercLevel = parseInt(localStorage.getItem('thd_upg_merc') || '0', 10);
let upgradeFortLevel = parseInt(localStorage.getItem('thd_upg_fort') || '0', 10);
let upgradeTaxLevel = parseInt(localStorage.getItem('thd_upg_tax') || '0', 10);

// Status für temporäre In-Game-Aktionen
let buffRushTicks = 0;   // Sturmangriff: 2.5x Front-Tempo
let buffShieldTicks = 0; // Abwehrriegel: 3x Schutz

function saveAccountData() {
    localStorage.setItem('thd_gold', String(playerGold));
    localStorage.setItem('thd_upg_merc', String(upgradeMercLevel));
    localStorage.setItem('thd_upg_fort', String(upgradeFortLevel));
    localStorage.setItem('thd_upg_tax', String(upgradeTaxLevel));
}

function getUpgradeCost(baseCost, currentLevel) {
    return Math.floor(baseCost * Math.pow(1.25, currentLevel));
}

function getCapPerPixel() {
    const sizeScale = (650 * 650) / TOTAL_CELLS;
    return Math.max(3, Math.round(6 * sizeScale));
}

function getInterestRate(faction) {
    if (!faction || faction.landCount === 0) return 0;
    const maxCap = faction.landCount * getCapPerPixel();
    const ratio = Math.min(1, faction.troops / maxCap);
    const lowTroopBoost = ratio < 0.25 ? 1.5 : 1.0;
    return Math.max(0.02, 0.11 * (1 - ratio * 0.72) * lowTroopBoost);
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
    const incomePerPixel = capMult * 0.045;

    // Laufende Zinsen & Truppen-Regeneration (alle 8 Ticks - für alle absolut gleich fair)
    if (currentCycleTick % 8 === 0) {
        for (let i = 1; i < factions.length; i++) {
            const f = factions[i];
            if (!f || !f.alive || f.landCount === 0) continue;
            const maxCap = f.landCount * capMult;
            const baseDraft = Math.max(25, f.landCount * 0.08);
            const interest = f.troops * (getInterestRate(f) * 0.28);
            f.troops = Math.min(maxCap, f.troops + baseDraft + interest);
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

        const seasonGrowthMult = (typeof currentSeason !== 'undefined' && currentSeason === 'SUMMER') ? 1.30 : 1.0;

        for (let i = 1; i < factions.length; i++) {
            const f = factions[i];
            if (!f || !f.alive) continue;

            const maxCap = f.landCount * capMult;
            const landIncome = Math.max(80, f.landCount * incomePerPixel * seasonGrowthMult);
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

        // POI-Erträge (Minen & Häfen)
        if (typeof mapPOIs !== 'undefined' && mapPOIs.length > 0) {
            for (const poi of mapPOIs) {
                const holderId = ownerGrid[poi.idx];
                if (holderId <= 0) continue;

                if (poi.type === 'mine') {
                    if (holderId === OWNER_PLAYER) {
                        playerGold += poi.bonusGold * 2;
                        addVisualEffect(poi.x, poi.y, `+${poi.bonusGold * 2} Gold`, '#fbbf24', '⛏️');
                    } else if (factions[holderId] && factions[holderId].alive) {
                        const botBonus = Math.floor(80); // Faires festes Einkommen ohne Multiplikator
                        factions[holderId].troops += botBonus;
                    }
                } else if (poi.type === 'port') {
                    if (holderId === OWNER_PLAYER) {
                        playerGold += 15;
                    }
                }
            }
        }

        const p = factions[OWNER_PLAYER];
        if (p && p.alive) {
            const taxMultiplier = 1.0 + (upgradeTaxLevel * 0.60);
            const earnedGold = Math.max(15, Math.floor((p.landCount * 0.15) * taxMultiplier));
            playerGold += earnedGold;
            saveAccountData();
            updateUI();
        }
    }

    // ==============================================================
    // BOT-KI: FAIRES, LAUERNDES VERHALTEN (OHNE JEGLICHEN CHEAT)
    // ==============================================================
    const diffSelect = document.getElementById('genAiDifficulty');
    const diffMode = diffSelect ? diffSelect.value : 'normal';

    for (let i = 2; i < factions.length; i++) {
        const bot = factions[i];
        if (!bot || !bot.alive) continue;

        bot.aiCooldown--;
        if (bot.aiCooldown > 0) continue;

        const scanDelay = diffMode === 'impossible' ? 4 : (diffMode === 'hard' ? 6 : 9);
        bot.aiCooldown = Math.floor(Math.random() * scanDelay) + 3;

        const maxCap = bot.landCount * capMult;
        const capRatio = maxCap > 0 ? bot.troops / maxCap : 0;

        const alreadyAttacking = activeAttacks.some(a => a.attackerId === bot.id) || 
            (typeof activeFleets !== 'undefined' && activeFleets.some(f => f.attackerId === bot.id));
        
        if (alreadyAttacking && capRatio < 0.85) continue;

        // 1. Neutrale Expansion (Sichert sich freies Land)
        if (bot.hasNeutralNeighbor && bot.troops > 150) {
            if (bot.troops > 300 || capRatio > 0.40) {
                initiateAttack(bot.id, OWNER_NEUTRAL, 0.22);
                continue;
            }
        }

        // 2. Taktisches Lauern: Greift nur an, wenn der Feind geschwächt ist oder sie im Vorteil sind
        let targetCandidate = null;
        let bestOpportunityScore = -Infinity;

        for (const nId of bot.neighbors) {
            if (nId <= 0) continue;
            const enemy = factions[nId];
            if (!enemy || !enemy.alive) continue;

            const enemyWars = activeAttacks.filter(a => a.attackerId === enemy.id || a.targetOwnerId === enemy.id).length;
            const troopAdvantage = bot.troops - enemy.troops;
            let opportunityScore = troopAdvantage + (enemyWars * 12000);

            if (diffMode === 'hard' || diffMode === 'impossible') {
                if (bot.troops >= enemy.troops * 0.90) {
                    opportunityScore += 40000;
                }
            }

            if (opportunityScore > bestOpportunityScore) {
                bestOpportunityScore = opportunityScore;
                targetCandidate = nId;
            }
        }

        if (targetCandidate) {
            const enemy = factions[targetCandidate];
            if (enemy && enemy.alive) {
                const strikeForce = bot.troops > 500 ? 0.40 : 0.25;
                if (bot.troops >= enemy.troops * 0.85 || capRatio >= 0.75) {
                    initiateAttack(bot.id, enemy.id, strikeForce);
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
        playerGold += 400;
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
        desc.textContent = 'Alle Reiche besiegt! +400 💰 Siegesbeute erhalten!';
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

    const costMerc = getUpgradeCost(70, upgradeMercLevel);
    const costFort = getUpgradeCost(130, upgradeFortLevel);
    const costTax = getUpgradeCost(200, upgradeTaxLevel);

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
            const cost = getUpgradeCost(70, upgradeMercLevel);
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
            const cost = getUpgradeCost(130, upgradeFortLevel);
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
            const cost = getUpgradeCost(200, upgradeTaxLevel);
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

    const btnTacticalRush = document.getElementById('btnTacticalRush');
    if (btnTacticalRush) {
        btnTacticalRush.addEventListener('click', () => {
            if (playerGold >= 70) {
                playerGold -= 70;
                buffRushTicks = 300;
                saveAccountData();
                updateUI();
                if (shopDrawer) shopDrawer.classList.add('hidden');
                addVisualEffect(camX, camY, 'STURMANGRIFF AKTIV!', '#10b981', '⚡');
            } else {
                alert('Nicht genug Gold! (70 💰 benötigt)');
            }
        });
    }

    const btnTacticalShield = document.getElementById('btnTacticalShield');
    if (btnTacticalShield) {
        btnTacticalShield.addEventListener('click', () => {
            if (playerGold >= 90) {
                playerGold -= 90;
                buffShieldTicks = 400;
                saveAccountData();
                updateUI();
                if (shopDrawer) shopDrawer.classList.add('hidden');
                addVisualEffect(camX, camY, 'ABWEHRRIEGEL AKTIV!', '#38bdf8', '🛡️');
            } else {
                alert('Nicht genug Gold! (90 💰 benötigt)');
            }
        });
    }
});
