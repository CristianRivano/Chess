        /**
         * ============================================================================
         * MOTOR DE AJEDREZ CON ANIMACIONES DE VIDA Y COMBATE (BATTLE CHESS ENGINE)
         * ============================================================================
         */

        const appConfig = window.BATTLE_CHESS_CONFIG || {
            theme: 'ink', quality: 'high', particles: true, environment: true, reducedMotion: false, volume: 0.8,
            themes: { ink: { boardLight: '#E6D2B8', boardDark: '#522129' } }, save() {}
        };

        const canvas = document.getElementById('chessCanvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('game-container');

        function applySettings() {
            document.body.dataset.theme = appConfig.theme;
            const themeSelect = document.getElementById('theme-select');
            const qualitySelect = document.getElementById('quality-select');
            const particlesToggle = document.getElementById('particles-toggle');
            const environmentToggle = document.getElementById('environment-toggle');
            const motionToggle = document.getElementById('motion-toggle');
            const volumeRange = document.getElementById('volume-range');
            if (themeSelect) themeSelect.value = appConfig.theme;
            if (qualitySelect) qualitySelect.value = appConfig.quality;
            if (particlesToggle) particlesToggle.checked = appConfig.particles;
            if (environmentToggle) environmentToggle.checked = appConfig.environment;
            if (motionToggle) motionToggle.checked = appConfig.reducedMotion;
            if (volumeRange) volumeRange.value = appConfig.volume;
            if (window.Tone && Tone.Destination) {
                Tone.Destination.volume.value = appConfig.volume <= 0 ? -Infinity : -28 + appConfig.volume * 28;
            }
        }

        function toggleSettingsPanel() {
            document.getElementById('settings-panel').classList.toggle('hidden');
        }

        function bindSettings() {
            const bind = (id, key, transform = v => v) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('change', () => {
                    appConfig[key] = transform(el.type === 'checkbox' ? el.checked : el.value);
                    appConfig.save();
                    applySettings();
                    if (key === 'particles' && !appConfig.particles) particles = [];
                });
            };
            bind('theme-select', 'theme');
            bind('quality-select', 'quality');
            bind('particles-toggle', 'particles');
            bind('environment-toggle', 'environment');
            bind('motion-toggle', 'reducedMotion');
            bind('volume-range', 'volume', Number);
            applySettings();
        }

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
        let inkSilhouettes = [];
        let victoryState = null;
        let battleFreeze = 0;
        let checkAlarmLevel = 0;
        let ambientEmbers = BATTLE_ENVIRONMENT.createEmbers();
        let windLeaves = BATTLE_ENVIRONMENT.createLeaves();

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
        let synthCombat, synthMate;

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

                synthCombat = new Tone.MembraneSynth({
                    pitchDecay: 0.035,
                    octaves: 3,
                    envelope: { attack: 0.004, decay: 0.18, sustain: 0.02, release: 0.08 }
                }).toDestination();
                synthCombat.volume.value = -8;

                synthMate = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'fatsawtooth' },
                    envelope: { attack: 0.015, decay: 0.25, sustain: 0.18, release: 0.5 }
                }).toDestination();
                synthMate.volume.value = -10;

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
                if (type === 'check') {
                    synthMagic.triggerAttackRelease(checkAlarmLevel > 1 ? 'G5' : 'E5', '16n', now);
                    synthMagic.triggerAttackRelease('C5', '32n', now + 0.11);
                }
                if (type === 'combat-rook') synthCombat.triggerAttackRelease('C1', '8n', now);
                if (type === 'combat-knight') synthCombat.triggerAttackRelease('G2', '16n', now);
                if (type === 'combat-bishop') synthMagic.triggerAttackRelease('A4', '16n', now);
                if (type === 'combat-queen') {
                    synthMagic.triggerAttackRelease('E5', '16n', now);
                    synthMagic.triggerAttackRelease('B5', '16n', now + 0.08);
                }
                if (type === 'combat-king') synthCombat.triggerAttackRelease('F1', '8n', now);
                if (type === 'combat-pawn') synthSlash.triggerAttackRelease('32n', now);
                if (type === 'mate') {
                    synthMate.triggerAttackRelease(['C4', 'G4', 'C5'], '2n', now);
                    synthMate.triggerAttackRelease(['E4', 'B4', 'E5'], '2n', now + 0.18);
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

                    const boardTheme = appConfig.themes[appConfig.theme] || appConfig.themes.ink;
                    ctx.fillStyle = isLight ? boardTheme.boardLight : boardTheme.boardDark;
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

            if (!activeAnim && chess.in_check() && lastMove) {
                const kingSq = findKingSquare(chess.turn());
                if (kingSq) {
                    const from = squareToCoords(lastMove.to), king = squareToCoords(kingSq);
                    ctx.save();
                    ctx.globalAlpha = 0.55 + (Math.sin(globalTime * 6) + 1) * 0.12;
                    ctx.strokeStyle = '#F05D5E';
                    ctx.fillStyle = '#F05D5E';
                    ctx.lineWidth = Math.max(2, sqSize * 0.026);
                    const ax = (from.col+.5)*sqSize, ay=(from.row+.5)*sqSize, bx=(king.col+.5)*sqSize, by=(king.row+.5)*sqSize;
                    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                    const ang = Math.atan2(by-ay, bx-ax);
                    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx-Math.cos(ang-.45)*sqSize*.2, by-Math.sin(ang-.45)*sqSize*.2); ctx.lineTo(bx-Math.cos(ang+.45)*sqSize*.2, by-Math.sin(ang+.45)*sqSize*.2); ctx.closePath(); ctx.fill();
                    ctx.restore();
                }
            }

            drawBattleEnvironment(ctx, size, sqSize);

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
                        ctx.strokeStyle = chess.in_check() ? '#F05D5E' : '#E5A853';
                        ctx.lineWidth = 3.5;
                        ctx.beginPath();
                        ctx.arc(cx, cy, sqSize * 0.38 + Math.sin(globalTime * 6) * 2, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = chess.in_check()
                            ? `rgba(240, 93, 94, ${0.42 + (Math.sin(globalTime * 8) + 1) * 0.16})`
                            : 'rgba(201, 134, 59, 0.78)';
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
                        square: sqName,
                        inCheck: !activeAnim && chess.in_check() && piece.type === 'k' && piece.color === chess.turn(),
                        victoryPose: Boolean(victoryState && victoryState.square === sqName)
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
                    const jumpHeight = Math.sin((progress / (activeAnim.isCapture ? 0.82 : 1)) * Math.PI) * sqSize * 0.9;
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
                        attackProgress: phase === 'approach' && moveObj.piece === 'q' ? progress * 0.9 : attackSwing,
                        scale: phase === 'clash' ? 1 + attackSwing * 0.18 : 1.05,
                        facing: toCol >= fromCol ? 1 : -1,
                        idleSeed: (fromCol * 13 + fromRow * 29) % 100
                    }
                );
            }

            drawCombatSignature(ctx, activeAnim, sqSize);

            for (const ghost of inkSilhouettes) {
                const gx = (ghost.col + 0.5) * sqSize;
                const gy = (ghost.row + 0.5) * sqSize;
                ctx.save();
                ctx.globalAlpha = ghost.life * 0.62;
                ctx.translate(gx, gy - sqSize * 0.05);
                ctx.scale(ghost.scale, ghost.scale);
                ctx.fillStyle = ghost.color;
                ctx.strokeStyle = ghost.color;
                ctx.lineWidth = Math.max(2, sqSize * 0.028);
                ctx.shadowColor = ghost.color;
                ctx.shadowBlur = sqSize * 0.16;
                ctx.beginPath();
                ctx.ellipse(0, sqSize * 0.28, sqSize * 0.24, sqSize * 0.09, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-sqSize * 0.2, sqSize * 0.25);
                ctx.quadraticCurveTo(-sqSize * 0.16, -sqSize * 0.18, 0, -sqSize * 0.32);
                ctx.quadraticCurveTo(sqSize * 0.16, -sqSize * 0.18, sqSize * 0.2, sqSize * 0.25);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
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
                if (p.type === 'ink' || p.type === 'brush') {
                    // Trazos de pincel y gotas: la tinta conserva dirección y velocidad.
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(1, p.size * (p.type === 'brush' ? 0.45 : 0.72));
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - Math.cos(p.angle) * p.length, p.y - Math.sin(p.angle) * p.length);
                    ctx.stroke();
                    ctx.globalAlpha *= 0.82;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(1.2, p.size * 0.7), 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'droplet') {
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, Math.max(1.5, p.size * 0.7), Math.max(2, p.size * 1.35), p.angle, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'smoke') {
                    ctx.globalAlpha *= 0.55;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(2, p.size * 1.4), 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'stain') {
                    ctx.globalAlpha *= 0.8;
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, p.size * 3.2, p.size * 1.3, 0, 0, Math.PI * 2);
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
            inkSilhouettes = [];
            victoryState = null;
            battleFreeze = 0;
            checkAlarmLevel = 0;
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
            applySettings();
            bindSettings();
            resizeCanvas();
            updateUI();
            requestAnimationFrame(gameLoop);
        };

