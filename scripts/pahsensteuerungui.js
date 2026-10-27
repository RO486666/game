/***********************************************************************
 * 7. HD-RENDERING, FRONT-FEEDBACK & UI-STEUERUNG (KOMPLETT & SAUBER)
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
                if (isPlayer) {
                    pixelBuffer[idx] = packRGBA(255, 250, 200);
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

    const halfW = (viewW / 2) / camZoom;
    const halfH = (viewH / 2) / camZoom;
    const minVisibleX = camX - halfW - 30;
    const maxVisibleX = camX + halfW + 30;
    const minVisibleY = camY - halfH - 30;
    const maxVisibleY = camY + halfH + 30;

    // ==========================================
    // SPAWN-PHASE
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
    // STRATEGISCHE KNOTENPUNKTE (POIs)
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
    // FRONT-FEEDBACK & BALKEN
    // ==========================================
    if (appPhase === 'PLAYING' && typeof activeAttacks !== 'undefined' && activeAttacks.length > 0) {
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

    // ==========================================
    // FRAKTIONEN & TRUPPENLABELS
    // ==========================================
    for (let i = 1; i < factions.length; i++) {
        const f = factions[i];
        if (!f || !f.alive || f.landCount < 6) continue;

        const cx = f.centroidX + 0.5;
        const cy = f.centroidY + 0.5;

        if (cx < minVisibleX || cx > maxVisibleX || cy < minVisibleY || cy > maxVisibleY) continue;

        const isPlayer = i === OWNER_PLAYER;
        const radiusWorld = Math.sqrt(f.landCount / Math.PI);
        const radiusScreen = radiusWorld * camZoom;

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

    // ==========================================
    // SCHIFFSFLOTTEN
    // ==========================================
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

    // ==========================================
    // VISUELLE EFFEKTE
    // ==========================================
    for (let i = visualEffects.length - 1; i >= 0; i--) {
        const eff = visualEffects[i];
        if (eff.x < minVisibleX || eff.x > maxVisibleX || eff.y < minVisibleY || eff.y > maxVisibleY) {
            eff.age++;
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

/***********************************************************************
 * 8. PHASEN-STEUERUNG & UI-UPDATES
 ***********************************************************************/
function setPhase(newPhase) {
    appPhase = newPhase;

    const menuEl = document.getElementById('menuScreen');
    const spawnEl = document.getElementById('spawnScreen');
    const hudEl = document.getElementById('gameHud');
    const modalEl = document.getElementById('endModal');

    menuEl.classList.add('hidden');
    spawnEl.classList.add('hidden');
    spawnEl.classList.remove('flex');
    hudEl.classList.add('hidden');
    hudEl.classList.remove('flex');
    modalEl.classList.add('hidden');
    modalEl.classList.remove('flex');

    if (newPhase === 'MENU') {
        menuEl.classList.remove('hidden');
        fitCameraToMap();
        renderMiniPreview();
    } else if (newPhase === 'SPAWN') {
        spawnEl.classList.remove('hidden');
        spawnEl.classList.add('flex');
        fitCameraToMap();
        updateSpawnConfirmButton();
    } else if (newPhase === 'PLAYING') {
        hudEl.classList.remove('hidden');
        hudEl.classList.add('flex');
    }
}

function updateSpawnConfirmButton() {
    const btn = document.getElementById('confirmSpawnBtn');
    const txt = document.getElementById('confirmSpawnText');
    const hint = document.getElementById('spawnCoordHint');

    if (selectedSpawnPoint) {
        btn.disabled = false;
        btn.className = 'w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base shadow-2xl transition flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] text-slate-950 border border-emerald-300 cursor-pointer';
        txt.textContent = '🔥 HIER STARTEN & SCHLACHT BEGINNEN';
        hint.textContent = `Startpunkt (${selectedSpawnPoint.x}, ${selectedSpawnPoint.y}) gewählt – bereit!`;
    } else {
        btn.disabled = true;
        btn.className = 'w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base shadow-2xl transition flex items-center justify-center gap-2 bg-slate-800/90 text-slate-400 border border-slate-700 cursor-not-allowed';
        txt.textContent = '👆 TIPPE AUF LAND FÜR DEINEN STARTPUNKT';
        hint.textContent = 'Zoomen mit 2 Fingern • Ziehen zum Bewegen';
    }
}

