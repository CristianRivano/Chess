        /**
         * ============================================================================
         * MOTOR DE AJEDREZ CON ANIMACIONES DE VIDA Y COMBATE (BATTLE CHESS ENGINE)
         * ============================================================================
         */

        const canvas = document.getElementById('chessCanvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('game-container');

        // Instancia de reglas oficiales
        let chess = new Chess();

        // Configuración del juego
        let vsAI = true;
        let soundEnabled = true;
        let audioInitialized = false;
        let rapidMode = false;
        let rapidStarted = false;
        let rapidClock = { w: 180, b: 180 };

        // Estado de selección e interacción
        let selectedSquare = null;
        let validMoves = [];
        let lastMove = null;

        // Sistema de Animación Activa
        let activeAnim = null;
        let particles = [];
        let floatingTexts = [];
        let screenShake = { x: 0, y: 0, intensity: 0 };
        let cameraZoom = { scale: 1, targetScale: 1, focusX: 0.5, focusY: 0.5 };
        let globalTime = 0;
        let moveTrails = [];
        let impactRings = [];
        let ambientEmbers = Array.from({ length: 34 }, (_, i) => ({
            seed: i * 17.31,
            x: (i * 0.6180339887) % 1,
            y: (i * 0.3779644732) % 1,
            size: 0.8 + (i % 4) * 0.55,
            speed: 0.12 + (i % 5) * 0.035
        }));

        // Nombres de las piezas para narración en combate
        const PIECE_NAMES = {
            p: 'Soldado de Infantería',
            r: 'Gólem Torreón',
            n: 'Caballero de Élite',
            b: 'Archimago',
            q: 'Reina Valquiria',
            k: 'Rey Soberano'
        };

        const UNICODE_PIECES = {
            w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
            b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
        };

        // ============================================================================
        // SINTETIZADOR DE EFECTOS DE SONIDO (TONE.JS - SIN ARCHIVOS EXTERNOS)
        // ============================================================================
        let synthMove, synthSlash, synthMagic, synthExplosion, synthSelect, synthPaper, synthInk;

        function initAudio() {
            if (audioInitialized) return;
            try {
                Tone.start();
                synthSelect = new Tone.Synth({
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.05 }
                }).toDestination();
                synthSelect.volume.value = -12;

                synthMove = new Tone.MembraneSynth({
                    pitchDecay: 0.05,
                    octaves: 2,
                    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 }
                }).toDestination();
                synthMove.volume.value = -10;

                synthSlash = new Tone.NoiseSynth({
                    noise: { type: 'white' },
                    envelope: { attack: 0.005, decay: 0.18, sustain: 0, release: 0.05 }
                }).toDestination();
                synthSlash.volume.value = -6;

                synthMagic = new Tone.FMSynth({
                    harmonicity: 3.5,
                    modulationIndex: 10,
                    envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.3 }
                }).toDestination();
                synthMagic.volume.value = -8;

                synthExplosion = new Tone.MembraneSynth({
                    pitchDecay: 0.08,
                    octaves: 4,
                    envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 }
                }).toDestination();
                synthExplosion.volume.value = -4;

                synthPaper = new Tone.NoiseSynth({
                    noise: { type: 'pink' },
                    envelope: { attack: 0.005, decay: 0.16, sustain: 0, release: 0.03 }
                }).toDestination();
                synthPaper.volume.value = -18;

                synthInk = new Tone.NoiseSynth({
                    noise: { type: 'brown' },
                    envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.025 }
                }).toDestination();
                synthInk.volume.value = -11;

                audioInitialized = true;
            } catch (e) {
                console.warn('Audio no disponible aún:', e);
            }
        }

        function playSound(type) {
            if (!soundEnabled) return;
            initAudio();
            if (!audioInitialized) return;
            const now = Tone.now();
            try {
                if (type === 'select') synthSelect.triggerAttackRelease('C5', '32n', now);
                if (type === 'step') synthMove.triggerAttackRelease('G2', '16n', now);
                if (type === 'slash') {
                    synthSlash.triggerAttackRelease('16n', now);
                    synthMove.triggerAttackRelease('C2', '8n', now + 0.03);
                }
                if (type === 'magic') synthMagic.triggerAttackRelease('E5', '8n', now);
                if (type === 'explosion') synthExplosion.triggerAttackRelease('C1', '4n', now);
                if (type === 'paper') {
                    synthPaper.triggerAttackRelease('32n', now);
                    synthPaper.triggerAttackRelease('64n', now + 0.045);
                }
                if (type === 'ink') {
                    synthInk.triggerAttackRelease('32n', now);
                    synthInk.triggerAttackRelease('64n', now + 0.035);
                }
            } catch (e) {}
        }

        // ============================================================================
        // GESTIÓN DE TAMAÑO RESPONSIVO DEL CANVAS Y COORDENADAS
        // ============================================================================
        function resizeCanvas() {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        window.addEventListener('resize', resizeCanvas);

        function squareToCoords(sq) {
            const col = sq.charCodeAt(0) - 97;
            const row = 8 - parseInt(sq[1], 10);
            return { col, row };
        }

        function coordsToSquare(col, row) {
            if (col < 0 || col > 7 || row < 0 || row > 7) return null;
            const file = String.fromCharCode(97 + col);
            const rank = 8 - row;
            return `${file}${rank}`;
        }

        function spawnParticles(x, y, color, count = 15, speedScale = 1, type = 'spark') {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (1 + Math.random() * 4) * speedScale;
                particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - (type === 'dust' ? 1 : 0),
                    size: type === 'dust' ? 3 + Math.random() * 4 : 2 + Math.random() * 3.5,
                    color,
                    alpha: 1,
                    decay: 0.02 + Math.random() * 0.025,
                    type,
                    angle: angle,
                    length: type === 'ink' ? 5 + Math.random() * 12 : 0
                });
            }
        }

        function spawnFloatingText(x, y, text, color = '#fbbf24') {
            floatingTexts.push({
                x,
                y,
                text,
                color,
                alpha: 1,
                vy: -1.2
            });
        }

        function triggerShake(intensity = 8) {
            screenShake.intensity = intensity;
        }

        function addMoveTrail(fromCol, fromRow, toCol, toRow, color = '#E5A853') {
            moveTrails.push({ fromCol, fromRow, toCol, toRow, color, life: 1, maxLife: 1 });
            if (moveTrails.length > 8) moveTrails.shift();
        }

        function addImpactRing(col, row, color = '#E5A853') {
            impactRings.push({ col, row, color, progress: 0, life: 1 });
        }

        function findKingSquare(color) {
            const board = chess.board();
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (board[row][col] && board[row][col].type === 'k' && board[row][col].color === color) {
                        return coordsToSquare(col, row);
                    }
                }
            }
            return null;
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

            if (!activeAnim) return;

            const rect = container.getBoundingClientRect();
            const sqSize = rect.width / 8;

            if (activeAnim.phase === 'approach') {
                const speed = activeAnim.isCapture ? 2.2 : 2.8;
                const stopTarget = activeAnim.isCapture ? 0.78 : 1.0;
                activeAnim.progress = Math.min(stopTarget, activeAnim.progress + dt * speed);

                activeAnim.stepTimer += dt;
                if (activeAnim.stepTimer >= 0.14) {
                    activeAnim.stepTimer = 0;
                    playSound('step');
                    const curX = (activeAnim.fromCol + (activeAnim.toCol - activeAnim.fromCol) * activeAnim.progress + 0.5) * sqSize;
                    const curY = (activeAnim.fromRow + (activeAnim.toRow - activeAnim.fromRow) * activeAnim.progress + 0.75) * sqSize;
                    spawnParticles(curX, curY, 'rgba(253, 243, 231, 0.45)', 4, 0.5, 'dust');
                    spawnParticles(curX, curY, activeAnim.moveObj.color === 'w' ? 'rgba(25, 25, 25, 0.72)' : 'rgba(235, 235, 228, 0.72)', 5, 0.62, 'ink');
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
                activeAnim.clashProgress += dt * 1.9;

                if (activeAnim.clashProgress >= 0.45 && !activeAnim.soundPlayed) {
                    activeAnim.soundPlayed = true;
                    const impactX = (activeAnim.toCol + 0.5) * sqSize;
                    const impactY = (activeAnim.toRow + 0.5) * sqSize;
                    const pType = activeAnim.moveObj.piece;

                    playSound('ink');
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
                    spawnParticles(impactX, impactY,
                        activeAnim.moveObj.color === 'w' ? 'rgba(10, 10, 10, 0.92)' : 'rgba(245, 245, 238, 0.9)',
                        20, 1.2, 'ink');
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

        function finishAnimatedMove() {
            const moveObj = activeAnim.moveObj;
            chess.move({
                from: moveObj.from,
                to: moveObj.to,
                promotion: moveObj.promotion || 'q'
            });

            if (chess.in_check()) {
                const kingSq = findKingSquare(chess.turn());
                if (kingSq) {
                    const king = squareToCoords(kingSq);
                    const sqSize = container.getBoundingClientRect().width / 8;
                    addImpactRing(king.col, king.row, '#F05D5E');
                    addImpactRing(king.col, king.row, '#F8B4B4');
                    spawnFloatingText((king.col + 0.5) * sqSize,
                        (king.row + 0.25) * sqSize,
                        chess.in_checkmate() ? '¡JAQUE MATE!' : '¡JAQUE!', '#F8B4B4');
                    triggerShake(chess.in_checkmate() ? 12 : 6);
                    showCombatBanner(chess.in_checkmate() ? '¡El rey ha sido acorralado!' : '¡JAQUE! El rey está bajo ataque');
                }
            } else if (!moveObj.captured) {
                const target = squareToCoords(moveObj.to);
                const sqSize = container.getBoundingClientRect().width / 8;
                spawnParticles((target.col + 0.5) * sqSize,
                    (target.row + 0.72) * sqSize,
                    'rgba(253, 243, 231, 0.5)', 8, 0.55, 'dust');
                spawnParticles((target.col + 0.5) * sqSize,
                    (target.row + 0.68) * sqSize,
                    moveObj.color === 'w' ? 'rgba(15, 15, 15, 0.9)' : 'rgba(245, 245, 238, 0.82)',
                    12, 0.8, 'ink');
            }

            lastMove = { from: moveObj.from, to: moveObj.to };
            activeAnim = null;
            cameraZoom.targetScale = 1;
            updateUI();

            if (vsAI && chess.turn() === 'b' && !chess.game_over()) {
                setTimeout(makeAIMove, 450);
            }
        }

        function makeAIMove() {
            if (activeAnim || chess.game_over() || chess.turn() !== 'b') return;

            const moves = chess.moves({ verbose: true });
            if (moves.length === 0) return;

            const pieceValues = { p: 10, n: 32, b: 33, r: 50, q: 90, k: 900 };
            let bestScore = -Infinity;
            let bestMoves = [];

            for (const m of moves) {
                let score = Math.random() * 4;

                if (m.captured) {
                    score += pieceValues[m.captured] * 10 - pieceValues[m.piece];
                }

                if (['d4', 'd5', 'e4', 'e5'].includes(m.to)) {
                    score += 6;
                }

                chess.move(m);
                if (chess.in_checkmate()) score += 10000;
                else if (chess.in_check()) score += 15;
                chess.undo();

                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [m];
                } else if (Math.abs(score - bestScore) < 0.5) {
                    bestMoves.push(m);
                }
            }

            const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            executeAnimatedMove(chosen);
        }

        function render() {
            const rect = container.getBoundingClientRect();
            const size = rect.width;
            const sqSize = size / 8;

            ctx.clearRect(0, 0, size, size);

            ctx.save();
            const pivotX = cameraZoom.focusX * size;
            const pivotY = cameraZoom.focusY * size;
            ctx.translate(pivotX + screenShake.x, pivotY + screenShake.y);
            ctx.scale(cameraZoom.scale, cameraZoom.scale);
            ctx.translate(-pivotX, -pivotY);

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const isLight = (row + col) % 2 === 0;
                    const sqName = coordsToSquare(col, row);

                    ctx.fillStyle = isLight ? '#E6D2B8' : '#522129';
                    ctx.fillRect(col * sqSize, row * sqSize, sqSize, sqSize);

                    if (lastMove && (lastMove.from === sqName || lastMove.to === sqName)) {
                        ctx.fillStyle = 'rgba(229, 168, 83, 0.34)';
                        ctx.fillRect(col * sqSize, row * sqSize, sqSize, sqSize);
                    }

                    if (selectedSquare === sqName) {
                        ctx.fillStyle = 'rgba(201, 134, 59, 0.45)';
                        ctx.fillRect(col * sqSize, row * sqSize, sqSize, sqSize);
                    }

                    if (col === 0) {
                        ctx.fillStyle = isLight ? '#522129' : '#E5A853';
                        ctx.font = `bold ${Math.max(10, sqSize * 0.16)}px Inter`;
                        ctx.fillText(8 - row, col * sqSize + 4, row * sqSize + sqSize * 0.22);
                    }
                    if (row === 7) {
                        ctx.fillStyle = isLight ? '#522129' : '#E5A853';
                        ctx.font = `bold ${Math.max(10, sqSize * 0.16)}px Inter`;
                        ctx.fillText(String.fromCharCode(97 + col), (col + 1) * sqSize - sqSize * 0.18, (row + 1) * sqSize - 5);
                    }
                }
            }

            // Halo persistente: mientras haya jaque, el rey respira dentro de una zona de peligro
            if (!activeAnim && chess.in_check()) {
                const checkedKing = findKingSquare(chess.turn());
                if (checkedKing) {
                    const danger = squareToCoords(checkedKing);
                    const dx = (danger.col + 0.5) * sqSize;
                    const dy = (danger.row + 0.5) * sqSize;
                    ctx.save();
                    ctx.globalAlpha = 0.28 + (Math.sin(globalTime * 8) + 1) * 0.14;
                    ctx.strokeStyle = '#F05D5E';
                    ctx.lineWidth = Math.max(2, sqSize * 0.035);
                    ctx.shadowColor = '#F05D5E';
                    ctx.shadowBlur = sqSize * 0.22;
                    ctx.beginPath();
                    ctx.arc(dx, dy, sqSize * (0.38 + Math.sin(globalTime * 5) * 0.035), 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // Bruma de brasas y energía que mantiene vivo el campo de batalla
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            for (const ember of ambientEmbers) {
                const ex = ((ember.x + globalTime * ember.speed * 0.018) % 1) * size;
                const ey = ((ember.y - globalTime * ember.speed * 0.026 + 1) % 1) * size;
                const flicker = 0.28 + (Math.sin(globalTime * 3 + ember.seed) + 1) * 0.18;
                ctx.globalAlpha = flicker;
                ctx.fillStyle = ember.seed % 2 ? '#E5A853' : '#FDF3E7';
                ctx.beginPath();
                ctx.arc(ex, ey, ember.size * (0.7 + Math.sin(globalTime * 4 + ember.seed) * 0.25), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Rastro luminoso de cada desplazamiento reciente
            for (const trail of moveTrails) {
                const fade = Math.max(0, trail.life / trail.maxLife);
                const x1 = (trail.fromCol + 0.5) * sqSize;
                const y1 = (trail.fromRow + 0.5) * sqSize;
                const x2 = (trail.toCol + 0.5) * sqSize;
                const y2 = (trail.toRow + 0.5) * sqSize;
                ctx.save();
                ctx.globalAlpha = fade * 0.5;
                ctx.strokeStyle = trail.color;
                ctx.lineWidth = sqSize * 0.065;
                ctx.shadowColor = trail.color;
                ctx.shadowBlur = sqSize * 0.22;
                ctx.setLineDash([sqSize * 0.12, sqSize * 0.1]);
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                ctx.restore();
            }

            if (!activeAnim && validMoves.length > 0) {
                for (const m of validMoves) {
                    const { col, row } = squareToCoords(m.to);
                    const cx = (col + 0.5) * sqSize;
                    const cy = (row + 0.5) * sqSize;

                    if (m.captured) {
                        ctx.strokeStyle = '#E5A853';
                        ctx.lineWidth = 3.5;
                        ctx.beginPath();
                        ctx.arc(cx, cy, sqSize * 0.38 + Math.sin(globalTime * 6) * 2, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = 'rgba(201, 134, 59, 0.78)';
                        ctx.beginPath();
                        ctx.arc(cx, cy, sqSize * 0.15, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            const board = chess.board();
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board[row][col];
                    if (!piece) continue;

                    const sqName = coordsToSquare(col, row);

                    if (activeAnim && activeAnim.moveObj.from === sqName) {
                        continue;
                    }

                    let defenderState = {
                        isSelected: selectedSquare === sqName,
                        facing: piece.color === 'w' ? 1 : -1,
                        idleSeed: (col * 13 + row * 29) % 100,
                        square: sqName
                    };

                    if (activeAnim && activeAnim.isCapture && activeAnim.moveObj.to === sqName && activeAnim.phase === 'clash') {
                        const cp = activeAnim.clashProgress;
                        if (cp > 0.45) {
                            defenderState.hitFlash = cp < 0.65 ? 1 : 0;
                            defenderState.scale = Math.max(0, 1 - (cp - 0.45) * 1.8);
                            defenderState.alpha = Math.max(0, 1 - (cp - 0.45) * 1.8);
                        }
                    }

                    drawCharacter(
                        ctx,
                        piece,
                        (col + 0.5) * sqSize,
                        (row + 0.5) * sqSize,
                        sqSize,
                        defenderState
                    );
                }
            }

            if (activeAnim) {
                const { fromCol, fromRow, toCol, toRow, progress, phase, clashProgress, moveObj } = activeAnim;
                const curCol = fromCol + (toCol - fromCol) * progress;
                const curRow = fromRow + (toRow - fromRow) * progress;

                let cx = (curCol + 0.5) * sqSize;
                let cy = (curRow + 0.5) * sqSize;

                if (moveObj.piece === 'n' && phase === 'approach') {
                    const jumpHeight = Math.sin((progress / (activeAnim.isCapture ? 0.82 : 1)) * Math.PI) * sqSize * 0.65;
                    cy -= jumpHeight;
                }

                let attackSwing = 0;
                if (phase === 'clash') {
                    attackSwing = Math.sin(clashProgress * Math.PI);
                    const dirX = toCol - fromCol;
                    const dirY = toRow - fromRow;
                    const dist = Math.hypot(dirX, dirY) || 1;
                    cx += (dirX / dist) * attackSwing * sqSize * 0.35;
                    cy += (dirY / dist) * attackSwing * sqSize * 0.35;
                }

                drawCharacter(
                    ctx,
                    { type: moveObj.piece, color: moveObj.color },
                    cx,
                    cy,
                    sqSize,
                    {
                        walkCycle: phase === 'approach' ? progress * 3 : 0,
                        attackProgress: attackSwing,
                        scale: phase === 'clash' ? 1 + attackSwing * 0.18 : 1.05,
                        facing: toCol >= fromCol ? 1 : -1
                    }
                );
            }

            for (const ring of impactRings) {
                const rx = (ring.col + 0.5) * sqSize;
                const ry = (ring.row + 0.5) * sqSize;
                ctx.save();
                ctx.globalAlpha = ring.life * 0.75;
                ctx.strokeStyle = ring.color;
                ctx.lineWidth = Math.max(2, sqSize * 0.025) * ring.life;
                ctx.shadowColor = ring.color;
                ctx.shadowBlur = sqSize * 0.18;
                ctx.beginPath();
                ctx.arc(rx, ry, sqSize * (0.12 + ring.progress * 0.62), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            for (const p of particles) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = p.color;
                if (p.type === 'ink') {
                    // Trazos de pincel y gotas: la tinta conserva dirección y velocidad.
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(1, p.size * 0.72);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - Math.cos(p.angle) * p.length, p.y - Math.sin(p.angle) * p.length);
                    ctx.stroke();
                    ctx.globalAlpha *= 0.82;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(1.2, p.size * 0.7), 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            for (const ft of floatingTexts) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, ft.alpha);
                ctx.font = '800 14px Cinzel, serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();
            }

            ctx.restore();
        }

        // ============================================================================
        // DIBUJO DE PERSONAJES VIVOS (ESTILO ILUSTRADO SEGÚN IMAGEN DE REFERENCIA)
        // ============================================================================
        function drawCharacter(ctx, piece, cx, cy, size, state = {}) {
            const {
                walkCycle = 0,
                attackProgress = 0,
                hitFlash = 0,
                scale = 1,
                facing = 1,
                isSelected = false,
                alpha = 1,
                idleSeed = 0
            } = state;

            ctx.save();
            ctx.globalAlpha = alpha;

            const breath = Math.sin(globalTime * 4 + cx * 0.1) * (size * 0.02);
            const stepBounce = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * (size * 0.14);
            const idleWave = Math.sin(globalTime * 1.7 + idleSeed) * size * 0.012;
            const idleTilt = Math.sin(globalTime * 1.25 + idleSeed) * 0.018;
            const tilt = Math.sin(walkCycle * Math.PI * 2) * 0.1 + idleTilt;

            ctx.translate(cx, cy - stepBounce + idleWave);
            ctx.scale(scale, scale);

            // Sombra en el suelo
            ctx.save();
            ctx.translate(0, stepBounce + size * 0.36);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.3, size * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Aura si está seleccionada
            if (isSelected) {
                ctx.save();
                ctx.translate(0, size * 0.34);
                ctx.strokeStyle = '#E5A853';
                ctx.lineWidth = 2.6;
                ctx.setLineDash([size * 0.08, size * 0.05]);
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 0.38 + Math.sin(globalTime * 8) * 3, size * 0.14, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Resplandor sutil para piezas reales
            if ((piece.type === 'k' || piece.type === 'q') && !hitFlash) {
                ctx.save();
                ctx.globalAlpha = 0.16 + (Math.sin(globalTime * 2.2 + idleSeed) + 1) * 0.06;
                ctx.strokeStyle = '#E5A853';
                ctx.lineWidth = Math.max(1.5, size * 0.018);
                ctx.shadowColor = '#E5A853';
                ctx.shadowBlur = size * 0.14;
                ctx.beginPath();
                ctx.arc(0, size * 0.12, size * (0.32 + Math.sin(globalTime * 2 + idleSeed) * 0.018), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.rotate(tilt);

            const isWhite = piece.color === 'w';
            const r = size * 0.38;

            // Paleta inspirada en la imagen de referencia, diferenciando Reino Marfil (w) y Orden Granate (b)
            const bodyMain = hitFlash > 0 ? '#FFFFFF' : (isWhite ? '#F7EFE2' : '#4A4E5A');
            const bodyShade = hitFlash > 0 ? '#FFFFFF' : (isWhite ? '#D6C4A8' : '#2C2F38');
            const outline = '#121318';
            const goldTrim = hitFlash > 0 ? '#FFFFFF' : (isWhite ? '#E5A853' : '#C9863B');
            const accentCloth = hitFlash > 0 ? '#FFFFFF' : (isWhite ? '#9E2A2B' : '#6D28D9');
            const skinTone = hitFlash > 0 ? '#FFFFFF' : (isWhite ? '#F2C6A0' : '#D9A782');

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(1.8, size * 0.032);
            ctx.strokeStyle = outline;

            // ========================================================================
            // 1. TORRE (ROOK): Torre de piedra con ceño fruncido, bloques y banderín
            // ========================================================================
            if (piece.type === 'r') {
                const lunge = attackProgress * facing * r * 0.25;
                ctx.translate(lunge, 0);

                // Asta y banderín superior
                ctx.beginPath();
                ctx.moveTo(r * 0.08, -r * 0.56);
                ctx.lineTo(r * 0.08, -r * 0.88);
                ctx.stroke();

                ctx.fillStyle = isWhite ? '#3B82F6' : '#E5A853';
                ctx.beginPath();
                ctx.moveTo(r * 0.08, -r * 0.88);
                ctx.lineTo(r * 0.36, -r * 0.8);
                ctx.lineTo(r * 0.08, -r * 0.71);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Base acampanada
                ctx.fillStyle = bodyShade;
                ctx.beginPath();
                ctx.ellipse(0, r * 0.72, r * 0.62, r * 0.15, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Cuerpo de torre
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.moveTo(-r * 0.54, r * 0.7);
                ctx.quadraticCurveTo(-r * 0.4, r * 0.32, -r * 0.36, -r * 0.36);
                ctx.lineTo(r * 0.36, -r * 0.36);
                ctx.quadraticCurveTo(r * 0.4, r * 0.32, r * 0.54, r * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Líneas de mampostería / bloques de piedra
                ctx.save();
                ctx.strokeStyle = outline;
                ctx.lineWidth = Math.max(1.1, size * 0.018);
                ctx.beginPath();
                ctx.moveTo(-r * 0.42, r * 0.38); ctx.lineTo(r * 0.42, r * 0.38);
                ctx.moveTo(-r * 0.48, r * 0.56); ctx.lineTo(r * 0.48, r * 0.56);
                ctx.moveTo(-r * 0.14, r * 0.38); ctx.lineTo(-r * 0.14, r * 0.56);
                ctx.moveTo(r * 0.18, r * 0.38); ctx.lineTo(r * 0.18, r * 0.56);
                ctx.moveTo(-r * 0.02, r * 0.56); ctx.lineTo(-r * 0.02, r * 0.72);
                ctx.stroke();
                ctx.restore();

                // Almenas superiores
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.moveTo(-r * 0.44, -r * 0.36);
                ctx.lineTo(-r * 0.46, -r * 0.62);
                ctx.lineTo(-r * 0.24, -r * 0.62);
                ctx.lineTo(-r * 0.24, -r * 0.48);
                ctx.lineTo(-r * 0.11, -r * 0.48);
                ctx.lineTo(-r * 0.11, -r * 0.62);
                ctx.lineTo(r * 0.11, -r * 0.62);
                ctx.lineTo(r * 0.11, -r * 0.48);
                ctx.lineTo(r * 0.24, -r * 0.48);
                ctx.lineTo(r * 0.24, -r * 0.62);
                ctx.lineTo(r * 0.46, -r * 0.62);
                ctx.lineTo(r * 0.44, -r * 0.36);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Rostro / ceño fruncido de la torre
                ctx.fillStyle = outline;
                ctx.beginPath();
                ctx.arc(-r * 0.14, -r * 0.06, r * 0.055, 0, Math.PI * 2);
                ctx.arc(r * 0.14, -r * 0.06, r * 0.055, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(-r * 0.15, -r * 0.08, r * 0.018, 0, Math.PI * 2);
                ctx.arc(r * 0.13, -r * 0.08, r * 0.018, 0, Math.PI * 2);
                ctx.fill();

                // Cejas gruesas fruncidas
                ctx.beginPath();
                ctx.moveTo(-r * 0.25, -r * 0.18);
                ctx.lineTo(-r * 0.04, -r * 0.11);
                ctx.moveTo(r * 0.25, -r * 0.18);
                ctx.lineTo(r * 0.04, -r * 0.11);
                ctx.stroke();

                // Boca seria de piedra
                ctx.beginPath();
                ctx.moveTo(-r * 0.14, r * 0.16);
                ctx.quadraticCurveTo(0, r * 0.12, r * 0.14, r * 0.16);
                ctx.stroke();
            }

            // ========================================================================
            // 2. CABALLO (KNIGHT): Caballo con armadura, bridas y escudo lateral
            // ========================================================================
            else if (piece.type === 'n') {
                ctx.scale(facing, 1);
                if (attackProgress > 0) {
                    ctx.rotate(-attackProgress * 0.25);
                }

                // Peana inferior
                ctx.fillStyle = bodyShade;
                ctx.beginPath();
                ctx.ellipse(0, r * 0.74, r * 0.54, r * 0.14, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Cuerpo y cuello del caballo
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.moveTo(-r * 0.42, r * 0.74);
                ctx.quadraticCurveTo(-r * 0.46, r * 0.12, -r * 0.22, -r * 0.46);
                ctx.quadraticCurveTo(r * 0.04, -r * 0.72, r * 0.36, -r * 0.52);
                ctx.lineTo(r * 0.58, -r * 0.22);
                ctx.quadraticCurveTo(r * 0.6, -r * 0.04, r * 0.34, -r * 0.06);
                ctx.quadraticCurveTo(r * 0.26, r * 0.28, r * 0.42, r * 0.74);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Placa de armadura en el cuello
                ctx.fillStyle = goldTrim;
                ctx.beginPath();
                ctx.roundRect(-r * 0.04, -r * 0.28, r * 0.24, r * 0.22, r * 0.06);
                ctx.fill();
                ctx.stroke();

                // Crin rizada
                ctx.fillStyle = bodyShade;
                const curls = [
                    [-r * 0.02, -r * 0.62],
                    [-r * 0.16, -r * 0.56],
                    [-r * 0.25, -r * 0.44],
                    [-r * 0.32, -r * 0.28],
                    [-r * 0.36, -r * 0.1]
                ];
                for (const [cxCurl, cyCurl] of curls) {
                    ctx.beginPath();
                    ctx.arc(cxCurl, cyCurl, r * 0.11, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }

                // Oreja y brida
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.moveTo(r * 0.14, -r * 0.58);
                ctx.lineTo(r * 0.24, -r * 0.78);
                ctx.lineTo(r * 0.32, -r * 0.54);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(r * 0.22, -r * 0.52);
                ctx.lineTo(r * 0.46, -r * 0.12);
                ctx.moveTo(r * 0.36, -r * 0.36);
                ctx.lineTo(r * 0.54, -r * 0.28);
                ctx.stroke();

                // Ojo expresivo
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.ellipse(r * 0.32, -r * 0.38, r * 0.08, r * 0.1, -0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = outline;
                ctx.beginPath();
                ctx.arc(r * 0.34, -r * 0.38, r * 0.04, 0, Math.PI * 2);
                ctx.fill();

                // Escudo heráldico en el pecho/costado
                ctx.fillStyle = accentCloth;
                ctx.beginPath();
                ctx.moveTo(r * 0.08, r * 0.06);
                ctx.lineTo(r * 0.44, r * 0.06);
                ctx.lineTo(r * 0.41, r * 0.42);
                ctx.lineTo(r * 0.26, r * 0.54);
                ctx.lineTo(r * 0.11, r * 0.42);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            // ========================================================================
            // 3. ALFIL (BISHOP): Obispo con mitra, túnica ceremonial y báculo curvo
            // ========================================================================
            else if (piece.type === 'b') {
                // Base
                ctx.fillStyle = bodyShade;
                ctx.beginPath();
                ctx.ellipse(0, r * 0.74, r * 0.48, r * 0.12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Túnica
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.moveTo(-r * 0.38, r * 0.74);
                ctx.lineTo(-r * 0.24, -r * 0.06);
                ctx.lineTo(r * 0.24, -r * 0.06);
                ctx.lineTo(r * 0.38, r * 0.74);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Estola central con borde dorado
                ctx.fillStyle = accentCloth;
                ctx.beginPath();
                ctx.moveTo(-r * 0.12, -r * 0.06);
                ctx.lineTo(r * 0.12, -r * 0.06);
                ctx.lineTo(r * 0.16, r * 0.74);
                ctx.lineTo(-r * 0.16, r * 0.74);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Cabeza y mitra
                ctx.save();
                ctx.translate(0, -r * 0.34 + breath);
                ctx.fillStyle = skinTone;
                ctx.beginPath();
                ctx.arc(0, r * 0.02, r * 0.21, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Mitra puntiaguda
                ctx.fillStyle = accentCloth;
                ctx.beginPath();
                ctx.moveTo(-r * 0.24, -r * 0.08);
                ctx.quadraticCurveTo(-r * 0.18, -r * 0.42, 0, -r * 0.58);
                ctx.quadraticCurveTo(r * 0.18, -r * 0.42, r * 0.24, -r * 0.08);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Cruz dorada en la mitra
                ctx.strokeStyle = goldTrim;
                ctx.lineWidth = Math.max(1.5, size * 0.024);
                ctx.beginPath();
                ctx.moveTo(0, -r * 0.44); ctx.lineTo(0, -r * 0.2);
                ctx.moveTo(-r * 0.09, -r * 0.32); ctx.lineTo(r * 0.09, -r * 0.32);
                ctx.stroke();

                ctx.strokeStyle = outline;
                ctx.lineWidth = Math.max(1.8, size * 0.032);

                // Ojos y sonrisa serena
                ctx.fillStyle = outline;
                ctx.beginPath();
                ctx.arc(-r * 0.08, r * 0.01, r * 0.032, 0, Math.PI * 2);
                ctx.arc(r * 0.08, r * 0.01, r * 0.032, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, r * 0.08, r * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
                ctx.stroke();
                ctx.restore();

                // Báculo pastoral a la derecha
                ctx.save();
                ctx.translate(r * 0.36, r * 0.12);
                ctx.rotate(attackProgress * 0.45);
                ctx.strokeStyle = goldTrim;
                ctx.lineWidth = Math.max(2, size * 0.032);
                ctx.beginPath();
                ctx.moveTo(0, r * 0.6);
                ctx.lineTo(0, -r * 0.48);
                ctx.arc(r * 0.09, -r * 0.48, r * 0.09, Math.PI, 0.35 * Math.PI, false);
                ctx.stroke();
                ctx.strokeStyle = outline;
                ctx.lineWidth = Math.max(1.1, size * 0.016);
                ctx.stroke();
                ctx.restore();
            }

            // ========================================================================
            // 4. REINA (QUEEN): Soberana con corona, capa con armiño y cetro
            // ========================================================================
            else if (piece.type === 'q') {
                // Vestido largo
                ctx.fillStyle = accentCloth;
                ctx.beginPath();
                ctx.moveTo(-r * 0.44, r * 0.76);
                ctx.quadraticCurveTo(-r * 0.22, r * 0.15, -r * 0.16, -r * 0.08);
                ctx.lineTo(r * 0.16, -r * 0.08);
                ctx.quadraticCurveTo(r * 0.22, r * 0.15, r * 0.44, r * 0.76);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Capa lateral con ribete claro tipo armiño
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.moveTo(-r * 0.16, -r * 0.08);
                ctx.quadraticCurveTo(-r * 0.44, r * 0.25, -r * 0.48, r * 0.74);
                ctx.lineTo(-r * 0.28, r * 0.74);
                ctx.quadraticCurveTo(-r * 0.2, r * 0.32, -r * 0.12, r * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(r * 0.16, -r * 0.08);
                ctx.quadraticCurveTo(r * 0.44, r * 0.25, r * 0.48, r * 0.74);
                ctx.lineTo(r * 0.28, r * 0.74);
                ctx.quadraticCurveTo(r * 0.2, r * 0.32, r * 0.12, r * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Cabeza, cabello y corona real
                ctx.save();
                ctx.translate(0, -r * 0.42 + breath);

                // Cabello ondulado
                ctx.fillStyle = isWhite ? '#78350F' : '#1E1B4B';
                ctx.beginPath();
                ctx.ellipse(0, r * 0.04, r * 0.26, r * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Rostro
                ctx.fillStyle = skinTone;
                ctx.beginPath();
                ctx.ellipse(0, r * 0.02, r * 0.19, r * 0.22, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Ojos y sonrisa
                ctx.fillStyle = outline;
                ctx.beginPath();
                ctx.arc(-r * 0.07, -r * 0.01, r * 0.032, 0, Math.PI * 2);
                ctx.arc(r * 0.07, -r * 0.01, r * 0.032, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, r * 0.09, r * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
                ctx.stroke();

                // Corona dorada
                ctx.fillStyle = goldTrim;
                ctx.beginPath();
                ctx.moveTo(-r * 0.18, -r * 0.18);
                ctx.lineTo(-r * 0.24, -r * 0.42);
                ctx.lineTo(-r * 0.08, -r * 0.3);
                ctx.lineTo(0, -r * 0.46);
                ctx.lineTo(r * 0.08, -r * 0.3);
                ctx.lineTo(r * 0.24, -r * 0.42);
                ctx.lineTo(r * 0.18, -r * 0.18);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                // Cetro real a la izquierda
                ctx.save();
                ctx.translate(-r * 0.34, r * 0.16);
                ctx.rotate(-0.15 - attackProgress * 0.65);
                ctx.strokeStyle = goldTrim;
                ctx.beginPath();
                ctx.moveTo(0, r * 0.52);
                ctx.lineTo(0, -r * 0.48);
                ctx.stroke();
                ctx.strokeStyle = outline;
                ctx.fillStyle = isWhite ? '#2DD4BF' : '#F59E0B';
                ctx.beginPath();
                ctx.arc(0, -r * 0.54, r * 0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // ========================================================================
            // 5. REY (KING): Monarca barbado con corona, manto y cetro
            // ========================================================================
            else if (piece.type === 'k') {
                // Base y túnica
                ctx.fillStyle = bodyShade;
                ctx.beginPath();
                ctx.ellipse(0, r * 0.74, r * 0.52, r * 0.14, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = accentCloth;
                ctx.beginPath();
                ctx.moveTo(-r * 0.46, r * 0.74);
                ctx.quadraticCurveTo(-r * 0.28, r * 0.15, -r * 0.22, -r * 0.14);
                ctx.lineTo(r * 0.22, -r * 0.14);
                ctx.quadraticCurveTo(r * 0.28, r * 0.15, r * 0.46, r * 0.74);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Ribete de armiño en el cuello
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.roundRect(-r * 0.28, -r * 0.2, r * 0.56, r * 0.12, r * 0.05);
                ctx.fill();
                ctx.stroke();

                // Cabeza, barba y corona
                ctx.save();
                ctx.translate(0, -r * 0.42 + breath);
                ctx.fillStyle = skinTone;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Barba y bigote poblados
                ctx.fillStyle = isWhite ? '#78350F' : '#1F2937';
                ctx.beginPath();
                ctx.moveTo(-r * 0.22, r * 0.02);
                ctx.quadraticCurveTo(-r * 0.24, r * 0.34, 0, r * 0.38);
                ctx.quadraticCurveTo(r * 0.24, r * 0.34, r * 0.22, r * 0.02);
                ctx.quadraticCurveTo(0, r * 0.12, -r * 0.22, r * 0.02);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Ojos
                ctx.fillStyle = outline;
                ctx.beginPath();
                ctx.arc(-r * 0.08, -r * 0.04, r * 0.034, 0, Math.PI * 2);
                ctx.arc(r * 0.08, -r * 0.04, r * 0.034, 0, Math.PI * 2);
                ctx.fill();

                // Corona dorada con picos
                ctx.fillStyle = goldTrim;
                ctx.beginPath();
                ctx.moveTo(-r * 0.2, -r * 0.2);
                ctx.lineTo(-r * 0.26, -r * 0.46);
                ctx.lineTo(-r * 0.1, -r * 0.34);
                ctx.lineTo(0, -r * 0.5);
                ctx.lineTo(r * 0.1, -r * 0.34);
                ctx.lineTo(r * 0.26, -r * 0.46);
                ctx.lineTo(r * 0.2, -r * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                // Cetro a la izquierda
                ctx.save();
                ctx.translate(-r * 0.38, r * 0.14);
                ctx.rotate(-0.15 - attackProgress * 0.75);
                ctx.strokeStyle = goldTrim;
                ctx.beginPath();
                ctx.moveTo(0, r * 0.52);
                ctx.lineTo(0, -r * 0.56);
                ctx.stroke();
                ctx.strokeStyle = outline;
                ctx.fillStyle = goldTrim;
                ctx.beginPath();
                ctx.arc(0, -r * 0.62, r * 0.11, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // ========================================================================
            // 6. PEÓN (PAWN): Soldado con casco, lanza y escudo
            // ========================================================================
            else {
                // Base
                ctx.fillStyle = bodyShade;
                ctx.beginPath();
                ctx.ellipse(0, r * 0.74, r * 0.44, r * 0.12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Cuerpo de soldado
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.moveTo(-r * 0.34, r * 0.74);
                ctx.quadraticCurveTo(-r * 0.2, r * 0.25, -r * 0.16, r * 0.08);
                ctx.lineTo(r * 0.16, r * 0.08);
                ctx.quadraticCurveTo(r * 0.2, r * 0.25, r * 0.34, r * 0.74);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Cabeza / yelmo redondeado
                ctx.save();
                ctx.translate(0, -r * 0.16 + breath);
                ctx.fillStyle = bodyMain;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Ojos y sonrisa decidida
                ctx.fillStyle = outline;
                ctx.beginPath();
                ctx.arc(-r * 0.08, -r * 0.02, r * 0.032, 0, Math.PI * 2);
                ctx.arc(r * 0.08, -r * 0.02, r * 0.032, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, r * 0.06, r * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
                ctx.stroke();
                ctx.restore();

                // Lanza a la izquierda
                ctx.save();
                ctx.translate(-r * 0.28, r * 0.16);
                ctx.rotate(-0.12 - attackProgress * 0.7);
                ctx.beginPath();
                ctx.moveTo(0, r * 0.56);
                ctx.lineTo(0, -r * 0.56);
                ctx.stroke();
                ctx.fillStyle = goldTrim;
                ctx.beginPath();
                ctx.moveTo(-r * 0.08, -r * 0.52);
                ctx.lineTo(0, -r * 0.76);
                ctx.lineTo(r * 0.08, -r * 0.52);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                // Escudo a la derecha
                ctx.fillStyle = bodyShade;
                ctx.beginPath();
                ctx.moveTo(r * 0.08, r * 0.16);
                ctx.lineTo(r * 0.44, r * 0.16);
                ctx.lineTo(r * 0.41, r * 0.52);
                ctx.lineTo(r * 0.26, r * 0.64);
                ctx.lineTo(r * 0.11, r * 0.52);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        }

        // ============================================================================
        // INTERACCIÓN DE USUARIO (CLIC Y TÁCTIL)
        // ============================================================================
        function handleBoardInput(clientX, clientY) {
            initAudio();
            if (activeAnim || chess.game_over()) return;
            if (vsAI && chess.turn() === 'b') return;

            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const col = Math.floor((x / rect.width) * 8);
            const row = Math.floor((y / rect.height) * 8);
            const clickedSq = coordsToSquare(col, row);
            if (!clickedSq) return;

            const chosenMove = validMoves.find(m => m.to === clickedSq);
            if (chosenMove) {
                selectedSquare = null;
                validMoves = [];
                executeAnimatedMove(chosenMove);
                return;
            }

            const piece = chess.get(clickedSq);
            if (piece && piece.color === chess.turn()) {
                selectedSquare = clickedSq;
                validMoves = chess.moves({ square: clickedSq, verbose: true });
                const selected = squareToCoords(clickedSq);
                const sqSize = container.getBoundingClientRect().width / 8;
                spawnParticles((selected.col + 0.5) * sqSize, (selected.row + 0.5) * sqSize, '#E5A853', 12, 0.7, 'spark');
                addImpactRing(selected.col, selected.row, '#E5A853');
                playSound('select');
            } else {
                selectedSquare = null;
                validMoves = [];
            }
        }

        canvas.addEventListener('click', (e) => {
            handleBoardInput(e.clientX, e.clientY);
        });

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                e.preventDefault();
                handleBoardInput(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });

        // ============================================================================
        // MODO AJEDREZ RÁPIDO: 3 minutos por jugador
        // ============================================================================
        function formatClock(seconds) {
            const safe = Math.max(0, seconds);
            const minutes = Math.floor(safe / 60);
            const secs = Math.floor(safe % 60);
            return `${minutes}:${String(secs).padStart(2, '0')}`;
        }

        function updateRapidTimer() {
            const timer = document.getElementById('rapid-timer');
            if (!rapidMode) {
                timer.classList.add('hidden');
                return;
            }
            timer.classList.remove('hidden');
            timer.textContent = `${formatClock(rapidClock.w)} · ${formatClock(rapidClock.b)}`;
            timer.classList.toggle('text-red-300', rapidClock[chess.turn()] <= 30);
            timer.classList.toggle('text-accent-gold', rapidClock[chess.turn()] > 30);
        }

        function updateRapidClock(dt) {
            if (!rapidMode || !rapidStarted || activeAnim || chess.game_over()) return;
            const side = chess.turn();
            rapidClock[side] = Math.max(0, rapidClock[side] - dt);
            if (rapidClock[side] <= 0) {
                rapidStarted = false;
                const winner = side === 'w' ? 'Orden Granate (Negras)' : 'Reino Marfil (Blancas)';
                document.getElementById('status-text').textContent = `¡Tiempo agotado! Gana ${winner}`;
                showGameOverModal('¡Tiempo agotado!', `Victoria para ${winner} por caída de bandera.`);
            }
            updateRapidTimer();
        }

        function toggleRapidMode() {
            rapidMode = !rapidMode;
            rapidStarted = false;
            rapidClock = { w: 180, b: 180 };
            document.getElementById('rapid-mode-label').textContent = rapidMode
                ? 'Ajedrez Rápido: 3:00'
                : 'Ajedrez Rápido: Desactivado';
            updateRapidTimer();
        }

        // ============================================================================
        // ACTUALIZACIÓN DE INTERFAZ Y CONTROLES
        // ============================================================================
        function updateUI() {
            const statusText = document.getElementById('status-text');
            const turnIndicator = document.getElementById('turn-indicator');
            const isWhiteTurn = chess.turn() === 'w';

            turnIndicator.className = isWhiteTurn
                ? 'w-3.5 h-3.5 rounded-full bg-[#FDF3E7] border border-[#E5A853] shadow-[0_0_10px_#E5A853]'
                : 'w-3.5 h-3.5 rounded-full bg-[#3B141A] border border-[#E5A853] shadow-[0_0_10px_#C9863B]';

            if (chess.in_checkmate()) {
                const winner = isWhiteTurn ? 'Orden Granate (Negras)' : 'Reino Marfil (Blancas)';
                statusText.textContent = `¡Jaque Mate! Gana ${winner}`;
                showGameOverModal('¡Jaque Mate!', `Victoria absoluta para ${winner}.`);
            } else if (chess.in_draw() || chess.in_stalemate()) {
                statusText.textContent = 'Tablas — Empate en el campo';
                showGameOverModal('¡Empate Táctico!', 'Ningún reino logró doblegar al otro.');
            } else {
                const checkWarning = chess.in_check() ? ' ⚠️ ¡JAQUE!' : '';
                statusText.textContent = (isWhiteTurn ? 'Turno: Reino Marfil' : 'Turno: Orden Granate') + checkWarning;
            }

            const history = chess.history({ verbose: true });
            const capByWhite = [];
            const capByBlack = [];

            for (const h of history) {
                if (h.captured) {
                    if (h.color === 'w') capByWhite.push(UNICODE_PIECES.b[h.captured]);
                    else capByBlack.push(UNICODE_PIECES.w[h.captured]);
                }
            }

            document.getElementById('captured-by-white').textContent = capByWhite.join(' ');
            document.getElementById('captured-by-black').textContent = capByBlack.join(' ');
            updateRapidTimer();
        }

        function showGameOverModal(title, desc) {
            document.getElementById('gameover-title').textContent = title;
            document.getElementById('gameover-desc').textContent = desc;
            document.getElementById('gameover-modal').classList.remove('hidden');
        }

        function resetGame() {
            chess.reset();
            selectedSquare = null;
            validMoves = [];
            lastMove = null;
            activeAnim = null;
            particles = [];
            floatingTexts = [];
            moveTrails = [];
            impactRings = [];
            rapidStarted = false;
            rapidClock = { w: 180, b: 180 };
            cameraZoom = { scale: 1, targetScale: 1, focusX: 0.5, focusY: 0.5 };
            document.getElementById('gameover-modal').classList.add('hidden');
            updateUI();
        }

        function toggleAI() {
            vsAI = !vsAI;
            document.getElementById('ai-mode-label').textContent = vsAI ? 'Contra IA Táctica' : '2 Jugadores Local';
            if (vsAI && chess.turn() === 'b' && !activeAnim && !chess.game_over()) {
                makeAIMove();
            }
        }

        function toggleSound() {
            soundEnabled = !soundEnabled;
            document.getElementById('sound-icon').textContent = soundEnabled ? '🔊' : '🔇';
            document.getElementById('sound-label').textContent = soundEnabled ? 'Sonido: Activado' : 'Sonido: Silenciado';
        }

        // ============================================================================
        // BUCLE PRINCIPAL DE ANIMACIÓN (60 FPS)
        // ============================================================================
        let lastFrameTime = 0;
        function gameLoop(timestamp) {
            if (!lastFrameTime) lastFrameTime = timestamp;
            const dt = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
            lastFrameTime = timestamp;

            updateAnimations(dt);
            updateRapidClock(dt);
            render();

            requestAnimationFrame(gameLoop);
        }

        window.onload = function () {
            resizeCanvas();
            updateUI();
            requestAnimationFrame(gameLoop);
        };

