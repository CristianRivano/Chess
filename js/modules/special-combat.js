/** Battle Chess — combates especiales y animaciones de captura */
        function playCombatSound(pieceType, isMate = false) {
            if (isMate) return playSound('mate');
            const sounds = { r: 'combat-rook', n: 'combat-knight', b: 'combat-bishop', q: 'combat-queen', k: 'combat-king', p: 'combat-pawn' };
            playSound(sounds[pieceType] || 'combat-pawn');
        }

        function showCombatBanner(text) {
            const overlay = document.getElementById('combat-overlay');
            const log = document.getElementById('combat-log');
            log.textContent = text;
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
            clearTimeout(window.bannerTimeout);
            window.bannerTimeout = setTimeout(() => {
                overlay.classList.remove('opacity-100');
                overlay.classList.add('opacity-0');
            }, 2200);
        }

        function executeAnimatedMove(moveObj) {
            const fromCoords = squareToCoords(moveObj.from);
            const toCoords = squareToCoords(moveObj.to);
            const isCapture = Boolean(moveObj.captured);

            activeAnim = {
                moveObj,
                fromCol: fromCoords.col,
                fromRow: fromCoords.row,
                toCol: toCoords.col,
                toRow: toCoords.row,
                progress: 0,
                phase: 'approach',
                clashProgress: 0,
                isCapture,
                soundPlayed: false,
                stepTimer: 0
            };

            addMoveTrail(fromCoords.col, fromCoords.row, toCoords.col, toCoords.row,
                moveObj.color === 'w' ? '#FDF3E7' : '#E5A853');
            if (rapidMode) rapidStarted = true;
            playSound('paper');

            if (!isCapture) {
                const moverName = PIECE_NAMES[moveObj.piece] || 'Guerrero';
                showCombatBanner(`¡${moverName} entra en escena!`);
            }

            if (isCapture) {
                const attackerName = PIECE_NAMES[moveObj.piece] || 'Guerrero';
                const defenderName = PIECE_NAMES[moveObj.captured] || 'Enemigo';
                showCombatBanner(`¡${attackerName} embiste contra ${defenderName}!`);

                cameraZoom.targetScale = 1.12;
                cameraZoom.focusX = (toCoords.col + 0.5) / 8;
                cameraZoom.focusY = (toCoords.row + 0.5) / 8;
            }
        }

        function updateAnimations(dt) {
            dt *= appConfig.reducedMotion ? 0.35 : 1;
            globalTime += dt;

            cameraZoom.scale += (cameraZoom.targetScale - cameraZoom.scale) * Math.min(1, dt * 6);

            if (screenShake.intensity > 0.1) {
                screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
                screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
                screenShake.intensity *= Math.pow(0.05, dt);
            } else {
                screenShake.x = 0;
                screenShake.y = 0;
                screenShake.intensity = 0;
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity || 0;
                if (p.type === 'smoke') p.size += 0.08;
                p.alpha -= p.decay;
                if (p.alpha <= 0) particles.splice(i, 1);
            }

            for (let i = floatingTexts.length - 1; i >= 0; i--) {
                const ft = floatingTexts[i];
                ft.y += ft.vy;
                ft.alpha -= dt * 0.85;
                if (ft.alpha <= 0) floatingTexts.splice(i, 1);
            }

            for (let i = moveTrails.length - 1; i >= 0; i--) {
                moveTrails[i].life -= dt * 1.15;
                if (moveTrails[i].life <= 0) moveTrails.splice(i, 1);
            }
            for (let i = impactRings.length - 1; i >= 0; i--) {
                impactRings[i].progress += dt * 2.3;
                impactRings[i].life = Math.max(0, 1 - impactRings[i].progress);
                if (impactRings[i].progress >= 1) impactRings.splice(i, 1);
            }
            for (let i = inkSilhouettes.length - 1; i >= 0; i--) {
                inkSilhouettes[i].life -= dt * 1.35;
                inkSilhouettes[i].scale += dt * 0.42;
                if (inkSilhouettes[i].life <= 0) inkSilhouettes.splice(i, 1);
            }

            if (battleFreeze > 0) {
                battleFreeze = Math.max(0, battleFreeze - dt);
                return;
            }
            if (!activeAnim) return;

            const rect = container.getBoundingClientRect();
            const battleDt = activeAnim.isCapture ? dt * 0.58 : dt;
            const sqSize = rect.width / 8;

            if (activeAnim.phase === 'approach') {
                const speed = activeAnim.isCapture ? 2.2 : 2.8;
                const stopTarget = activeAnim.isCapture ? 0.78 : 1.0;
                activeAnim.progress = Math.min(stopTarget, activeAnim.progress + battleDt * speed);

                activeAnim.stepTimer += battleDt;
                if (activeAnim.stepTimer >= 0.14) {
                    activeAnim.stepTimer = 0;
                    playSound('step');
                    const curX = (activeAnim.fromCol + (activeAnim.toCol - activeAnim.fromCol) * activeAnim.progress + 0.5) * sqSize;
                    const curY = (activeAnim.fromRow + (activeAnim.toRow - activeAnim.fromRow) * activeAnim.progress + 0.75) * sqSize;
                    spawnParticles(curX, curY, 'rgba(253, 243, 231, 0.45)', 4, 0.5, 'dust');
                    const moveInk = activeAnim.moveObj.piece === 'q'
                        ? 'rgba(229, 168, 83, 0.88)'
                        : (activeAnim.moveObj.color === 'w' ? 'rgba(15, 15, 15, 0.78)' : 'rgba(238, 238, 232, 0.78)');
                    spawnFactionParticles(curX, curY, activeAnim.moveObj.color, 'ink', 5, 0.62);
                    if (activeAnim.moveObj.piece === 'n') {
                        spawnFactionParticles(curX, curY, activeAnim.moveObj.color, 'brush', 5, 0.85);
                    }
                    if (activeAnim.moveObj.piece === 'q') {
                        spawnParticles(curX, curY, '#E5A853', 4, 0.72, 'spark');
                    }
                }

                if (activeAnim.progress >= stopTarget) {
                    if (activeAnim.isCapture) {
                        activeAnim.phase = 'clash';
                        activeAnim.clashProgress = 0;
                    } else {
                        finishAnimatedMove();
                    }
                }
            } else if (activeAnim.phase === 'clash') {
                activeAnim.clashProgress += battleDt * 1.9;

                if (activeAnim.clashProgress >= 0.45 && !activeAnim.soundPlayed) {
                    activeAnim.soundPlayed = true;
                    const impactX = (activeAnim.toCol + 0.5) * sqSize;
                    const impactY = (activeAnim.toRow + 0.5) * sqSize;
                    const pType = activeAnim.moveObj.piece;

                    playSound('ink');
                    playCombatSound(pType);
                    if (pType === 'b' || pType === 'q') {
                        playSound('magic');
                        spawnParticles(impactX, impactY, '#E5A853', 28, 1.5);
                        spawnParticles(impactX, impactY, '#FDF3E7', 16, 1.1);
                        spawnFloatingText(impactX, impactY - 15, '¡IMPACTO ARCANO!', '#E5A853');
                    } else if (pType === 'r') {
                        playSound('explosion');
                        spawnParticles(impactX, impactY, '#C9863B', 32, 1.6);
                        spawnFloatingText(impactX, impactY - 15, '¡APLASTADO!', '#E5A853');
                    } else {
                        playSound('slash');
                        spawnParticles(impactX, impactY, '#E5A853', 24, 1.4);
                        spawnFloatingText(impactX, impactY - 15, '¡DERROTADO!', '#FDF3E7');
                    }
                    triggerShake(10);
                    addImpactRing(activeAnim.toCol, activeAnim.toRow,
                        pType === 'b' || pType === 'q' ? '#E5A853' : '#FDF3E7');
                    const inkColor = activeAnim.moveObj.color === 'w' ? 'rgba(10, 10, 10, 0.92)' : 'rgba(245, 245, 238, 0.9)';
                    spawnParticles(impactX, impactY, inkColor, 20, 1.2, 'ink');
                    spawnParticles(impactX, impactY, inkColor, 14, 1.45, 'droplet');
                    spawnParticles(impactX, impactY, 'rgba(35, 35, 35, 0.32)', 12, 0.5, 'smoke');
                    spawnInkSilhouette(activeAnim.toCol, activeAnim.toRow, activeAnim.moveObj.captured, activeAnim.moveObj.color === 'w' ? 'rgba(15,15,15,0.82)' : 'rgba(245,245,238,0.72)');
                }

                if (activeAnim.clashProgress >= 0.5) {
                    const t = Math.min(1, (activeAnim.clashProgress - 0.5) * 2);
                    activeAnim.progress = 0.78 + t * 0.22;
                }

                if (activeAnim.clashProgress >= 1) {
                    finishAnimatedMove();
                }
            }
        }

        function drawCombatSignature(ctx, anim, sqSize) {
            if (!anim || !anim.isCapture || anim.phase !== 'clash') return;
            const x = (anim.toCol + 0.5) * sqSize;
            const y = (anim.toRow + 0.5) * sqSize;
            const p = Math.sin(anim.clashProgress * Math.PI);
            const type = anim.moveObj.piece;
            ctx.save();
            ctx.globalAlpha = p * 0.9;
            ctx.translate(x, y);
            ctx.strokeStyle = type === 'q' ? '#E5A853' : '#F5F5EE';
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = Math.max(2, sqSize * 0.026);
            ctx.lineCap = 'round';
            if (type === 'r') {
                ctx.beginPath(); ctx.arc(0, sqSize * 0.3, sqSize * (0.2 + p * 0.38), 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-sqSize*.3, sqSize*.23); ctx.lineTo(sqSize*.3, sqSize*.23); ctx.stroke();
            } else if (type === 'n') {
                ctx.rotate(-0.5 + p * 1.1);
                ctx.beginPath(); ctx.arc(0, 0, sqSize*.38, -1.2, 1.2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-sqSize*.25, -sqSize*.2); ctx.lineTo(sqSize*.28, sqSize*.2); ctx.stroke();
            } else if (type === 'b') {
                ctx.rotate(-0.75);
                for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i*sqSize*.08, 0); ctx.lineTo(i*sqSize*.48, -sqSize*.52); ctx.stroke(); }
            } else if (type === 'q') {
                ctx.beginPath();
                ctx.moveTo(-sqSize*.42, -sqSize*.05); ctx.lineTo(-sqSize*.25, -sqSize*.38); ctx.lineTo(0, -sqSize*.12); ctx.lineTo(sqSize*.25, -sqSize*.38); ctx.lineTo(sqSize*.42, -sqSize*.05);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, sqSize*(.18+p*.25), 0, Math.PI*2); ctx.stroke();
            } else if (type === 'k') {
                ctx.rotate(-0.45 + p * 0.9);
                ctx.beginPath(); ctx.moveTo(0, -sqSize*.48); ctx.lineTo(0, sqSize*.42); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, -sqSize*.5, sqSize*.08, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.rotate(-0.35);
                ctx.beginPath(); ctx.moveTo(-sqSize*.38, sqSize*.28); ctx.lineTo(sqSize*.4, -sqSize*.35); ctx.stroke();
            }
            // Contraataque visual: destellos cruzados desde la pieza capturada.
            ctx.strokeStyle = '#F05D5E';
            ctx.globalAlpha = p * 0.62;
            for (let i = 0; i < 3; i++) {
                const a = i * Math.PI / 3 + anim.clashProgress * 2;
                ctx.beginPath(); ctx.moveTo(Math.cos(a)*sqSize*.12, Math.sin(a)*sqSize*.12); ctx.lineTo(Math.cos(a)*sqSize*.42, Math.sin(a)*sqSize*.42); ctx.stroke();
            }
            ctx.restore();
        }

