/* Battle Chess — configuración persistente y temas */
(() => {
    const key = 'battle-chess-settings-v1';
    const themes = {
        ink: {
            label: 'Tinta Granate',
            boardLight: '#E6D2B8', boardDark: '#522129',
            bg: '#3B141A', surface: '#522129', accent: '#E5A853', saffron: '#C9863B'
        },
        parchment: {
            label: 'Pergamino',
            boardLight: '#F4E8CF', boardDark: '#8B6948',
            bg: '#4A3423', surface: '#6A4A30', accent: '#F3C969', saffron: '#B7793D'
        },
        midnight: {
            label: 'Noche Azul',
            boardLight: '#C9D4E3', boardDark: '#26364D',
            bg: '#101827', surface: '#1B2940', accent: '#7DD3FC', saffron: '#818CF8'
        }
    };
    const defaults = { theme: 'ink', quality: 'high', particles: true, environment: true, reducedMotion: false, volume: 0.8 };
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) {}
    window.BATTLE_CHESS_CONFIG = {
        ...defaults, ...saved, themes,
        save() { localStorage.setItem(key, JSON.stringify({
            theme: this.theme, quality: this.quality, particles: this.particles,
            environment: this.environment, reducedMotion: this.reducedMotion, volume: this.volume
        })); }
    };
})();
