/***********************************************************************
 * 5. ANGRIFFS- & EXPANSIONS-WELLEN, FLOTTEN, BUNKER-RIEGEL & BUFFS
 ***********************************************************************/
let activeFleets = [];

function initiateAttack(attackerId, targetOwnerId, percentage, tapX = null, tapY = null) {
    const attacker = factions[attackerId];
    if (!attacker || !attacker.alive) return false;
    if (attackerId === targetOwnerId || targetOwnerId === OWNER_WATER || targetOwnerId === OWNER_MOUNTAIN) return false;

    const sendTroops = Math.floor(attacker.troops * percentage);
    if (sendTroops < 5) {
        if (attackerId === OWNER_PLAYER && tapX !== null) {
            addVisualEffect(tapX, tapY, 'Zu wenig Truppen!', '#f43f5e', '⚠️');
        }
        return false;
    }

    if (attackerId === OWNER_PLAYER && typeof playSoundAttack === 'function') {
        playSoundAttack();
    }

    const frontierSet = new Set();
    for (let y = 0; y < GRID_H; y++) {
        const rowOffset = y * GRID_W;
        for (let x = 0; x < GRID_W; x++) {
            const idx = rowOffset + x;
            if (ownerGrid[idx] === attackerId && borderMask[idx] === 1) {
                for (let d = 0; d < 4; d++) {
                    const nx = x + DIR4_X[d];
                    const ny = y + DIR4_Y[d];
                    if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                        const nIdx = ny * GRID_W + nx;
                        const isWalkable = terrainGrid[nIdx] === TERRAIN_LAND || terrainGrid[nIdx] === TERRAIN_ICE;
                        if (ownerGrid[nIdx] === targetOwnerId && isWalkable) {
                            frontierSet.add(nIdx);
                        }
                    }
                }
            }
        }
    }

    if (frontierSet.size === 0) {
        const myCoastalTiles = [];
        for (let y = 0; y < GRID_H; y++) {
            const rowOffset = y * GRID_W;
            for (let x = 0; x < GRID_W; x++) {
                const idx = rowOffset + x;
                if (ownerGrid[idx] === attackerId) {
                    let touchesWater = false;
                    for (let d = 0; d < 4; d++) {
                        const nx = x + DIR4_X[d];
                        const ny = y + DIR4_Y[d];
                        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                            if (terrainGrid[ny * GRID_W + nx] === TERRAIN_WATER) {
                                touchesWater = true;
                                break;
                            }
                        }
                    }
                    if (touchesWater) myCoastalTiles.push({ x, y, idx });
                }
            }
        }

        if (myCoastalTiles.length === 0) {
            if (attackerId === OWNER_PLAYER && tapX !== null) {
                addVisualEffect(tapX, tapY, 'Keine Küste für Marine-Invasion!', '#f43f5e', '⚓');
            }
            return false;
        }

        const targetBeachTiles = [];
        for (let y = 0; y < GRID_H; y++) {
            const rowOffset = y * GRID_W;
            for (let x = 0; x < GRID_W; x++) {
                const idx = rowOffset + x;
                const isWalkable = terrainGrid[idx] === TERRAIN_LAND || terrainGrid[idx] === TERRAIN_ICE;
                if (ownerGrid[idx] === targetOwnerId && isWalkable) {
                    let touchesWater = false;
                    for (let d = 0; d < 4; d++) {
                        const nx = x + DIR4_X[d];
                        const ny = y + DIR4_Y[d];
                        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                            if (terrainGrid[ny * GRID_W + nx] === TERRAIN_WATER) {
                                touchesWater = true;
                                break;
                            }
                        }
                    }
                    if (touchesWater) targetBeachTiles.push({ x, y, idx });
                }
            }
        }

        if (targetBeachTiles.length === 0) {
            if (attackerId === OWNER_PLAYER && tapX !== null) {
                addVisualEffect(tapX, tapY, 'Kein Küsten-Ziel erreichbar!', '#f59e0b', '🌊');
            }
            return false;
        }

        let bestBeach = targetBeachTiles[0];
        let minDst = Infinity;
        const targetApproxX = tapX !== null ? tapX : bestBeach.x;
        const targetApproxY = tapY !== null ? tapY : bestBeach.y;

        for (const b of targetBeachTiles) {
            const d = Math.hypot(b.x - targetApproxX, b.y - targetApproxY);
            if (d < minDst) {
                minDst = d;
                bestBeach = b;
            }
        }

        let bestCoast = null;
        let minCoastDist = Infinity;
        const maxRange = GRID_W * 0.42;

        for (const coast of myCoastalTiles) {
            const dist = Math.hypot(bestBeach.x - coast.x, bestBeach.y - coast.y);
            if (dist > maxRange || dist >= minCoastDist) continue;

            let pathBlocked = false;
            let x0 = coast.x, y0 = coast.y;
            let x1 = bestBeach.x, y1 = bestBeach.y;
            let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
            let sx = (x0 < x1) ? 1 : -1;
            let sy = (y0 < y1) ? 1 : -1;
            let err = dx - dy;

            let cxLine = x0, cyLine = y0;
            while (true) {
                if (!(cxLine === x0 && cyLine === y0) && !(cxLine === x1 && cyLine === y1)) {
                    const lIdx = cyLine * GRID_W + cxLine;
                    if (cxLine >= 0 && cxLine < GRID_W && cyLine >= 0 && cyLine < GRID_H) {
                        if (terrainGrid[lIdx] !== TERRAIN_WATER) {
                            pathBlocked = true;
                            break;
                        }
                    }
                }
                if (cxLine === x1 && cyLine === y1) break;
                let e2 = 2 * err;
                if (e2 > -dy) { err -= dy; cxLine += sx; }
                if (e2 < dx) { err += dx; cyLine += sy; }
            }

            if (!pathBlocked) {
                minCoastDist = dist;
                bestCoast = coast;
            }
        }

        if (!bestCoast) {
            if (attackerId === OWNER_PLAYER && tapX !== null) {
                addVisualEffect(tapX, tapY, 'Keine freie Seeroute!', '#f59e0b', '🗺️');
            }
            return false;
        }

        attacker.troops -= sendTroops;

        let calculatedSpeed = Math.max(0.0015, 0.0055 / (minCoastDist / 45));

        if (typeof mapPOIs !== 'undefined') {
            const hasPort = mapPOIs.some(p => p.type === 'port' && ownerGrid[p.idx] === attackerId);
            if (hasPort) {
                calculatedSpeed *= 2.0;
            }
        }

        activeFleets.push({
            attackerId,
            targetOwnerId,
            troops: sendTroops,
            startX: bestCoast.x,
            startY: bestCoast.y,
            targetX: bestBeach.x,
            targetY: bestBeach.y,
            targetIdx: bestBeach.idx,
            currX: bestCoast.x,
            currY: bestCoast.y,
            progress: 0,
            speed: calculatedSpeed
        });

        if (attackerId === OWNER_PLAYER && tapX !== null) {
            addVisualEffect(tapX, tapY, `⚓ Flotte gestartet! (${formatNumber(sendTroops)})`, '#38bdf8', '🚢');
        }
        return true;
    }

    if (attackerId === OWNER_PLAYER && tapX !== null) {
        const label = targetOwnerId === OWNER_NEUTRAL
            ? `Expandiere (${formatNumber(sendTroops)})`
            : `Angriff! (${formatNumber(sendTroops)})`;
        addVisualEffect(tapX, tapY, label, '#10b981', '⚔️');
    }

    for (const atk of activeAttacks) {
        if (atk.attackerId === attackerId && atk.targetOwnerId === targetOwnerId) {
            attacker.troops -= sendTroops;
            atk.troops += sendTroops;
            atk.maxTroops = Math.max(atk.maxTroops || atk.troops, atk.troops);
            const merged = new Set([...atk.frontier, ...frontierSet]);
            atk.frontier = Array.from(merged);
            return true;
        }
    }

    attacker.troops -= sendTroops;
    activeAttacks.push({
        attackerId,
        targetOwnerId,
        troops: sendTroops,
        initialTroops: sendTroops,
        maxTroops: sendTroops,
        frontier: Array.from(frontierSet),
        frontCenterX: 0,
        frontCenterY: 0,
        efficiencyRatio: 1.0
    });
    return true;
}

