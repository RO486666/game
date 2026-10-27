/***********************************************************************
 * 5. ANGRIFFS- & EXPANSIONS-WELLEN, FLOTTEN & BUFFS (EXAKTE TRUPPEN-LOGIK)
 ***********************************************************************/
let activeFleets = [];

function initiateAttack(attackerId, targetOwnerId, percentage, tapX = null, tapY = null) {
    const attacker = factions[attackerId];
    if (!attacker || !attacker.alive) return false;
    if (attackerId === targetOwnerId || targetOwnerId === OWNER_WATER || targetOwnerId === OWNER_MOUNTAIN) return false;

    // Exakte Truppenstärke, die vom Reich abgezogen und als Welle losgeschickt wird
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

        // HIER WIRD ES DIREKT VOM REICH ABGEZOGEN:
        attacker.troops -= sendTroops;

        let calculatedSpeed = Math.max(0.001, 0.0035 / (minCoastDist / 45));
        if (typeof mapPOIs !== 'undefined') {
            const hasPort = mapPOIs.some(p => p.type === 'port' && ownerGrid[p.idx] === attackerId);
            if (hasPort) {
                calculatedSpeed *= 1.6;
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

    // Laufende Angriffe gegen denselben Gegner bündeln
    for (const atk of activeAttacks) {
        if (atk.attackerId === attackerId && atk.targetOwnerId === targetOwnerId) {
            attacker.troops -= sendTroops; // Sofortiger Abzug vom Hauptlager
            atk.troops += sendTroops;
            atk.maxTroops = Math.max(atk.maxTroops || atk.troops, atk.troops);
            const merged = new Set([...atk.frontier, ...frontierSet]);
            atk.frontier = Array.from(merged);
            return true;
        }
    }

    // HIER WIRD ES DIREKT VOM REICH ABGEZOGEN:
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
        efficiencyRatio: 1.0,
        stepAccum: 1.0
    });
    return true;
}

