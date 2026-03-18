# ChessHub 3D — MVP

Tablero de ajedrez 3D interactivo construido con **Three.js puro** (sin bundler).
Funciona en el navegador copiando los archivos y sirviendo con cualquier servidor HTTP.

---

## Estructura de carpetas

```
chess3d/
├── index.html          # HTML principal con canvas WebGL + HUD lateral
├── data/
│   └── openings.json   # Base de aperturas en notación algebraica (SAN)
├── src/
│   ├── main.js         # Entrada: escena, cámara, luces, loop de render
│   ├── Game.js         # Estado del tablero board[col][row], validación de movimientos
│   ├── Piece.js        # Clase Piece con geometría 3D por primitivas Three.js
│   ├── Input.js        # Ratón/touch: selección, arrastre, suelta de piezas
│   ├── Animations.js   # Motor de tweens propio (sin dependencias)
│   └── Openings.js     # Parser SAN + control de reproducción de aperturas
└── README.md
```

---

## Ejecución local

> **Importante**: los módulos ES (`type="module"`) requieren un servidor HTTP.
> No funciona abriendo `index.html` directamente con `file://`.

### Opción A — Node.js (recomendado)
```bash
npx serve chess3d
# Visita http://localhost:3000
```

### Opción B — Python
```bash
cd chess3d
python -m http.server 8080
# Visita http://localhost:8080
```

### Opción C — Live Server (VS Code)
Instala la extensión **Live Server** → clic derecho sobre `index.html` → "Open with Live Server".

### Opción D — npx live-server
```bash
cd chess3d
npx live-server --port=8080
```

---

## Despliegue en GitHub Pages

1. Sube la carpeta `chess3d/` a un repositorio de GitHub.
2. En Settings → Pages → Source: selecciona `main` y la carpeta `/chess3d` (o raíz si está allí).
3. Listo — Three.js se carga desde CDN (unpkg), no necesitas build.

---

## Checklist de prueba manual

### Arrastre y snap de piezas
- [ ] Click sobre un peón blanco → casillas legales resaltadas en verde
- [ ] Arrastra el peón → la pieza sigue el cursor con elevación visual
- [ ] Suelta sobre una casilla verde → la pieza anima suavemente hasta el destino
- [ ] Intenta mover a una casilla ilegal → la pieza vibra y vuelve al origen
- [ ] Intenta mover una pieza negra en turno de blancas → sin respuesta

### Reglas básicas
- [ ] Peón avanza 1 casilla (o 2 desde la fila inicial)
- [ ] Peón captura en diagonal
- [ ] Torre se mueve en línea recta (no salta piezas)
- [ ] Caballo salta en L sobre otras piezas
- [ ] Alfil se mueve en diagonal
- [ ] Dama combina torre + alfil
- [ ] Rey mueve 1 casilla en cualquier dirección

### Aperturas
- [ ] Selecciona "Apertura Italiana" → variante "Gioco Piano"
- [ ] Clic en ▶ Siguiente movimiento → e4 se reproduce con animación
- [ ] Continúa hasta completar la variante
- [ ] Clic en ⏩ Reproducir apertura → reproducción automática cada ~0.9s
- [ ] Clic en ↺ Reiniciar → tablero vuelve a posición inicial

### Cámara
- [ ] Rueda del ratón → zoom in/out
- [ ] Click derecho + arrastra → orbitar alrededor del tablero
- [ ] La cámara no pasa por debajo del tablero

---

## Tecnologías

| Librería | Versión | Uso |
|---|---|---|
| Three.js | 0.160.0 | Renderizado WebGL 3D |
| OrbitControls | (addon Three.js) | Cámara orbital |

Carga desde CDN (unpkg) mediante `importmap` — no requiere `npm install`.

---

## Características implementadas

- Tablero 8x8 con base de madera y highlights de casillas
- 6 tipos de piezas con geometría 3D (primitivas combinadas)
- Validación completa de movimientos: peón, torre, caballo, alfil, dama, rey
- En passant y enroque básico
- Promoción automática de peón a dama
- Arrastre con ratón y touch (móvil)
- Animaciones de movimiento con arco parabólico
- Animación de sacudida en movimiento ilegal
- Highlights de movimientos legales (verde) y capturas (rojo)
- Sonidos procedurales con Web Audio API
- HUD lateral: turno, historial de movimientos, control de aperturas
- 4 aperturas con 2-3 variantes cada una: Italiana, Siciliana, Inglesa, Ruy López
- Parser SAN: peones, piezas, capturas, desambiguación, enroque, promoción
- Campo de estrellas de fondo
- Hook `onPieceMoved(piece, from, to)` para futura integración multijugador

---

## Notas para futuras mejoras

### Integración con backend
El hook `game.onPieceMoved = (piece, from, to) => {}` está diseñado para enviar movimientos a un servidor WebSocket o REST. Ejemplo:
```js
game.onPieceMoved = (piece, from, to) => {
  socket.emit('move', { from, to, piece: piece.type, color: piece.color });
};
```

### Motor de ajedrez
Para jaque/mate/tablas, conectar con **Stockfish.js** (WebAssembly):
```js
const engine = new Worker('stockfish.js');
engine.postMessage('position fen ' + getFEN());
engine.postMessage('go depth 10');
```

### Migración a Unity
Los módulos `Game.js` y `Piece.js` están diseñados como separación lógica/visual limpia.
La clase `Game` es puro estado (sin referencias Three.js excepto para escena) y puede portarse
a C# como `ChessBoard.cs` con mínimos cambios. Los hooks `onPieceMoved` se convierten en
`UnityEvent<Piece, string, string>`.

### Modelos 3D reales
Sustituye la función `BUILDERS[type]()` en `Piece.js` por:
```js
const gltf = await loader.loadAsync('./models/bishop.glb');
```
El resto del sistema no cambia.

### Multijugador online
1. Añadir autenticación (el backend de ChessHub ya tiene SQLite + Express).
2. Crear sala WebSocket con `socket.io`.
3. Llamar `input.applyProgrammaticMove()` al recibir movimiento del oponente.
