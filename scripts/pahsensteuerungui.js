/***********************************************************************
 * 7. HD-RENDERING, FRONT-FEEDBACK & UI-STEUERUNG (OPTIMIERT & OPTISCH SCHÖNER)
 ***********************************************************************/
function updateMapPixelBuffer() {
    for (let idx = 0; idx < TOTAL_CELLS; idx++) {
        const owner = ownerGrid[idx];

        if (owner <= 0) {
            pixelBuffer[idx] = packRGBA(baseR[idx], baseG[idx], baseB[idx]);
        } else {
            const f = factions[owner];
            const rgb = f ? f.color : [200, 200, 200];
            const isPlayer = owner === OWNER_PLAYER;

            if (borderMask[idx] === 1) {
                // SCHÖNER AUSSENBEGRENZUNG: Feine, elegante Kontur statt grober Blöcke
                if (isPlayer) {
                    pixelBuffer[idx] = packRGBA(255, 250, 200); // Edler Gold-/Weißton für den Spieler
                } else {
                    pixelBuffer[idx] = packRGBA(
                        Math.max(10, (rgb[0] * 30) >> 8),
                        Math.max(10, (rgb[1] * 30) >> 8),
                        Math.max(10, (rgb[2] * 30) >> 8)
                    );
                }
            } else {
                let r = (rgb[0] * 145 + baseR[idx] * 110) >> 8;
                let g = (rgb[1] * 145 + baseG[idx] * 110) >> 8;
                let b = (rgb[2] * 145 + baseB[idx] * 110) >> 8;

                if (isPlayer) {
                    r = Math.min(255, r + 18);
                    g = Math.min(255, g + 18);
                    b = Math.min(255, b + 18);
                }
                pixelBuffer[idx] = packRGBA(r, g, b);
            }
        }
    }

    mapCtx.putImageData(mapImageData, 0, 0);
    mapDirty = false;
}

