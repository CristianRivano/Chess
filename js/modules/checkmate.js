/** Battle Chess — jaque, jaque mate y resolución de movimientos */
        function countAttackers(targetSquare, attackerColor) {
            const target = squareToCoords(targetSquare);
            const board = chess.board();
            let count = 0;
            const clearRay = (fromCol, fromRow, dc, dr) => {
                let col = fromCol + dc, row = fromRow + dr;
                while (col >= 0 && col < 8 && row >= 0 && row < 8) {
                    if (col === target.col && row === target.row) return true;
                    if (board[row][col]) return false;
                    col += dc; row += dr;
                }
                return false;
            };
            for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (!piece || piece.color !== attackerColor) continue;
                const dc = target.col - col, dr = target.row - row;
                const adx = Math.abs(dc), ady = Math.abs(dr);
                let attacks = false;
                if (piece.type === 'n') attacks = (adx === 1 && ady === 2) || (adx === 2 && ady === 1);
                if (piece.type === 'k') attacks = adx <= 1 && ady <= 1 && (adx + ady > 0);
                if (piece.type === 'p') attacks = ady === 1 && adx === 1 && dr === (attackerColor === 'w' ? -1 : 1);
                if (piece.type === 'b' || piece.type === 'q') attacks = adx === ady && adx > 0 && clearRay(col, row, Math.sign(dc), Math.sign(dr));
                if (piece.type === 'r' || piece.type === 'q') attacks = attacks || ((dc === 0 || dr === 0) && (dc !== 0 || dr !== 0) && clearRay(col, row, Math.sign(dc), Math.sign(dr)));
                if (attacks) count++;
            }
            return count;
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
                    spawnParticles((king.col + 0.5) * sqSize, (king.row + 0.5) * sqSize, 'rgba(220, 38, 38, 0.9)', 22, 1.1, 'ink');
                    const attackerCount = countAttackers(kingSq, moveObj.color);
                    checkAlarmLevel = chess.in_checkmate() || attackerCount > 1 ? 2 : 1;
                    playSound('check');
                    if (chess.in_checkmate()) {
                        playCombatSound(moveObj.piece, true);
                        battleFreeze = 0.9;
                    }
                    spawnFloatingText((king.col + 0.5) * sqSize,
                        (king.row + 0.25) * sqSize,
                        chess.in_checkmate() ? '¡JAQUE MATE!' : '¡JAQUE!', '#F8B4B4');
                    triggerShake(chess.in_checkmate() ? 12 : 6);
                    showCombatBanner(chess.in_checkmate()
                        ? `¡${PIECE_NAMES[moveObj.piece] || 'La pieza atacante'} da el golpe final!`
                        : (attackerCount > 1 ? '¡JAQUE DOBLE! Dos fuerzas cercan al rey' : '¡JAQUE! El rey está bajo ataque'));
                    if (chess.in_checkmate()) {
                        victoryState = { square: moveObj.to, color: moveObj.color, type: moveObj.piece };
                    }
                }
            } else if (!moveObj.captured) {
                const target = squareToCoords(moveObj.to);
                const sqSize = container.getBoundingClientRect().width / 8;
                spawnParticles((target.col + 0.5) * sqSize,
                    (target.row + 0.72) * sqSize,
                    'rgba(253, 243, 231, 0.5)', 8, 0.55, 'dust');
                spawnParticles((target.col + 0.5) * sqSize,
                    (target.row + 0.68) * sqSize,
                    moveObj.piece === 'q' ? 'rgba(229, 168, 83, 0.95)' : (moveObj.color === 'w' ? 'rgba(15, 15, 15, 0.9)' : 'rgba(245, 245, 238, 0.82)'),
                    12, 0.8, 'ink');
                spawnParticles((target.col + 0.5) * sqSize, (target.row + 0.68) * sqSize,
                    moveObj.piece === 'q' ? 'rgba(229, 168, 83, 0.55)' : 'rgba(20,20,20,0.48)',
                    1, 0.12, 'stain');
            }

            lastMove = { from: moveObj.from, to: moveObj.to };
            activeAnim = null;
            cameraZoom.targetScale = 1;
            updateUI();

            if (vsAI && chess.turn() === 'b' && !chess.game_over()) {
                setTimeout(makeAIMove, 450);
            }
        }

