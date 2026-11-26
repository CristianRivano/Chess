# Battle Chess — estructura modular

El proyecto mantiene una entrada HTML estática y un motor clásico compatible con los controles `onclick` existentes. La lógica se separa por responsabilidad para facilitar futuras mejoras sin mezclar renderizado, efectos y reglas.

## Capas principales

- `index.html`: estructura semántica, controles, panel de configuración y carga ordenada de dependencias.
- `styles.css`: diseño visual, temas CSS, responsive layout y animaciones de interfaz.
- `js/config.js`: preferencias persistentes, temas y configuración de calidad, partículas, ambiente, movimiento y audio.

## Módulos de batalla

- `js/modules/board-environment.js`: textura de papel, cuadrícula irregular, manchas, iluminación por turno, hojas, brasas y ciclo ambiental.
- `js/modules/particles-ink.js`: partículas, tinta, gotas, humo, trazos de pincel, siluetas derrotadas y partículas por facción.
- `js/modules/piece-animations.js`: perfiles de respiración y dibujo animado de torre, caballo, alfil, reina, rey y peón.
- `js/modules/checkmate.js`: detección de atacantes, resolución de movimientos, jaque, jaque doble, jaque mate y victoria.
- `js/modules/special-combat.js`: entrada de piezas, combates por tipo, cámara lenta, impactos, contraataques, sonido y firmas visuales.
- `js/battle-chess.js`: orquestador del estado, reglas Chess.js, IA, audio base, interacción, render principal y temporizador rápido.

## Orden de carga

`config.js` se carga primero; después se cargan los módulos de entorno, partículas, piezas, jaque y combates. `battle-chess.js` se carga al final para inicializar el estado y conectar todas las funciones globales.

## Verificación local

Servir la carpeta con cualquier servidor estático y abrir `index.html`. El motor continúa usando `window.onload` y funciones globales para mantener compatibilidad con los botones y el tablero Canvas.