function processActiveAttacks() {
    // 1. Marine-Bewegungen abarbeiten
    for (let f = activeFleets.length - 1; f >= 0; f--) {
        const fleet = activeFleets[f];
        fleet.progress += fleet.speed;
        fleet.currX = fleet.startX + (fleet.targetX - fleet.startX) * fleet.progress;
        fleet.currY = fleet.startY + (fleet.targetY - fleet.startY) * fleet.progress;

        if (fleet.progress >= 1.0) {
            const landingFrontier = new Set();
            landingFrontier.add(fleet.targetIdx);
            const tx = fleet.targetIdx % GRID_W;
            const ty = Math.floor(fleet.targetIdx / GRID_W);
            for (let d = 0; d < 4; d++) {
                const nx = tx + DIR4_X[d];
                const ny = ty + DIR4_Y[d];
                if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                    const nIdx = ny * GRID_W + nx;
                    const isWalkable = terrainGrid[nIdx] === TERRAIN_LAND || terrainGrid[nIdx] === TERRAIN_ICE;
                    if ((ownerGrid[nIdx] === fleet.targetOwnerId || ownerGrid[nIdx] === OWNER_NEUTRAL) && isWalkable) {
                        landingFrontier.add(nIdx);
                    }
                }
            }

            activeAttacks.push({
                attackerId: fleet.attackerId,
                targetOwnerId: fleet.targetOwnerId,
                troops: fleet.troops,
                initialTroops: fleet.troops,
                maxTroops: fleet.troops,
                frontier: Array.from(landingFrontier),
                frontCenterX: tx,
                frontCenterY: ty,
                efficiencyRatio: 1.0
            });

            addVisualEffect(fleet.targetX, fleet.targetY, '⚓ Invasion gelandet!', '#38bdf8', '🔥');
            activeFleets.splice(f, 1);
            mapDirty = true;
        }
    }

    if (activeAttacks.length === 0 && activeFleets.length === 0) return;

    let anyPixelChanged = false;
    const sizeScale = (240 * 180) / TOTAL_CELLS;
    const baseNeutralCost = Math.max(0.15, 1.35 * sizeScale);

    for (let i = activeAttacks.length - 1; i >= 0; i--) {
        const atk = activeAttacks[i];
        const attacker = factions[atk.attackerId];

        if (!attacker || !attacker.alive || atk.troops < 5 || atk.frontier.length === 0) {
            if (attacker && attacker.alive && atk.troops > 0) {
                attacker.troops += atk.troops;
            }
            activeAttacks.splice(i, 1);
            continue;
        }

        const validTargets = [];
        let sumFrontX = 0, sumFrontY = 0;

        for (let j = 0; j < atk.frontier.length; j++) {
            const cIdx = atk.frontier[j];
            const isWalkable = terrainGrid[cIdx] === TERRAIN_LAND || terrainGrid[cIdx] === TERRAIN_ICE;
            if ((ownerGrid[cIdx] === atk.targetOwnerId || ownerGrid[cIdx] === OWNER_NEUTRAL) && isWalkable) {
                validTargets.push(cIdx);
                sumFrontX += (cIdx % GRID_W);
                sumFrontY += Math.floor(cIdx / GRID_W);
            }
        }

        if (validTargets.length === 0) {
            attacker.troops += atk.troops;
            activeAttacks.splice(i, 1);
            continue;
        }

        atk.frontCenterX = sumFrontX / validTargets.length;
        atk.frontCenterY = sumFrontY / validTargets.length;

        const nextFrontierSet = new Set();
        const processedThisStep = new Set();
        const touchedFortressesThisStep = new Set();

        const isPlayerRush = atk.attackerId === OWNER_PLAYER && typeof buffRushTicks !== 'undefined' && buffRushTicks > 0;

        for (let j = 0; j < validTargets.length; j++) {
            const targetIdx = validTargets[j];
            if (processedThisStep.has(targetIdx)) continue;
            processedThisStep.add(targetIdx);

            const tx = targetIdx % GRID_W;
            const ty = Math.floor(targetIdx / GRID_W);

            // ==============================================================
            // 1. FESTUNGS-SCHUTZ: Liegt diese Kachel im Einflussbereich einer Festung?
            // ==============================================================
            let activeShieldFort = null;
            if (typeof mapPOIs !== 'undefined') {
                for (let p = 0; p < mapPOIs.length; p++) {
                    const poi = mapPOIs[p];
                    if (poi.type === 'garrison_fort' && poi.factionId === atk.targetOwnerId && poi.factionId !== atk.attackerId && poi.garrison > 0) {
                        const dist = Math.hypot(poi.x - tx, poi.y - ty);
                        const radius = poi.protectRadius || 26;
                        if (dist <= radius) {
                            activeShieldFort = poi;
                            break;
                        }
                    }
                }
            }

            // ==============================================================
            // 2. KAMPF GEGEN ODER UM EINE FESTUNG (KEIN DEADLOCK MEHR!)
            // ==============================================================
            if (activeShieldFort) {
                const garrison = activeShieldFort.garrison;
                const siegeForce = atk.troops;

                // FALL A: MASSIVE ÜBERMACHT (z.B. 10k gegen 1k -> Sofortiger Durchbruch!)
                // Wenn deine Armee mindestens 2x so groß ist wie die Garnison, bricht die Festung sofort zusammen!
                if (siegeForce >= garrison * 2.0) {
                    const attackerLoss = Math.floor(garrison * 0.5); // Du verlierst nur die Hälfte der Garnisonsgröße
                    atk.troops = Math.max(0, atk.troops - attackerLoss);

                    activeShieldFort.factionId = atk.attackerId;
                    ownerGrid[activeShieldFort.idx] = atk.attackerId;

                    const conqueror = factions[atk.attackerId];
                    const cName = conqueror ? conqueror.name : 'Feind';
                    activeShieldFort.name = `Festung (${cName})`;

                    // Neue kleine Start-Garnison für den Eroberer
                    const finalGarrison = Math.max(25, Math.floor(garrison * 0.15));
                    activeShieldFort.garrison = finalGarrison;

                    addVisualEffect(activeShieldFort.x, activeShieldFort.y, `💥 FESTUNG ÜBERRANNT (${cName})!`, '#10b981', '🏰');
                    if (typeof playSoundCapitalFall === 'function') playSoundCapitalFall();
                    
                    // Kein 'continue'! Die Truppen rollen im selben Tick direkt normal weiter übers Land!
                } 
                // FALL B: REGULÄRER FESTUNGSKAMPF (Armee ist kleiner als 2x Garnison)
                else {
                    // Pro Tick wird nur EINMAL pro Festung gekämpft (nicht pro Grenzpixel!)
                    if (!touchedFortressesThisStep.has(activeShieldFort.idx)) {
                        touchedFortressesThisStep.add(activeShieldFort.idx);

                        // Wie stark drückt der Angreifer gegen die Garnison?
                        const ratio = siegeForce / Math.max(1, garrison);
                        
                        // Schaden an der Festung (mindestens 15% der Angreiferstärke pro Tick)
                        const dmgToFort = Math.max(25, Math.floor(siegeForce * 0.18 * ratio));
                        // Schaden am Angreifer (Festung hat leichten Verteidigungsbonus von 1.2x)
                        const dmgToAttacker = Math.max(20, Math.floor(dmgToFort * 1.2));

                        activeShieldFort.garrison = Math.max(0, activeShieldFort.garrison - dmgToFort);
                        atk.troops = Math.max(0, atk.troops - dmgToAttacker);

                        // Wenn die Garnison auf 0 fällt -> Eroberung!
                        if (activeShieldFort.garrison <= 0) {
                            activeShieldFort.factionId = atk.attackerId;
                            ownerGrid[activeShieldFort.idx] = atk.attackerId;

                            const conqueror = factions[atk.attackerId];
                            const cName = conqueror ? conqueror.name : 'Feind';
                            activeShieldFort.name = `Festung (${cName})`;
                            activeShieldFort.garrison = Math.max(20, Math.floor(atk.troops * 0.05));

                            addVisualEffect(activeShieldFort.x, activeShieldFort.y, `🚩 Festung geknackt!`, '#f59e0b', '🏰');
                            if (typeof playSoundCapitalFall === 'function') playSoundCapitalFall();
                        }
                    }

                    // Solange die Festung noch steht, bleibt die aktuelle Frontlinie erhalten (kein Löschen der Front!)
                    if (activeShieldFort.garrison > 0) {
                        nextFrontierSet.add(targetIdx);
                        continue;
                    }
                }
            }

            // Normaler Geländekampf (nur außerhalb des Festungsschutzes)
            let terrainFactor = 1.0 + Math.max(0, elevationGrid[targetIdx]) * 1.6;
            if (typeof currentSeason !== 'undefined' && currentSeason === 'WINTER') {
                if (elevationGrid[targetIdx] > 0.25) terrainFactor *= 1.85;
            }
            if (typeof currentSeason !== 'undefined' && currentSeason === 'AUTUMN') {
                terrainFactor *= 1.35;
            }
            if (terrainGrid[targetIdx] === TERRAIN_ICE) {
                terrainFactor = 0.70;
            }

            let attackerCost = 0;
            let defenderDamage = 0;
            let defender = null;
            const poiOnField = (typeof mapPOIs !== 'undefined') ? mapPOIs.find(p => p.idx === targetIdx) : null;

            if (ownerGrid[targetIdx] === OWNER_NEUTRAL) {
                attackerCost = baseNeutralCost * terrainFactor;
                if (poiOnField) attackerCost *= 1.8;
                if (isPlayerRush) attackerCost *= 0.65;
                atk.efficiencyRatio = 1.5;
            } else {
                defender = factions[atk.targetOwnerId];

                if (!defender || !defender.alive || defender.troops <= 1) {
                    attackerCost = 0.08 * terrainFactor;
                    defenderDamage = 0;
                    atk.efficiencyRatio = 2.0;
                } else {
                    const atkTroops = Math.max(1, atk.troops);
                    const defTroops = Math.max(1, defender.troops);
                    const ratio = atkTroops / defTroops;
                    atk.efficiencyRatio = ratio;

                    if (ratio < 0.25) {
                        const defenseWall = (defTroops / atkTroops) * 6.0;
                        attackerCost = (2.5 + defenseWall) * terrainFactor;
                        defenderDamage = 0.05 * terrainFactor;
                    } else if (ratio <= 1.2) {
                        attackerCost = 4.5 * terrainFactor;
                        defenderDamage = 1.2 * terrainFactor;
                    } else {
                        attackerCost = 1.5 * terrainFactor;
                        defenderDamage = 2.8 * terrainFactor;
                    }

                    if (defender.id === OWNER_PLAYER && typeof buffShieldTicks !== 'undefined' && buffShieldTicks > 0) {
                        attackerCost *= 3.0;
                        defenderDamage *= 0.35;
                    }

                    if (atk.attackerId === OWNER_PLAYER && isPlayerRush) {
                        defenderDamage *= 1.8;
                        attackerCost *= 0.7;
                    }

                    if (defender.id === OWNER_PLAYER && typeof upgradeFortLevel !== 'undefined' && upgradeFortLevel > 0) {
                        const fortBonus = 1.0 + (upgradeFortLevel * 0.25);
                        defenderDamage /= fortBonus;
                        attackerCost *= fortBonus;
                    }

                    if (attacker.id === OWNER_PLAYER && typeof upgradeMercLevel !== 'undefined' && upgradeMercLevel > 0) {
                        const atkBonus = 1.0 + (upgradeMercLevel * 0.10);
                        defenderDamage *= atkBonus;
                        attackerCost /= (1.0 + (upgradeMercLevel * 0.05));
                    }
                }
            }

            if (atk.troops >= attackerCost) {
                atk.troops -= attackerCost;

                // Feindliche Hauptstadt fällt
                if (poiOnField && poiOnField.type === 'capital' && poiOnField.factionId === atk.targetOwnerId) {
                    if (defender && defender.alive) {
                        const plunder = Math.floor(defender.troops * 0.40);
                        defender.troops -= plunder;
                        attacker.troops += plunder;

                        const conqueror = factions[atk.attackerId];
                        const cName = conqueror ? conqueror.name : 'Feind';

                        addVisualEffect(poiOnField.x, poiOnField.y, `👑 Hauptstadt gefallen an ${cName}!`, '#f59e0b', '💥');
                        if (typeof playSoundCapitalFall === 'function') playSoundCapitalFall();

                        mapPOIs = mapPOIs.filter(p => p !== poiOnField);
                        mapDirty = true;
                    }
                }

                if (defender && defender.alive && defender.troops > 0) {
                    defender.troops = Math.max(0, defender.troops - defenderDamage);
                    defender.landCount = Math.max(0, defender.landCount - 1);
                }

                ownerGrid[targetIdx] = atk.attackerId;
                attacker.landCount++;
                anyPixelChanged = true;

                if ((atk.attackerId === OWNER_PLAYER || atk.targetOwnerId === OWNER_PLAYER) && typeof playSoundCapture === 'function') {
                    playSoundCapture();
                }

                const cx = targetIdx % GRID_W;
                const cy = Math.floor(targetIdx / GRID_W);
                for (let d = 0; d < 4; d++) {
                    const nx = cx + DIR4_X[d];
                    const ny = cy + DIR4_Y[d];
                    if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                        const nIdx = ny * GRID_W + nx;
                        const isWalkable = terrainGrid[nIdx] === TERRAIN_LAND || terrainGrid[nIdx] === TERRAIN_ICE;
                        if ((ownerGrid[nIdx] === atk.targetOwnerId || ownerGrid[nIdx] === OWNER_NEUTRAL) && isWalkable) {
                            nextFrontierSet.add(nIdx);
                        }
                    }
                }
            } else {
                atk.troops = 0;
                break;
            }
        }

        atk.frontier = Array.from(nextFrontierSet);
    }

    if (anyPixelChanged) {
        updateBordersAndCentroids();
        mapDirty = true;
        checkWinLossConditions();
    }
}