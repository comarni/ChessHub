/**
 * Openings.js — Parser de aperturas en notación algebraica estándar (SAN)
 *
 * Lee openings.json, llena los selects del HUD y aplica los movimientos
 * sobre el tablero paso a paso usando InputHandler.applyProgrammaticMove().
 *
 * Formato SAN soportado en MVP:
 *   - Movimientos de peón:          e4, exd5, e8=Q
 *   - Movimientos de pieza:         Nf3, Bxc5, Rxe8
 *   - Desambiguación:               Nbd2, R1e2
 *   - Enroque:                      O-O, O-O-O
 *
 * Futura extensión: conectar con backend para obtener aperturas dinámicas.
 */

import { COLOR, TYPE, colIdx, rowIdx } from './Game.js';

export class Openings {
  /**
   * @param {import('./Game.js').Game}       game
   * @param {import('./Input.js').InputHandler} input
   */
  constructor(game, input) {
    this.game  = game;
    this.input = input;

    this._data         = null;   // JSON completo cargado
    this._currentMoves = [];     // array de strings SAN de la variante activa
    this._moveIndex    = 0;      // índice del siguiente movimiento a aplicar
    this._playTimer    = null;   // setInterval para reproducción automática
  }

  // ── Inicialización UI ─────────────────────────────────────────────────────

  /** Carga el JSON y puebla los selects del HUD */
  async populateUI() {
    try {
      const res  = await fetch('./data/openings.json');
      this._data = await res.json();
    } catch (err) {
      console.error('No se pudo cargar openings.json:', err);
      document.getElementById('status-msg').textContent = '⚠ No se pudo cargar aperturas';
      return;
    }

    const sel = document.getElementById('opening-select');
    for (const op of this._data.openings) {
      const opt = document.createElement('option');
      opt.value = op.id;
      opt.textContent = `${op.name} (${op.eco})`;
      sel.appendChild(opt);
    }

    // Al cambiar apertura → llenar variantes
    sel.addEventListener('change', () => this._onOpeningChange(sel.value));

    // Al cambiar variante → cargar movimientos
    document.getElementById('variant-select').addEventListener('change', () => {
      this._loadVariant();
    });

    document.getElementById('btn-next-move').addEventListener('click', () => {
      this._stepForward();
    });

    document.getElementById('btn-play-all').addEventListener('click', () => {
      this._playAll();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      this._stopPlayback();
      this.game.reset();
      this._moveIndex = 0;
      document.getElementById('move-list').innerHTML = '';
      document.getElementById('turn-indicator').textContent = 'Turno: BLANCAS ♔';
      document.getElementById('turn-indicator').classList.remove('black');
      document.getElementById('status-msg').textContent = 'Partida reiniciada';
    });
  }

  _onOpeningChange(id) {
    const op  = this._data.openings.find(o => o.id === id);
    if (!op) return;

    const varSel = document.getElementById('variant-select');
    varSel.innerHTML = '';
    for (const v of op.variants) {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name;
      varSel.appendChild(opt);
    }

    this._loadVariant();

    const desc = document.getElementById('status-msg');
    if (desc) desc.textContent = op.description;
  }

  _loadVariant() {
    const opId  = document.getElementById('opening-select').value;
    const vName = document.getElementById('variant-select').value;
    if (!opId || !vName) return;

    const op = this._data.openings.find(o => o.id === opId);
    const v  = op?.variants.find(x => x.name === vName);
    if (!v) return;

    this._currentMoves = v.moves;
    this._moveIndex    = 0;
    this._stopPlayback();

    // Reiniciar tablero al cargar una variante
    this.game.reset();
    document.getElementById('move-list').innerHTML = '';
    document.getElementById('turn-indicator').textContent = 'Turno: BLANCAS ♔';
    document.getElementById('turn-indicator').classList.remove('black');
    document.getElementById('status-msg').textContent =
      `Apertura cargada: ${op.name} — ${v.name} (${v.moves.length} movimientos)`;
  }

  // ── Control de reproducción ───────────────────────────────────────────────

  _stepForward() {
    if (this._moveIndex >= this._currentMoves.length) {
      document.getElementById('status-msg').textContent = '✓ Apertura completada';
      return;
    }
    const san = this._currentMoves[this._moveIndex];
    const ok  = this._applyNotation(san, this.game.turn);
    if (ok) {
      this._moveIndex++;
      this._updateTurnUI();
    } else {
      document.getElementById('status-msg').textContent =
        `⚠ No se pudo aplicar: "${san}" (movimiento ${this._moveIndex + 1})`;
      this._stopPlayback();
    }
  }

