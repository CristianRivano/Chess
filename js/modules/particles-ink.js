/** Battle Chess — partículas, tinta y trazos */
        const FACTION_PARTICLES = {
            w: { ink: 'rgba(18, 18, 18, 0.90)', brush: 'rgba(45, 45, 45, 0.68)', spark: '#F4F1E7', accent: '#D6C4A8' },
            b: { ink: 'rgba(246, 244, 232, 0.92)', brush: 'rgba(224, 218, 198, 0.72)', spark: '#E5A853', accent: '#C9863B' }
        };

        function spawnParticles(x, y, color, count = 15, speedScale = 1, type = 'spark') {
            if (!appConfig.particles) return;
            const qualityScale = { high: 1, medium: 0.68, low: 0.38 }[appConfig.quality] || 1;
            count = Math.max(1, Math.round(count * qualityScale));
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
                    length: type === 'ink' || type === 'brush' ? 5 + Math.random() * 12 : 0,
                    gravity: type === 'droplet' ? 0.08 : (type === 'smoke' ? -0.012 : 0),
                    rotation: Math.random() * Math.PI * 2
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

        function spawnInkSilhouette(col, row, piece, color) {
            inkSilhouettes.push({ col, row, piece, color, life: 1, scale: 0.72 });
            if (inkSilhouettes.length > 3) inkSilhouettes.shift();
        }

        function spawnFactionParticles(x, y, faction, kind = 'ink', count = 8, speed = 0.8) {
            const palette = FACTION_PARTICLES[faction] || FACTION_PARTICLES.w;
            const color = kind === 'brush' ? palette.brush : kind === 'spark' ? palette.spark : palette.ink;
            spawnParticles(x, y, color, count, speed, kind);
        }

