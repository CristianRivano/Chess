/** Battle Chess — tablero y entorno visual */
const BATTLE_ENVIRONMENT = {
    createEmbers() { return Array.from({ length: 34 }, (_, i) => ({
        seed: i * 17.31, x: (i * 0.6180339887) % 1, y: (i * 0.3779644732) % 1,
        size: 0.8 + (i % 4) * 0.55, speed: 0.12 + (i % 5) * 0.035
    })); },
    createLeaves() { return Array.from({ length: 7 }, (_, i) => ({
        seed: i * 9.7, x: (i * 0.73) % 1, y: 0.12 + (i * 0.17) % 0.8,
        speed: 0.08 + (i % 3) * 0.025, size: 3 + (i % 3) * 1.5
    })); }
};

function drawBattleEnvironment(ctx, size, sqSize) {
            // Textura de papel, manchas de tinta y cuadrícula dibujada a mano.
            ctx.save();
            ctx.globalAlpha = appConfig.environment ? 0.12 : 0;
            ctx.strokeStyle = chess.turn() === 'w' ? '#8B765D' : '#6E7586';
            ctx.lineWidth = Math.max(0.45, sqSize * 0.008);
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const seed = row * 31 + col * 17;
                    const tx = col * sqSize + ((seed * 13) % 17) / 17 * sqSize;
                    const ty = row * sqSize + ((seed * 7) % 19) / 19 * sqSize;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty);
                    ctx.lineTo(tx + sqSize * 0.12, ty + Math.sin(seed) * 1.5);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = appConfig.environment ? 0.28 : 0;
            ctx.strokeStyle = chess.turn() === 'w' ? '#7A5D42' : '#697385';
            ctx.lineWidth = Math.max(0.8, sqSize * 0.012);
            for (let i = 0; i <= 8; i++) {
                const wobble = Math.sin(globalTime * 0.35 + i) * 0.7;
                ctx.beginPath(); ctx.moveTo(i * sqSize + wobble, 0); ctx.lineTo(i * sqSize - wobble, size); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * sqSize - wobble); ctx.lineTo(size, i * sqSize + wobble); ctx.stroke();
            }
            // Manchas en las esquinas del pergamino.
            ctx.globalAlpha = appConfig.environment ? 0.16 : 0;
            ctx.fillStyle = '#111111';
            for (const [sx, sy, rot] of [[0.06,0.06,-0.25],[0.94,0.08,0.35],[0.08,0.92,0.2],[0.92,0.9,-0.3]]) {
                ctx.save(); ctx.translate(sx * size, sy * size); ctx.rotate(rot);
                ctx.beginPath(); ctx.ellipse(0, 0, size * 0.055, size * 0.024, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(size * 0.045, size * 0.012, size * 0.012, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
            ctx.restore();

            // Iluminación ambiental que cambia con el ejército del turno.
            ctx.save();
            const warm = chess.turn() === 'w';
            const light = ctx.createRadialGradient(warm ? size * 0.32 : size * 0.68, size * 0.28, 0, size * 0.5, size * 0.5, size * 0.78);
            light.addColorStop(0, warm ? 'rgba(255, 220, 160, 0.16)' : 'rgba(125, 155, 220, 0.14)');
            light.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = light;
            ctx.fillRect(0, 0, size, size);
            ctx.restore();

            // Hojas de papel que cruzan el campo con una corriente de viento.
            ctx.save();
            ctx.globalAlpha = appConfig.environment ? 0.48 : 0;
            ctx.strokeStyle = '#F5EBDD';
            ctx.fillStyle = '#E8D8C2';
            for (const leaf of windLeaves) {
                const lx = ((leaf.x + globalTime * leaf.speed * 0.08) % 1) * size;
                const ly = ((leaf.y + Math.sin(globalTime * 1.5 + leaf.seed) * 0.035 + 1) % 1) * size;
                ctx.save(); ctx.translate(lx, ly); ctx.rotate(globalTime * 1.8 + leaf.seed);
                ctx.beginPath(); ctx.moveTo(-leaf.size, 0); ctx.quadraticCurveTo(0, -leaf.size * 0.7, leaf.size, 0); ctx.quadraticCurveTo(0, leaf.size * 0.7, -leaf.size, 0); ctx.fill(); ctx.stroke(); ctx.restore();
            }
            ctx.restore();

            // Bruma de brasas y energía que mantiene vivo el campo de batalla
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            for (const ember of ambientEmbers) {
                const ex = ((ember.x + globalTime * ember.speed * 0.018) % 1) * size;
                const ey = ((ember.y - globalTime * ember.speed * 0.026 + 1) % 1) * size;
                const flicker = 0.28 + (Math.sin(globalTime * 3 + ember.seed) + 1) * 0.18;
                ctx.globalAlpha = appConfig.environment ? flicker : 0;
                ctx.fillStyle = ember.seed % 2 ? '#E5A853' : '#FDF3E7';
                ctx.beginPath();
                ctx.arc(ex, ey, ember.size * (0.7 + Math.sin(globalTime * 4 + ember.seed) * 0.25), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

        }