function updateUI() {
    if (appPhase !== 'PLAYING' && appPhase !== 'ENDED') return;

    const player = factions[OWNER_PLAYER];
    const sliderVal = parseInt(document.getElementById('hudAttackSlider').value, 10);
    const capMult = getCapPerPixel();

    if (player && player.alive) {
        const [r, g, b] = player.color;
        document.getElementById('hudPlayerDot').style.backgroundColor = `rgb(${r},${g},${b})`;

        const maxCap = player.landCount * capMult;
        const landPct = totalLandCells > 0 ? (player.landCount / totalLandCells) * 100 : 0;
        const interestRate = getInterestRate(player) * 100;
        const estIncome = Math.floor(player.landCount * (capMult * 0.015) + player.troops * getInterestRate(player));

        document.getElementById('hudTroops').textContent = formatNumber(player.troops);
        document.getElementById('hudMaxCap').textContent = formatNumber(maxCap);
        document.getElementById('hudLandPct').textContent = landPct.toFixed(1) + '%';
        document.getElementById('hudInterest').textContent = interestRate.toFixed(1) + '%';
        document.getElementById('hudIncome').textContent = '+' + formatNumber(estIncome);

        const goldEl = document.getElementById('hudGold');
        if (goldEl && typeof playerGold !== 'undefined') {
            goldEl.textContent = '💰 ' + formatNumber(playerGold);
        }

        if (typeof currentSeason !== 'undefined') {
            const seasonIcons = { SPRING: '🌸 Frühling', SUMMER: '☀️ Sommer', AUTUMN: '🍂 Herbst', WINTER: '❄️ Winter' };
            const seasonEl = document.getElementById('hudSeason');
            if (seasonEl) seasonEl.textContent = seasonIcons[currentSeason] || '🌸';
        }

        const stabEl = document.getElementById('hudStability');
        if (stabEl && typeof player.stability !== 'undefined') {
            stabEl.textContent = `${player.stability}%`;
            stabEl.className = player.stability < 35 
                ? 'mono-num text-xs font-extrabold text-rose-500 mt-0.5' 
                : 'mono-num text-xs font-extrabold text-emerald-400 mt-0.5';
        }

        const sendAmount = Math.floor(player.troops * (sliderVal / 100));
        document.getElementById('hudSliderTroops').textContent = formatNumber(sendAmount);
    }

    const cyclePct = (currentCycleTick / CYCLE_DURATION_TICKS) * 100;
    document.getElementById('hudCycleBar').style.width = cyclePct + '%';

    const lbContent = document.getElementById('leaderboardContent');
    if (factions.length > 1) {
        const sorted = factions
            .slice(1)
            .filter(f => f && f.alive)
            .sort((a, b) => b.landCount - a.landCount || b.troops - a.troops)
            .slice(0, 8);

        lbContent.innerHTML = sorted.map((f, idx) => {
            const pct = totalLandCells > 0 ? ((f.landCount / totalLandCells) * 100).toFixed(1) : '0.0';
            const [r, g, b] = f.color;
            const isPlayer = f.id === OWNER_PLAYER;
            return `
                <div class="flex items-center justify-between px-2 py-1 rounded-lg ${isPlayer ? 'bg-sky-500/25 border border-sky-400/40 font-bold shadow-[0_0_8px_rgba(56,189,248,0.4)]' : 'bg-slate-800/50'}">
                    <div class="flex items-center gap-1.5 truncate">
                        <span class="mono-num text-[10px] text-slate-400 w-3.5">${idx + 1}.</span>
                        <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_4px_rgba(${r},${g},${b},0.8)]" style="background: rgb(${r},${g},${b})"></span>
                        <span class="truncate ${isPlayer ? 'text-amber-300' : 'text-slate-200'}">${f.name}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 mono-num text-[11px]">
                        <span class="text-emerald-400">${pct}%</span>
                        <span class="text-slate-300 w-10 text-right">${formatNumber(f.troops)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

/***********************************************************************
 * 9. KAMERA & GESTEN
 ***********************************************************************/
function resizeViewportCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
}

function getMinZoom() {
    return Math.min((viewW * 0.94) / GRID_W, (viewH * 0.72) / GRID_H);
}

function fitCameraToMap() {
    resizeViewportCanvas();
    targetCamX = null;
    camX = GRID_W / 2;
    camY = GRID_H / 2;
    camZoom = getMinZoom();
}

function smoothFocusOn(gx, gy, zoom) {
    targetCamX = gx;
    targetCamY = gy;
    targetCamZoom = Math.max(getMinZoom(), Math.min(18, zoom));
}

function screenToGrid(screenX, screenY) {
    const worldX = (screenX - viewW / 2) / camZoom + camX;
    const worldY = (screenY - viewH / 2) / camZoom + camY;
    return {
        x: Math.floor(worldX),
        y: Math.floor(worldY)
    };
}

function handleCanvasTap(screenX, screenY) {
    if (typeof initAudio === 'function') {
        initAudio();
    }

    const { x, y } = screenToGrid(screenX, screenY);
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;

    const idx = y * GRID_W + x;

    if (appPhase === 'SPAWN') {
        if (terrainGrid[idx] === TERRAIN_LAND) {
            selectedSpawnPoint = { x, y };
            addVisualEffect(x, y, 'Startpunkt gesetzt', '#38bdf8', '📍');
            updateSpawnConfirmButton();
        } else if (terrainGrid[idx] === TERRAIN_MOUNTAIN) {
            addVisualEffect(x, y, 'Unpassierbares Hochgebirge!', '#f59e0b', '🏔️');
        } else {
            addVisualEffect(x, y, 'Nur auf Festland möglich!', '#f43f5e', '🌊');
        }
        return;
    }

    if (appPhase === 'PLAYING') {
        const targetOwner = ownerGrid[idx];

        if (targetOwner === OWNER_PLAYER) {
            addVisualEffect(x, y, 'Dein Reich', '#fde047', '👑');
            return;
        }
        if (targetOwner === OWNER_MOUNTAIN) {
            addVisualEffect(x, y, 'Hochgebirge unpassierbar!', '#94a3b8', '🏔️');
            return;
        }
        if (targetOwner === OWNER_WATER) return;

        const pct = parseInt(document.getElementById('hudAttackSlider').value, 10) / 100;
        initiateAttack(OWNER_PLAYER, targetOwner, pct, x, y);
    }
}

let pointerDown = false;
let startX = 0;
let startY = 0;
let movedDist = 0;
let lastPinchDist = null;

canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    pointerDown = true;
    targetCamX = null;
    startX = e.clientX;
    startY = e.clientY;
    movedDist = 0;
});

window.addEventListener('mousemove', (e) => {
    if (!pointerDown) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    movedDist += Math.hypot(dx, dy);

    camX = Math.max(0, Math.min(GRID_W, camX - dx / camZoom));
    camY = Math.max(0, Math.min(GRID_H, camY - dy / camZoom));

    startX = e.clientX;
    startY = e.clientY;
});

window.addEventListener('mouseup', (e) => {
    if (!pointerDown) return;
    pointerDown = false;
    if (movedDist < 8) {
        handleCanvasTap(e.clientX, e.clientY);
    }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    targetCamX = null;
    const zoomFactor = e.deltaY < 0 ? 1.16 : 0.86;
    const newZoom = Math.max(getMinZoom() * 0.75, Math.min(20, camZoom * zoomFactor));

    const wxBefore = (e.clientX - viewW / 2) / camZoom + camX;
    const wyBefore = (e.clientY - viewH / 2) / camZoom + camY;
    camZoom = newZoom;
    const wxAfter = (e.clientX - viewW / 2) / camZoom + camX;
    const wyAfter = (e.clientY - viewH / 2) / camZoom + camY;

    camX += wxBefore - wxAfter;
    camY += wyBefore - wyAfter;
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    targetCamX = null;
    if (e.touches.length === 1) {
        pointerDown = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        movedDist = 0;
        lastPinchDist = null;
    } else if (e.touches.length === 2) {
        pointerDown = false;
        lastPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && pointerDown) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        movedDist += Math.hypot(dx, dy);

        camX = Math.max(0, Math.min(GRID_W, camX - dx / camZoom));
        camY = Math.max(0, Math.min(GRID_H, camY - dy / camZoom));

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && lastPinchDist !== null) {
        const newDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const scale = newDist / lastPinchDist;
        const newZoom = Math.max(getMinZoom() * 0.75, Math.min(20, camZoom * scale));

        const wxBefore = (centerX - viewW / 2) / camZoom + camX;
        const wyBefore = (centerY - viewH / 2) / camZoom + camY;
        camZoom = newZoom;
        const wxAfter = (centerX - viewW / 2) / camZoom + camX;
        const wyAfter = (centerY - viewH / 2) / camZoom + camY;

        camX += wxBefore - wxAfter;
        camY += wyBefore - wyAfter;
        lastPinchDist = newDist;
    }
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    if (pointerDown && e.changedTouches.length > 0 && movedDist < 11) {
        handleCanvasTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    if (e.touches.length === 0) {
        pointerDown = false;
        lastPinchDist = null;
    }
});

window.addEventListener('resize', () => {
    resizeViewportCanvas();
});
