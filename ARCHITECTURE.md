# Battle Chess — estructura modular

- `index.html`: estructura semántica, controles y dependencias externas.
- `styles.css`: diseño, responsive layout y animaciones CSS.
- `js/battle-chess.js`: motor de ajedrez, render Canvas, piezas, partículas, audio, IA, temporizador e interacción.

## Punto de entrada

`index.html` carga `styles.css` y `js/battle-chess.js`; las dependencias de Tailwind, Chess.js, Tone.js y Google Fonts se mantienen externas.

## Verificación local

Servir la carpeta con cualquier servidor estático y abrir `index.html`. El motor continúa usando `window.onload` y las funciones globales de los controles para mantener compatibilidad con los botones existentes.