function processActiveAttacks() {
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
                efficiencyRatio: 1.0,
                stepAccum: 1.0
            });

            addVisualEffect(fleet.targetX, fleet.targetY, '⚓ Invasion gelandet!', '#38bdf8', '🔥');
            activeFleets.splice(f, 1);
            mapDirty = true;
        }
    }

    if (activeAttacks.length === 0 && activeFleets.length === 0) return;

    let anyPixelChanged = false;
    const sizeScale = (650 * 650) / TOTAL_CELLS;
    const baseNeutralCost = Math.max(0.3, 0.8 * sizeScale);

    for (let i = activeAttacks.length - 1; i >= 0; i--) {
        const atk = activeAttacks[i];
        const attacker = factions[atk.attackerId];

        if (!attacker || !attacker.alive || atk.troops < 2 || atk.frontier.length === 0) {
            if (attacker && attacker.alive && atk.troops > 0) {
                // Resttruppen der Welle kehren ordnungsgemäß ins Hauptlager zurück
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
            if (ownerGrid[cIdx] === atk.targetOwnerId && isWalkable) {
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
        const isPlayerRush = atk.attackerId === OWNER_PLAYER && typeof buffRushTicks !== 'undefined' && buffRushTicks > 0;
        const defender = atk.targetOwnerId > 0 ? factions[atk.targetOwnerId] : null;

        let ratio = 1.6;
        let defTroopsPerPixel = 0;

        if (defender && defender.alive && defender.landCount > 0) {
            ratio = atk.troops / Math.max(10, defender.troops);
            defTroopsPerPixel = defender.troops / defender.landCount;
        }
        atk.efficiencyRatio = ratio;

        // WENN DU UNTERLEGEN BIST: Deine Welle blutet massiv aus und zieht dem Feind echten Schaden ab!
        if (defender && defender.alive && defender.troops > 20 && ratio < 0.90) {
            const heavyAttrition = Math.max(40, atk.troops * 0.25);
            atk.troops -= heavyAttrition;

            // Der Verteidiger verliert durch den Abwehrkampf ebenfalls Truppen (Verteidigungsboni greifen hier)
            const defLoss = Math.floor(heavyAttrition * 0.75);
            defender.troops = Math.max(0, defender.troops - defLoss);

            if (atk.troops < 5) {
                activeAttacks.splice(i, 1);
            }
            continue; // Kein Landgewinn, solange du unterlegen bist!
        }

        let stepSpeed = atk.targetOwnerId === OWNER_NEUTRAL ? 0.65 : (ratio > 1.8 ? 0.85 : 0.5);
        if (isPlayerRush) stepSpeed *= 1.8;

        atk.stepAccum = (atk.stepAccum || 0) + stepSpeed;
        if (atk.stepAccum < 1.0) continue;
        atk.stepAccum -= 1.0;

        for (let j = 0; j < validTargets.length; j++) {
            const targetIdx = validTargets[j];
            if (processedThisStep.has(targetIdx)) continue;
            processedThisStep.add(targetIdx);

            let terrainFactor = 1.0 + Math.max(0, elevationGrid[targetIdx]) * 0.8;
            let attackerCost = 0;
            let defenderLossTotal = 0;
            const poiOnField = (typeof mapPOIs !== 'undefined') ? mapPOIs.find(p => p.idx === targetIdx) : null;

            if (ownerGrid[targetIdx] === OWNER_NEUTRAL) {
                attackerCost = baseNeutralCost * terrainFactor;
            } else if (!defender || !defender.alive || defender.troops <= 1) {
                attackerCost = baseNeutralCost * 0.2 * terrainFactor;
            } else {
                const baseTileDefense = Math.max(1.0, defTroopsPerPixel);
                attackerCost = baseTileDefense * (1.1 / ratio) * terrainFactor;
                
                // SHOP-BONI DES GEGNERS EINRECHNEN (z.B. Grenzfestungen / Schutz-Level):
                let defBonusMultiplier = 1.0;
                if (defender.id === OWNER_PLAYER && typeof upgradeFortLevel !== 'undefined' && upgradeFortLevel > 0) {
                    defBonusMultiplier += upgradeFortLevel * 0.25; // Shop-Schutz greift hier direkt!
                }
                
                // Exakter direkter Schaden an der Mannstärke des Gegners unter Berücksichtigung des Shop-Bonus
                defenderLossTotal = (baseTileDefense * ratio * 1.3) / defBonusMultiplier;
            }

            attackerCost = Math.max(2, Math.min(atk.troops * 0.12, attackerCost));

            if (atk.troops >= attackerCost) {
                atk.troops -= attackerCost;

                if (defender && defender.alive) {
                    // Zieht die Verluste direkt von der Hauptarmee des Gegners ab -> Zahlen im Reich sinken live!
                    defender.troops = Math.max(0, defender.troops - defenderLossTotal);
                    defender.landCount = Math.max(0, defender.landCount - 1);
                }

                if (poiOnField && poiOnField.type === 'capital' && poiOnField.factionId === atk.targetOwnerId) {
                    if (defender && defender.alive) {
                        const plunder = Math.floor(defender.troops * 0.25);
                        defender.troops = Math.max(0, defender.troops - plunder);
                        attacker.troops += plunder;

                        const conqueror = factions[atk.attackerId];
                        const cName = conqueror ? conqueror.name : 'Feind';

                        addVisualEffect(poiOnField.x, poiOnField.y, `👑 Hauptstadt gefallen an ${cName}!`, '#f59e0b', '💥');
                        if (typeof playSoundCapitalFall === 'function') playSoundCapitalFall();

                        mapPOIs = mapPOIs.filter(p => p !== poiOnField);
                        mapDirty = true;
                    }
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
                        if (ownerGrid[nIdx] === atk.targetOwnerId && isWalkable) {
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