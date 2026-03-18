/**
 * main.js — Punto de entrada de ChessHub 3D
 * Inicializa Three.js, iluminación, cámara, OrbitControls y los subsistemas del juego.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game, COLOR } from './Game.js';
import { InputHandler } from './Input.js';
import { Openings } from './Openings.js';

// ── Renderer ──────────────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas');
const HUD_WIDTH = 230;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0f0f1a);
_resize();

// ── Escena ────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0f0f1a, 0.04);

// Ambiente espacial: campo de partículas de fondo
_addStarfield(scene);

// ── Cámara ────────────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(
  45,
  (window.innerWidth - HUD_WIDTH) / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 10, 9.5);
camera.lookAt(0, 0, 0);

// ── OrbitControls ─────────────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.minDistance    = 5;
controls.maxDistance    = 22;
controls.maxPolarAngle  = Math.PI / 2.1;   // no pasar por debajo del tablero
controls.enableDamping  = true;
controls.dampingFactor  = 0.07;
controls.update();

// ── Iluminación ───────────────────────────────────────────────────────────────

// Luz ambiental suave
scene.add(new THREE.AmbientLight(0xffffff, 0.45));

// Luz principal con sombras (cenital-lateral)
const sun = new THREE.DirectionalLight(0xfff8e0, 1.3);
sun.position.set(6, 14, 6);
sun.castShadow = true;
Object.assign(sun.shadow.mapSize, { width: 2048, height: 2048 });
Object.assign(sun.shadow.camera, { near: 1, far: 40, left: -10, right: 10, top: 10, bottom: -10 });
scene.add(sun);

// Relleno de sombra fría
const fill = new THREE.DirectionalLight(0x8090ff, 0.3);
fill.position.set(-5, 8, -4);
scene.add(fill);

// Luz de acento debajo del tablero (glow sutil)
const accent = new THREE.PointLight(0x4050ff, 0.5, 12);
accent.position.set(0, -2, 0);
scene.add(accent);

// ── Sistemas del juego ────────────────────────────────────────────────────────

const game     = new Game(scene);
const input    = new InputHandler(game, scene, camera, renderer, controls);
const openings = new Openings(game, input);

// Iniciar HUD de aperturas (asíncrono, carga el JSON)
openings.populateUI();

// Callback tras cada movimiento: actualizar HUD
input.onMoveCompleted = (move) => _updateHUD(move);

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  _resize();
  camera.aspect = (window.innerWidth - HUD_WIDTH) / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── Loop principal ────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  input.update();
  renderer.render(scene, camera);
}

// Ocultar pantalla de carga cuando Three.js esté listo
renderer.compile(scene, camera);
document.getElementById('loading').style.display = 'none';
animate();

// Exponer para depuración en consola
window.chessHub = { game, input, openings, scene, camera };

// ── Actualización del HUD ─────────────────────────────────────────────────────

function _updateHUD(move) {
  // Turno
  const isWhite = game.turn === COLOR.W;
  const turnEl  = document.getElementById('turn-indicator');
  turnEl.textContent = isWhite ? 'Turno: BLANCAS ♔' : 'Turno: NEGRAS ♚';
  if (isWhite) turnEl.classList.remove('black'); else turnEl.classList.add('black');

  // Historial de movimientos
  const list  = document.getElementById('move-list');
  const total = game.moveHistory.length;

  if (total % 2 === 1) {
    // Movimiento de blancas → nueva fila
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `
      <span class="move-num">${Math.ceil(total / 2)}.</span>
      <span class="move-w">${move.notation}</span>
      <span class="move-b" id="mr-${total}"></span>
    `;
    list.appendChild(row);
  } else {
    // Movimiento de negras → completar última fila
    const span = document.getElementById(`mr-${total - 1}`);
    if (span) span.textContent = move.notation;
  }
  list.scrollTop = list.scrollHeight;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _resize() {
  const w = window.innerWidth - HUD_WIDTH;
  const h = window.innerHeight;
  renderer.setSize(w, h);
}

/** Campo de estrellas de fondo */
function _addStarfield(scene) {
  const count  = 1800;
  const pos    = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 80;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, sizeAttenuation: true })
  );
  scene.add(stars);
}