function renderFrame(now) {
    if (mapDirty) {
        updateMapPixelBuffer();
    }

    if (targetCamX !== null) {
        camX += (targetCamX - camX) * 0.18;
        camY += (targetCamY - camY) * 0.18;
        camZoom += (targetCamZoom - camZoom) * 0.18;
        if (Math.hypot(targetCamX - camX, targetCamY - camY) < 0.25 && Math.abs(targetCamZoom - camZoom) < 0.03) {
            targetCamX = null;
        }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#030914';
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.translate(viewW / 2, viewH / 2);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camX, -camY);

    ctx.imageSmoothingEnabled = camZoom < 1.35;
    ctx.drawImage(mapCanvas, 0, 0);

    // Berechnen des sichtbaren Bildschirm-Bereichs (View-Frustum Culling gegen Lag)
    const halfW = (viewW / 2) / camZoom;
    const halfH = (viewH / 2) / camZoom;
    const minVisibleX = camX - halfW - 20;
    const maxVisibleX = camX + halfW + 20;
    const minVisibleY = camY - halfH - 20;
    const maxVisibleY = camY + halfH + 20;

    // ==========================================
    // SPAWN-PHASE: BOT-SPAWNS & EIGENER PUNKT
    // ==========================================
    if (appPhase === 'SPAWN') {
        if (window.previewBotSpawns && window.previewBotSpawns.length > 0) {
            const botPulse = (Math.sin(now / 220) + 1) * 0.5;
            const botRad = Math.max(5, Math.round(GRID_W * 0.010));

            for (const bot of window.previewBotSpawns) {
                if (bot.x < minVisibleX || bot.x > maxVisibleX || bot.y < minVisibleY || bot.y > maxVisibleY) continue;
                const bx = bot.x + 0.5;
                const by = bot.y + 0.5;
                const [br, bg, bb] = bot.color;

                ctx.beginPath();
                ctx.arc(bx, by, botRad + (3 + botPulse * 6) / camZoom, 0, Math.PI * 2);
                ctx.lineWidth = 1.6 / camZoom;
                ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 - botPulse * 0.45})`;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(bx, by, botRad, 0, Math.PI * 2);
                ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
                ctx.fill();
                ctx.lineWidth = 1.4 / camZoom;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();

                const skullSize = Math.max(9 / camZoom, botRad * 1.15);
                ctx.font = `${skullSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💀', bx, by);
            }
        }

        if (selectedSpawnPoint) {
            const sx = selectedSpawnPoint.x + 0.5;
            const sy = selectedSpawnPoint.y + 0.5;
            const pulse = (Math.sin(now / 180) + 1) * 0.5;
            const [r, g, b] = PALETTE[selectedColorIdx].rgb;
            const previewRad = Math.max(6, Math.round(GRID_W * 0.012));

            ctx.beginPath();
            ctx.arc(sx, sy, previewRad, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.90)`;
            ctx.fill();
            ctx.lineWidth = 2.0 / camZoom;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(sx, sy, previewRad + (4 + pulse * 10) / camZoom, 0, Math.PI * 2);
            ctx.lineWidth = 2.4 / camZoom;
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.95 - pulse * 0.65})`;
            ctx.stroke();

            const labelPx = Math.max(12 / camZoom, previewRad * 0.9);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.font = `900 ${labelPx}px Inter, sans-serif`;
            ctx.lineWidth = labelPx * 0.25;
            ctx.strokeStyle = 'rgba(0,0,0,0.92)';
            ctx.fillStyle = '#38bdf8';
            const pinY = sy - previewRad - (6 / camZoom);
            ctx.strokeText('📍 HIER STARTEN', sx, pinY);
            ctx.fillText('📍 HIER STARTEN', sx, pinY);
        }
    }

    // ==========================================
    // STRATEGISCHE KNOTENPUNKTE (HAUPTSTÄDTE, MINEN, HÄFEN)
    // ==========================================
    if (typeof mapPOIs !== 'undefined' && mapPOIs.length > 0) {
        for (const poi of mapPOIs) {
            if (poi.x < minVisibleX || poi.x > maxVisibleX || poi.y < minVisibleY || poi.y > maxVisibleY) continue;
            const px = poi.x + 0.5;
            const py = poi.y + 0.5;
            const landOwnerId = ownerGrid[poi.idx] > 0 ? ownerGrid[poi.idx] : poi.factionId;
            const ownerFaction = factions[landOwnerId];
            const [fr, fg, fb] = ownerFaction ? ownerFaction.color : [148, 163, 184];

            const baseRad = Math.max(5.5, 7.5 / camZoom);
            ctx.beginPath();
            ctx.arc(px, py, baseRad, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${fr}, ${fg}, ${fb})`;
            ctx.fill();
            ctx.lineWidth = 1.2 / camZoom;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            const iconSize = Math.max(8, 10 / camZoom);
            ctx.font = `${iconSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(poi.icon, px, py);

            if (camZoom > 1.25) {
                const labelSize = 7.0 / camZoom;
                ctx.font = `700 ${labelSize}px Inter, sans-serif`;
                ctx.fillStyle = '#cbd5e1';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.lineWidth = labelSize * 0.25;
                ctx.strokeText(poi.name, px, py - baseRad - (2 / camZoom));
                ctx.fillText(poi.name, px, py - baseRad - (2 / camZoom));
            }
        }
    }

    // ==========================================
    // FRONT-FEEDBACK: FUNKEN & BALKEN (NUR WENN NAH GENUG GEZOOMT)
    // ==========================================
    if (appPhase === 'PLAYING' && typeof activeAttacks !== 'undefined' && activeAttacks.length > 0) {
        // Culling: Wenn man sehr weit herausgezoomt ist (< 0.55), werden Front-Funken komplett deaktiviert, um Lag zu verhindern!
        const renderFrontDetails = camZoom > 0.52;

        for (const atk of activeAttacks) {
            if (!atk.frontier || atk.frontier.length === 0) continue;

            const fx = atk.frontCenterX || (atk.frontier[0] % GRID_W);
            const fy = atk.frontCenterY || Math.floor(atk.frontier[0] / GRID_W);
            if (fx < minVisibleX || fx > maxVisibleX || fy < minVisibleY || fy > maxVisibleY) continue;

            if (renderFrontDetails) {
                const sparkCount = Math.min(5, Math.max(1, Math.floor(atk.frontier.length / 12)));
                for (let s = 0; s < sparkCount; s++) {
                    const rndIdx = atk.frontier[Math.floor(Math.random() * atk.frontier.length)];
                    const sx = (rndIdx % GRID_W) + (Math.random() - 0.5);
                    const sy = Math.floor(rndIdx / GRID_W) + (Math.random() - 0.5);

                    ctx.beginPath();
                    ctx.arc(sx, sy, (1.6 + Math.random() * 2.0) / camZoom, 0, Math.PI * 2);
                    ctx.fillStyle = Math.random() > 0.4 ? '#fbbf24' : '#ef4444';
                    ctx.fill();
                }

                const isPlayerAtk = atk.attackerId === OWNER_PLAYER;
                const isPlayerDef = atk.targetOwnerId === OWNER_PLAYER;

                if (isPlayerAtk || isPlayerDef || camZoom > 1.4) {
                    const barW = Math.max(28 / camZoom, 38 / camZoom);
                    const barH = 5 / camZoom;
                    const bx = (fx + 0.5) - barW / 2;
                    const by = (fy + 0.5) - (14 / camZoom);

                    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
                    ctx.fillRect(bx - 1 / camZoom, by - 1 / camZoom, barW + 2 / camZoom, barH + 2 / camZoom);

                    let barColor = '#10b981';
                    let statusIcon = '⚔️';
                    const ratio = atk.efficiencyRatio || 1.0;

                    if (ratio < 0.35) {
                        barColor = '#ef4444';
                        statusIcon = '💀';
                    } else if (ratio < 0.95) {
                        barColor = '#f59e0b';
                        statusIcon = '🛡️';
                    } else {
                        barColor = '#10b981';
                        statusIcon = '⚡';
                    }

                    const maxT = atk.maxTroops || atk.initialTroops || atk.troops || 1;
                    const remainPct = Math.max(0.06, Math.min(1.0, atk.troops / maxT));

                    ctx.fillStyle = barColor;
                    ctx.fillRect(bx, by, barW * remainPct, barH);

                    const txtSize = 9 / camZoom;
                    ctx.font = `800 ${txtSize}px "JetBrains Mono", monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
                    ctx.lineWidth = txtSize * 0.25;
                    ctx.strokeText(`${statusIcon} ${formatNumber(atk.troops)}`, fx + 0.5, by - 2 / camZoom);
                    ctx.fillText(`${statusIcon} ${formatNumber(atk.troops)}`, fx + 0.5, by - 2 / camZoom);
                }
            }
        }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Fraktionen / Truppenlabels (Werden automatisch ausgeblendet, wenn sie außerhalb des Bildschirms liegen oder zu klein sind)
    for (let i = 1; i < factions.length; i++) {
        const f = factions[i];
        if (!f || !f.alive || f.landCount < 6) continue;

        const cx = f.centroidX + 0.5;
        const cy = f.centroidY + 0.5;

        // Culling: Liegt das Reich außerhalb des sichtbaren Fensters? Überspringen!
        if (cx < minVisibleX || cx > maxVisibleX || cy < minVisibleY || cy > maxVisibleY) continue;

        const isPlayer = i === OWNER_PLAYER;
        const radiusWorld = Math.sqrt(f.landCount / Math.PI);
        const radiusScreen = radiusWorld * camZoom;

        // Wenn herausgezoomt und das Reich zu klein ist, Text weglassen, um das Ruckeln komplett zu killen
        if (!isPlayer && radiusScreen < 12) continue;

        if (isPlayer) {
            const pRing = (Math.sin(now / 220) + 1) * 0.5;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(6 / camZoom, radiusWorld * 0.58) + (pRing * 5) / camZoom, 0, Math.PI * 2);
            ctx.lineWidth = 2.0 / camZoom;
            ctx.strokeStyle = `rgba(253, 224, 71, ${0.75 - pRing * 0.55})`;
            ctx.stroke();
        }

        const idealScreenPx = Math.max(isPlayer ? 12 : 9.5, Math.min(24, radiusScreen * 0.36));
        const fontSize = idealScreenPx / camZoom;

        ctx.font = `800 ${fontSize}px Inter, sans-serif`;
        ctx.lineWidth = fontSize * 0.28;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillStyle = isPlayer ? '#fde047' : '#ffffff';

        const displayName = isPlayer ? `👑 ${f.name}` : f.name;
        ctx.strokeText(displayName, cx, cy - fontSize * 0.58);
        ctx.fillText(displayName, cx, cy - fontSize * 0.58);

        const numSize = fontSize * 0.88;
        ctx.font = `700 ${numSize}px "JetBrains Mono", monospace`;
        const troopStr = formatNumber(f.troops);
        ctx.strokeText(troopStr, cx, cy + fontSize * 0.58);
        ctx.fillStyle = isPlayer ? '#ffffff' : '#f8fafc';
        ctx.fillText(troopStr, cx, cy + fontSize * 0.58);
    }

    // Schiffsflotten (nur wenn im Bild)
    if (typeof activeFleets !== 'undefined') {
        for (const fleet of activeFleets) {
            if (fleet.currX < minVisibleX || fleet.currX > maxVisibleX || fleet.currY < minVisibleY || fleet.currY > maxVisibleY) continue;
            const fx = fleet.currX + 0.5;
            const fy = fleet.currY + 0.5;
            const [r, g, b] = factions[fleet.attackerId] ? factions[fleet.attackerId].color : [56, 189, 248];

            ctx.beginPath();
            ctx.arc(fx, fy, 5 / camZoom, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();
            ctx.lineWidth = 1.5 / camZoom;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            const fSize = 10 / camZoom;
            ctx.font = `800 ${fSize}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = 'rgba(0,0,0,0.95)';
            ctx.lineWidth = fSize * 0.25;
            ctx.strokeText(`🚢 ${formatNumber(fleet.troops)}`, fx, fy - 11 / camZoom);
            ctx.fillText(`🚢 ${formatNumber(fleet.troops)}`, fx, fy - 11 / camZoom);
        }
    }

    // Visuelle Effekte / Pings (nur im sichtbaren Ausschnitt)
    for (let i = visualEffects.length - 1; i >= 0; i--) {
        const eff = visualEffects[i];
        if (eff.x < minVisibleX || eff.x > maxVisibleX || eff.y < minVisibleY || eff.y > maxVisibleY) {
            eff.age++; // Trotzdem altern lassen, damit sie im Hintergrund sauber ablaufen
            if (eff.age >= eff.maxAge) visualEffects.splice(i, 1);
            continue;
        }

        eff.age++;
        const progress = eff.age / eff.maxAge;
        const alpha = Math.max(0, 1 - progress);

        ctx.beginPath();
        ctx.arc(eff.x, eff.y, (4 + progress * 22) / camZoom, 0, Math.PI * 2);
        ctx.lineWidth = 2.5 / camZoom;
        ctx.strokeStyle = eff.color;
        ctx.globalAlpha = alpha;
        ctx.stroke();

        const effFont = 12.5 / camZoom;
        ctx.font = `800 ${effFont}px Inter, sans-serif`;
        ctx.lineWidth = effFont * 0.25;
        ctx.strokeStyle = 'rgba(0,0,0,0.95)';
        ctx.fillStyle = eff.color;
        const floatY = eff.y - (8 + progress * 18) / camZoom;
        ctx.strokeText(`${eff.icon} ${eff.text}`, eff.x, floatY);
        ctx.fillText(`${eff.icon} ${eff.text}`, eff.x, floatY);
        ctx.globalAlpha = 1.0;

        if (eff.age >= eff.maxAge) {
            visualEffects.splice(i, 1);
        }
    }

    ctx.restore();
}