  _playAll() {
    if (this._playTimer) { this._stopPlayback(); return; }
    const btn = document.getElementById('btn-play-all');
    btn.textContent = '⏸ Pausar';
    this._playTimer = setInterval(() => {
      if (this._moveIndex >= this._currentMoves.length || this.input.animations.busy) return;
      this._stepForward();
      if (this._moveIndex >= this._currentMoves.length) {
        this._stopPlayback();
      }
    }, 900);
  }

  _stopPlayback() {
    if (this._playTimer) { clearInterval(this._playTimer); this._playTimer = null; }
    document.getElementById('btn-play-all').textContent = '⏩ Reproducir apertura';
  }

  _updateTurnUI() {
    const isWhite = this.game.turn === COLOR.W;
    const el = document.getElementById('turn-indicator');
    el.textContent = isWhite ? 'Turno: BLANCAS ♔' : 'Turno: NEGRAS ♚';
    if (isWhite) el.classList.remove('black'); else el.classList.add('black');
  }

  // ── Parser SAN ────────────────────────────────────────────────────────────

  /**
   * Analiza un string SAN y aplica el movimiento sobre el tablero.
   * @param {string} san     — ej. 'e4', 'Nf3', 'Bxc5', 'O-O'
   * @param {string} color   — COLOR.W | COLOR.B
   * @returns {boolean}
   */
  _applyNotation(san, color) {
    // Limpiar adornos
    san = san.replace(/[+#!?]/g, '').trim();

    // ── Enroque ───────────────────────────────────────────────────────────
    if (san === 'O-O' || san === 'O-O-O') {
      return this._applyCastle(san, color);
    }

    const parsed = _parseSAN(san);
    if (!parsed) { console.warn('SAN no reconocido:', san); return false; }

    const { pieceType, fromColHint, fromRowHint, toCol, toRow } = parsed;

    // Buscar la pieza del color correcto que puede llegar a destino
    const candidates = this.game.pieces.filter(p => {
      if (p.color !== color) return false;
      if (p.type  !== pieceType) return false;
      if (fromColHint !== -1 && p.col !== fromColHint) return false;
      if (fromRowHint !== -1 && p.row !== fromRowHint) return false;
      return this.game.isLegal(p, toCol, toRow);
    });

    if (candidates.length === 0) {
      console.warn(`No hay pieza ${pieceType} de ${color} que pueda ir a ${toCol},${toRow}. SAN: ${san}`);
      return false;
    }
    if (candidates.length > 1) {
      console.warn(`Ambigüedad en ${san}: ${candidates.length} candidatos`);
    }

    return this.input.applyProgrammaticMove(candidates[0], toCol, toRow);
  }

  _applyCastle(san, color) {
    const row  = color === COLOR.W ? 0 : 7;
    const king = this.game.getPiece(4, row);
    if (!king || king.type !== TYPE.K) return false;

    const toCol = san === 'O-O' ? 6 : 2;
    return this.input.applyProgrammaticMove(king, toCol, row);
  }
}

// ── Parser SAN interno ────────────────────────────────────────────────────────

/**
 * Convierte una string SAN a su representación estructurada.
 * @returns {{ pieceType, fromColHint, fromRowHint, toCol, toRow } | null}
 */
function _parseSAN(san) {
  let s = san.replace(/[+#!=?]/g, '');

  // Tipo de pieza
  let pieceType = TYPE.P;
  if ('KQRBN'.includes(s[0])) {
    pieceType = s[0];
    s = s.slice(1);
  }

  // Eliminar 'x' (captura)
  s = s.replace('x', '');

  // Ahora s tiene: [desambiguación opcional][colDestino][filaDestino]
  // Los últimos 2 chars son siempre el destino: letra + número
  if (s.length < 2) return null;

  const toColChar = s[s.length - 2];
  const toRowChar = s[s.length - 1];

  if (!/[a-h]/.test(toColChar) || !/[1-8]/.test(toRowChar)) return null;

  const toCol = colIdx(toColChar);
  const toRow = rowIdx(toRowChar);

  // Desambiguación
  const disambig = s.slice(0, -2);
  let fromColHint = -1;
  let fromRowHint = -1;
  for (const ch of disambig) {
    if (/[a-h]/.test(ch)) fromColHint = colIdx(ch);
    if (/[1-8]/.test(ch)) fromRowHint = rowIdx(ch);
  }

  return { pieceType, fromColHint, fromRowHint, toCol, toRow };
}
