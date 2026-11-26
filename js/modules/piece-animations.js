/** Battle Chess — animaciones y dibujo de piezas */
        const BREATHING_PROFILES = {
            p: { rate: 3.8, amp: 0.010, stride: 0.07 },
            n: { rate: 2.7, amp: 0.016, stride: 0.18 },
            b: { rate: 2.2, amp: 0.022, stride: 0.14 },
            r: { rate: 1.45, amp: 0.012, stride: 0.14 },
            q: { rate: 1.8, amp: 0.026, stride: 0.14 },
            k: { rate: 1.25, amp: 0.030, stride: 0.14 }
        };

        function drawCharacter(ctx, piece, cx, cy, size, state = {}) {
            const {
                walkCycle = 0,
                attackProgress: rawAttackProgress = 0,
                hitFlash = 0,
                scale = 1,
                facing = 1,
                isSelected = false,
                alpha = 1,
                idleSeed = 0,
                victoryPose = false,
                inCheck = false
            } = state;
            const attackProgress = victoryPose ? 1 : rawAttackProgress;

            ctx.save();
            ctx.globalAlpha = alpha;

            const breathing = BREATHING_PROFILES[piece.type] || { rate: 2.4, amp: 0.018, stride: 0.14 };
            const breath = Math.sin(globalTime * breathing.rate + cx * 0.1 + idleSeed) * size * breathing.amp;
            const stepAmount = breathing.stride;
            const stepBounce = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * (size * stepAmount);
            const idleWave = Math.sin(globalTime * 1.7 + idleSeed) * size * 0.012;
            const idleTilt = Math.sin(globalTime * 1.25 + idleSeed) * 0.018;
            const damageShake = hitFlash > 0
                ? Math.sin(globalTime * 58 + idleSeed) * size * 0.045
                : (inCheck ? Math.sin(globalTime * 22 + idleSeed) * size * 0.028 : 0);
            const groundStomp = piece.type === 'r' && walkCycle > 0 ? Math.max(0, Math.sin(walkCycle * Math.PI * 2)) : 0;
            const tilt = Math.sin(walkCycle * Math.PI * 2) * (piece.type === 'p' ? 0.055 : 0.1) + idleTilt;

            ctx.translate(cx + damageShake, cy - stepBounce + idleWave);
            ctx.scale(scale * (1 + groundStomp * 0.045), scale * (1 - groundStomp * 0.065));

            // Sombra en el suelo
            ctx.save();
            ctx.translate(0, stepBounce + size * 0.36);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.3, size * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (piece.type === 'r' && groundStomp > 0) {
                ctx.save();
                ctx.globalAlpha = groundStomp * 0.48;
                ctx.strokeStyle = isSelected ? '#E5A853' : '#111111';
                ctx.lineWidth = Math.max(1.5, size * 0.018);
                ctx.beginPath();
                ctx.ellipse(0, size * 0.36, size * (0.28 + groundStomp * 0.16), size * 0.07, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

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
            if (victoryPose) {
                ctx.translate(0, -size * 0.055);
                ctx.rotate(-facing * 0.08);
            }

            const isWhite = piece.color === 'w';
            const r = size * 0.38;
            const capeWave = Math.sin(globalTime * 2.4 + idleSeed) * r * 0.07
                + (attackProgress * r * 0.12);

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
                ctx.rotate(-0.16 + attackProgress * 1.15);
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
                ctx.quadraticCurveTo(-r * 0.44 + capeWave, r * 0.25, -r * 0.48 + capeWave, r * 0.74);
                ctx.lineTo(-r * 0.28, r * 0.74);
                ctx.quadraticCurveTo(-r * 0.2, r * 0.32, -r * 0.12, r * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(r * 0.16, -r * 0.08);
                ctx.quadraticCurveTo(r * 0.44 - capeWave, r * 0.25, r * 0.48 - capeWave, r * 0.74);
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
                ctx.quadraticCurveTo(-r * 0.28 + capeWave, r * 0.15, -r * 0.22 + capeWave * 0.5, -r * 0.14);
                ctx.lineTo(r * 0.22, -r * 0.14);
                ctx.quadraticCurveTo(r * 0.28 - capeWave, r * 0.15, r * 0.46 - capeWave * 0.5, r * 0.74);
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
                ctx.rotate(-0.15 - attackProgress * 0.75 + Math.sin(globalTime * 1.5 + idleSeed) * 0.07);
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

