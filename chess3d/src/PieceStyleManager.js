/**
 * PieceStyleManager.js — Selector de estilos visuales para las piezas.
 *
 * Estilos disponibles:
 *   'primitives'  — geometría Three.js (cubos, cilindros, esferas)
 *   'minimalista' — modelos STL del pack Hexagon Chess Set
 *
 * API:
 *   manager.applyStyle(id)              — aplica estilo a todas las piezas actuales
 *   manager.applyCurrentStyleToPiece(p) — reasigna estilo a una pieza individual (post-promoción)
 *   manager.buildPreviewUI(containerEl) — genera el panel HTML de previsualización
 */

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { TYPE } from './Constants.js';

// ── Definición de estilos ──────────────────────────────────────────────────────

const BASE = 'src/piezas/minimalista/';

export const STYLES = {
  primitives: {
    id:      'primitives',
    label:   'Primitivas 3D',
    type:    'builtin',
    symbols: { [TYPE.P]:'♟', [TYPE.R]:'♜', [TYPE.N]:'♞', [TYPE.B]:'♝', [TYPE.Q]:'♛', [TYPE.K]:'♚' },
    names:   { [TYPE.P]:'Peón', [TYPE.R]:'Torre', [TYPE.N]:'Caballo', [TYPE.B]:'Alfil', [TYPE.Q]:'Dama', [TYPE.K]:'Rey' },
    images:  null,
  },
  minimalista: {
    id:    'minimalista',
    label: 'Hexágono STL',
    type:  'stl',
    files: {
      [TYPE.P]: BASE + 'Peon.stl',
      [TYPE.R]: BASE + 'Torre.stl',
      [TYPE.N]: BASE + 'Caballo.stl',
      [TYPE.B]: BASE + 'Alfil.stl',
      [TYPE.Q]: BASE + 'Dama.stl',
      [TYPE.K]: BASE + 'Rey.stl',
    },
    images:  null,  // sin PNG — el panel usa símbolos unicode
    names:   { [TYPE.P]:'Peón', [TYPE.R]:'Torre', [TYPE.N]:'Caballo', [TYPE.B]:'Alfil', [TYPE.Q]:'Dama', [TYPE.K]:'Rey' },
    symbols: { [TYPE.P]:'♟', [TYPE.R]:'♜', [TYPE.N]:'♞', [TYPE.B]:'♝', [TYPE.Q]:'♛', [TYPE.K]:'♚' },
  },
};

// ── Clase principal ────────────────────────────────────────────────────────────

export class PieceStyleManager {
  constructor(game) {
    this.game         = game;
    this.currentStyle = 'primitives';
    this._cache       = {};   // type → BufferGeometry normalizada
    this._loader      = new STLLoader();
    this._onStyleChange = null;  // callback(styleId)
  }

  // ── Aplicar estilo ───────────────────────────────────────────────────────

  /**
   * Aplica un estilo a todas las piezas del tablero.
   * @param {string}   styleId    — 'primitives' | 'minimalista'
   * @param {Function} [onProg]   — (loaded, total) para barra de progreso
   */
  async applyStyle(styleId, onProg = null) {
    const cfg = STYLES[styleId];
    if (!cfg) return;

    if (cfg.type === 'builtin') {
      for (const p of this.game.pieces) p.resetToPrimitives();
    } else {
      await this._applySTL(cfg, onProg);
    }

    this.currentStyle = styleId;
    if (this._onStyleChange) this._onStyleChange(styleId);
  }

  /** Aplica el estilo activo a una pieza individual (tras promoción, por ejemplo) */
  async applyCurrentStyleToPiece(piece) {
    if (this.currentStyle === 'primitives') {
      piece.resetToPrimitives();
      return;
    }
    const geo = this._cache[piece.type];
    if (geo) {
      piece.setSTLGeometry(geo.clone());
    } else {
      // Cargar si no está cacheado
      await this.applyStyle(this.currentStyle);
    }
  }

  // ── STL internals ────────────────────────────────────────────────────────

  async _applySTL(cfg, onProg) {
    const types  = Object.keys(cfg.files);
    let   loaded = 0;

    for (const type of types) {
      if (!this._cache[type]) {
        try {
          const geo = await this._loader.loadAsync(cfg.files[type]);
          this._cache[type] = _normalizeSTL(geo);
        } catch (e) {
          console.warn('STL no disponible:', cfg.files[type], e.message);
        }
      }
      loaded++;
      if (onProg) onProg(loaded, types.length);
    }

    for (const piece of this.game.pieces) {
      const geo = this._cache[piece.type];
      if (geo) piece.setSTLGeometry(geo.clone());
    }
  }

