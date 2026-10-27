/***********************************************************************
         * 3. GRENZEN & SCHWERPUNKTE BERECHNEN
         ***********************************************************************/
        function updateBordersAndCentroids() {
            for (let i = 1; i < factions.length; i++) {
                const f = factions[i];
                if (!f) continue;
                f.landCount = 0;
                f.sumX = 0;
                f.sumY = 0;
                f.neighbors.clear();
                f.hasNeutralNeighbor = false;
            }

            for (let y = 0; y < GRID_H; y++) {
                const rowOffset = y * GRID_W;
                for (let x = 0; x < GRID_W; x++) {
                    const idx = rowOffset + x;
                    const owner = ownerGrid[idx];

                    if (owner <= 0) {
                        borderMask[idx] = 0;
                        continue;
                    }

                    const f = factions[owner];
                    if (f) {
                        f.landCount++;
                        f.sumX += x;
                        f.sumY += y;
                    }

                    let isBorder = 0;
                    if (x > 0 && ownerGrid[idx - 1] !== owner) {
                        isBorder = 1;
                        const no = ownerGrid[idx - 1];
                        if (f) { if (no === OWNER_NEUTRAL) f.hasNeutralNeighbor = true; else if (no > 0) f.neighbors.add(no); }
                    }
                    if (x < GRID_W - 1 && ownerGrid[idx + 1] !== owner) {
                        isBorder = 1;
                        const no = ownerGrid[idx + 1];
                        if (f) { if (no === OWNER_NEUTRAL) f.hasNeutralNeighbor = true; else if (no > 0) f.neighbors.add(no); }
                    }
                    if (y > 0 && ownerGrid[idx - GRID_W] !== owner) {
                        isBorder = 1;
                        const no = ownerGrid[idx - GRID_W];
                        if (f) { if (no === OWNER_NEUTRAL) f.hasNeutralNeighbor = true; else if (no > 0) f.neighbors.add(no); }
                    }
                    if (y < GRID_H - 1 && ownerGrid[idx + GRID_W] !== owner) {
                        isBorder = 1;
                        const no = ownerGrid[idx + GRID_W];
                        if (f) { if (no === OWNER_NEUTRAL) f.hasNeutralNeighbor = true; else if (no > 0) f.neighbors.add(no); }
                    }

                    borderMask[idx] = isBorder;
                }
            }

            for (let i = 1; i < factions.length; i++) {
                const f = factions[i];
                if (!f) continue;
                if (f.landCount > 0) {
                    f.alive = true;
                    f.centroidX = f.sumX / f.landCount;
                    f.centroidY = f.sumY / f.landCount;
                } else if (f.alive && appPhase === 'PLAYING') {
                    f.alive = false;
                    f.troops = 0;
                }
            }
        }