  // ── Panel de previsualización ─────────────────────────────────────────────

  /**
   * Genera el HTML del panel de estilos dentro de `containerEl`.
   * Llama a este método desde main.js pasando el contenedor del HUD.
   */
  buildPreviewUI(containerEl) {
    const order = [TYPE.P, TYPE.N, TYPE.B, TYPE.R, TYPE.Q, TYPE.K];

    containerEl.innerHTML = `
      <div class="style-tabs" id="style-tabs"></div>
      <div id="piece-pack-label" class="pack-label"></div>
      <div class="piece-grid" id="piece-grid"></div>
      <div id="style-loading" class="style-loading" style="display:none">⏳ Cargando modelos…</div>
    `;

    const tabsEl  = containerEl.querySelector('#style-tabs');
    const gridEl  = containerEl.querySelector('#piece-grid');
    const labelEl = containerEl.querySelector('#piece-pack-label');
    const loadEl  = containerEl.querySelector('#style-loading');

    // Crear tabs
    for (const [id, cfg] of Object.entries(STYLES)) {
      const btn = document.createElement('button');
      btn.className   = 'style-tab' + (id === this.currentStyle ? ' active' : '');
      btn.dataset.id  = id;
      btn.textContent = cfg.label;
      btn.addEventListener('click', async () => {
        if (id === this.currentStyle) return;
        tabsEl.querySelectorAll('.style-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadEl.style.display = 'block';
        gridEl.style.opacity = '0.4';
        await this.applyStyle(id, (n, t) => {
          loadEl.textContent = `⏳ ${n}/${t} modelos…`;
        });
        loadEl.style.display = 'none';
        gridEl.style.opacity = '1';
        this._renderGrid(gridEl, labelEl, order, id);
      });
      tabsEl.appendChild(btn);
    }

    this._renderGrid(gridEl, labelEl, order, this.currentStyle);

    // Re-renderizar al cambiar de estilo por otras vías
    this._onStyleChange = (id) => this._renderGrid(gridEl, labelEl, order, id);
  }

  _renderGrid(gridEl, labelEl, order, styleId) {
    const cfg  = STYLES[styleId];
    labelEl.textContent = cfg.label;
    gridEl.innerHTML = '';

    for (const type of order) {
      const cell = document.createElement('div');
      cell.className   = 'piece-cell';
      cell.title       = cfg.names[type];

      if (cfg.images && cfg.images[type]) {
        const img     = document.createElement('img');
        img.src       = cfg.images[type];
        img.alt       = cfg.names[type];
        img.className = 'piece-thumb';
        cell.appendChild(img);
      } else {
        const sym       = document.createElement('span');
        sym.className   = 'piece-sym';
        sym.textContent = (cfg.symbols || STYLES.primitives.symbols)[type];
        cell.appendChild(sym);
      }

      const lbl = document.createElement('div');
      lbl.className   = 'piece-name';
      lbl.textContent = cfg.names[type];
      cell.appendChild(lbl);
      gridEl.appendChild(cell);
    }
  }
}

// ── Normalización STL ──────────────────────────────────────────────────────────

/**
 * Centra la geometría STL y la escala para que:
 *   - base en Y = 0
 *   - centrado en X y Z
 *   - altura ~0.75 u. (o ancho máximo si la pieza es más ancha que alta)
 */
function _normalizeSTL(geo) {
  geo.computeBoundingBox();
  let box  = geo.boundingBox;
  const sz = new THREE.Vector3();
  box.getSize(sz);

  // Si Z es el eje principal (modelo Z-up), rotar a Y-up
  if (sz.z > sz.y * 1.1) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    geo.computeBoundingBox();
    box = geo.boundingBox;
    box.getSize(sz);
  }

  // Centrar X/Z, base en Y=0
  const center = new THREE.Vector3();
  box.getCenter(center);
  geo.translate(-center.x, -box.min.y, -center.z);

  // Reescalar para que la altura sea TARGET_H (pero limitar el ancho también)
  geo.computeBoundingBox();
  geo.boundingBox.getSize(sz);

  const TARGET_H = 0.72;
  const maxW     = Math.max(sz.x, sz.z);
  // Si la pieza es muy ancha respecto a su altura, escalar por el ancho
  const scale    = (maxW > sz.y * 0.9)
    ? (TARGET_H * 0.85) / maxW
    : TARGET_H / sz.y;

  geo.scale(scale, scale, scale);
  geo.computeVertexNormals();
  return geo;
}
