/**
 * Game.js — Gestión del tablero y lógica de movimientos
 * Contiene la representación interna board[col][row] y la validación de cada pieza.
 * Emite el hook onPieceMoved(piece, from, to) para futura integración multijugador.
 */

import * as THREE from 'three';
import { Piece } from './Piece.js';
import { COLOR, TYPE } from './Constants.js';

// Re-exportar para que el resto del código pueda seguir importando desde Game.js
export { COLOR, TYPE };

// ── Utilidades de coordenadas ─────────────────────────────────────────────────

/** 'a'→0, 'h'→7 */
export function colIdx(c)  { return c.charCodeAt(0) - 97; }
/** '1'→0, '8'→7  */
export function rowIdx(r)  { return parseInt(r) - 1; }
/** (4,3) → 'e4'  */
export function toAlg(col, row) { return String.fromCharCode(97 + col) + (row + 1); }

/** Índices de tablero → posición Three.js (plano XZ, Y=0 superficie) */
export function b2w(col, row) {
  return new THREE.Vector3(col - 3.5, 0, row - 3.5);
}

/** Posición Three.js → índices de tablero (clamp a 0-7) */
export function w2b(x, z) {
  return {
    col: Math.max(0, Math.min(7, Math.round(x + 3.5))),
    row: Math.max(0, Math.min(7, Math.round(z + 3.5)))
  };
}

// ── Clase principal ───────────────────────────────────────────────────────────

export class Game {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    /** board[col][row] → Piece | null  (col=0→a, row=0→1ª fila) */
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));

    /** Lista plana de todas las piezas vivas */
    this.pieces = [];

    this.turn = COLOR.W;
    this.moveHistory = [];   // Array de { piece, from, to, captured, notation }
    this.enPassantTarget = null; // {col, row} o null

    /**
     * Hook para futura integración con backend / multijugador.
     * Firma: (piece: Piece, from: string, to: string) => void
     */
    this.onPieceMoved = null;

    this._squareMeshes    = Array.from({ length: 8 }, () => Array(8).fill(null));
    this._highlightMeshes = Array.from({ length: 8 }, () => Array(8).fill(null));

    this._buildBoard3D();
    this._placeInitialPieces();
  }

  // ── Construcción del tablero 3D ──────────────────────────────────────────

  _buildBoard3D() {
    const LIGHT = 0xf0d9b5;
    const DARK  = 0xb58863;

    // Base de madera
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.35, 8.6),
      new THREE.MeshLambertMaterial({ color: 0x4a2c0e })
    );
    base.position.y = -0.275;
    base.receiveShadow = true;
    this.scene.add(base);

    // Borde del tablero
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(8.3, 0.12, 8.3),
      new THREE.MeshLambertMaterial({ color: 0x6b3e1a })
    );
    border.position.y = -0.04;
    border.receiveShadow = true;
    this.scene.add(border);

    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 8; row++) {
        const light = (col + row) % 2 === 0;

        // Casilla
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.1, 1),
          new THREE.MeshLambertMaterial({ color: light ? LIGHT : DARK })
        );
        tile.position.set(col - 3.5, 0, row - 3.5);
        tile.receiveShadow = true;
        tile.userData = { isTile: true, col, row };
        this.scene.add(tile);
        this._squareMeshes[col][row] = tile;

        // Overlay de highlight (verde = movimiento legal, rojo = captura posible)
        const hl = new THREE.Mesh(
          new THREE.BoxGeometry(0.92, 0.13, 0.92),
          new THREE.MeshBasicMaterial({
            color: 0x44ff88,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
          })
        );
        hl.position.set(col - 3.5, 0.015, row - 3.5);
        hl.visible = false;
        this.scene.add(hl);
        this._highlightMeshes[col][row] = hl;
      }
    }
  }

  // ── Posición inicial ─────────────────────────────────────────────────────

  _placeInitialPieces() {
    const back = [TYPE.R, TYPE.N, TYPE.B, TYPE.Q, TYPE.K, TYPE.B, TYPE.N, TYPE.R];

    for (let c = 0; c < 8; c++) {
      this._place(back[c], COLOR.W, c, 0);
      this._place(TYPE.P,  COLOR.W, c, 1);
      this._place(TYPE.P,  COLOR.B, c, 6);
      this._place(back[c], COLOR.B, c, 7);
    }
  }

  _place(type, color, col, row) {
    const piece = new Piece(type, color);
    const wp = b2w(col, row);
    piece.mesh.position.set(wp.x, 0.05, wp.z);
    piece.col = col;
    piece.row = row;
    this.board[col][row] = piece;
    this.pieces.push(piece);
    this.scene.add(piece.mesh);
    return piece;
  }

  // ── Acceso al tablero ────────────────────────────────────────────────────

  getPiece(col, row) {
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return this.board[col][row];
  }

  get squareMeshes()    { return this._squareMeshes; }
  get highlightMeshes() { return this._highlightMeshes; }

  // ── Validación de movimientos ────────────────────────────────────────────

  /** Devuelve true si el camino en línea recta/diagonal está libre (sin contar destino) */
  _pathClear(fc, fr, tc, tr) {
    const dx = Math.sign(tc - fc);
    const dy = Math.sign(tr - fr);
    let c = fc + dx, r = fr + dy;
    while (c !== tc || r !== tr) {
      if (this.board[c][r]) return false;
      c += dx; r += dy;
    }
    return true;
  }

  /**
   * Valida si piece puede moverse legalmente a (toCol, toRow).
   * MVP: no comprueba si deja el propio rey en jaque.
   */
  isLegal(piece, toCol, toRow) {
    if (toCol < 0 || toCol > 7 || toRow < 0 || toRow > 7) return false;

    const target = this.board[toCol][toRow];
    if (target && target.color === piece.color) return false; // captura propia = ilegal

    const fc = piece.col, fr = piece.row;
    const dc = toCol - fc, dr = toRow - fr;
    const adc = Math.abs(dc), adr = Math.abs(dr);

    switch (piece.type) {
      case TYPE.P: {
        const dir   = piece.color === COLOR.W ? 1 : -1;
        const start = piece.color === COLOR.W ? 1 : 6;

        // Avance simple
        if (dc === 0 && dr === dir && !target) return true;
        // Avance doble desde posición inicial
        if (dc === 0 && dr === 2 * dir && fr === start && !target && !this.board[fc][fr + dir]) return true;
        // Captura diagonal
        if (adc === 1 && dr === dir && target && target.color !== piece.color) return true;
        // En passant
        if (adc === 1 && dr === dir && this.enPassantTarget &&
            toCol === this.enPassantTarget.col && toRow === this.enPassantTarget.row) return true;
        return false;
      }

      case TYPE.R:
        return (dc === 0 || dr === 0) && this._pathClear(fc, fr, toCol, toRow);

      case TYPE.N:
        return (adc === 1 && adr === 2) || (adc === 2 && adr === 1);

      case TYPE.B:
        return adc === adr && this._pathClear(fc, fr, toCol, toRow);

      case TYPE.Q:
        return (dc === 0 || dr === 0 || adc === adr) && this._pathClear(fc, fr, toCol, toRow);

      case TYPE.K: {
        if (adc <= 1 && adr <= 1 && (adc + adr > 0)) return true;
        // Enroque (MVP básico): rey no se ha movido, torre no se ha movido, camino libre
        if (!piece.hasMoved && dr === 0 && Math.abs(dc) === 2) {
          const rookCol = dc > 0 ? 7 : 0;
          const rook = this.board[rookCol][fr];
          if (rook && rook.type === TYPE.R && !rook.hasMoved && this._pathClear(fc, fr, rookCol, fr)) {
            return true;
          }
        }
        return false;
      }
    }
    return false;
  }

  // ── Ejecutar movimiento ──────────────────────────────────────────────────

  /**
   * Aplica el movimiento en el estado interno. NO mueve el mesh 3D (eso lo hace Animations).
   * Retorna el objeto move con info completa.
   */
  executeMove(piece, toCol, toRow) {
    const fromCol = piece.col;
    const fromRow = piece.row;
    const from = toAlg(fromCol, fromRow);
    const to   = toAlg(toCol, toRow);

    let captured = this.board[toCol][toRow];

    // En passant: captura el peón lateral
    let epCapture = null;
    if (piece.type === TYPE.P && this.enPassantTarget &&
        toCol === this.enPassantTarget.col && toRow === this.enPassantTarget.row) {
      const epRow = piece.color === COLOR.W ? toRow - 1 : toRow + 1;
      epCapture = this.board[toCol][epRow];
      if (epCapture) {
        this.board[toCol][epRow] = null;
        this.scene.remove(epCapture.mesh);
        this.pieces = this.pieces.filter(p => p !== epCapture);
      }
    }

    // Captura normal
    if (captured) {
      this.board[toCol][toRow] = null;
      this.scene.remove(captured.mesh);
      this.pieces = this.pieces.filter(p => p !== captured);
    }

    // Enroque: mover torre también
    let rookMove = null;
    if (piece.type === TYPE.K && Math.abs(toCol - piece.col) === 2) {
      const rookFromCol = toCol > piece.col ? 7 : 0;
      const rookToCol   = toCol > piece.col ? 5 : 3;
      const rook = this.board[rookFromCol][piece.row];
      if (rook) {
        this.board[rookFromCol][piece.row] = null;
        this.board[rookToCol][piece.row]   = rook;
        rook.col    = rookToCol;
        rook.hasMoved = true;
        const wp = b2w(rookToCol, piece.row);
        rookMove = { rook, target: wp };
      }
    }

    // Mover pieza en el tablero
    this.board[piece.col][piece.row] = null;
    this.board[toCol][toRow] = piece;
    piece.col = toCol;
    piece.row = toRow;
    piece.hasMoved = true;

    // En passant target para siguiente turno
    // Si el peón avanzó 2 casillas desde su fila inicial, habilitar casilla de captura al paso
    this.enPassantTarget = null;
    if (piece.type === TYPE.P && Math.abs(toRow - fromRow) === 2) {
      this.enPassantTarget = {
        col: toCol,
        row: piece.color === COLOR.W ? toRow - 1 : toRow + 1
      };
    }

    // Promoción automática a Dama
    let promoted = false;
    if (piece.type === TYPE.P && (toRow === 7 || toRow === 0)) {
      this.scene.remove(piece.mesh);
      piece.type = TYPE.Q;
      piece.rebuildMesh();
      const wp = b2w(toCol, toRow);
      piece.mesh.position.set(wp.x, 0.05, wp.z);
      this.scene.add(piece.mesh);
      promoted = true;
    }

    const notation = _buildNotation(piece, from, to, !!captured || !!epCapture, promoted);
    const move = { piece, from, to, captured: captured || epCapture, notation, rookMove, promoted };
    this.moveHistory.push(move);

    // Hook para futuro backend/multijugador
    if (this.onPieceMoved) this.onPieceMoved(piece, from, to);

    this.turn = this.turn === COLOR.W ? COLOR.B : COLOR.W;
    return move;
  }

  // ── Highlights ───────────────────────────────────────────────────────────

  clearHighlights() {
    for (let c = 0; c < 8; c++)
      for (let r = 0; r < 8; r++)
        this._highlightMeshes[c][r].visible = false;
  }

  showLegalMoves(piece) {
    this.clearHighlights();
    for (let c = 0; c < 8; c++) {
      for (let r = 0; r < 8; r++) {
        if (this.isLegal(piece, c, r)) {
          const hl = this._highlightMeshes[c][r];
          // Rojo si hay captura, verde si está libre
          hl.material.color.setHex(this.board[c][r] ? 0xff4444 : 0x44ff88);
          hl.material.opacity = 0.5;
          hl.visible = true;
        }
      }
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  reset() {
    for (const p of this.pieces) this.scene.remove(p.mesh);
    this.pieces  = [];
    this.board   = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.turn    = COLOR.W;
    this.moveHistory = [];
    this.enPassantTarget = null;
    this.clearHighlights();
    this._placeInitialPieces();
  }
}

// ── Helper notación ───────────────────────────────────────────────────────────

function _buildNotation(piece, from, to, isCapture, promoted) {
  const p = piece.type === TYPE.P ? '' : piece.type;
  const x = isCapture ? 'x' : '-';
  const promo = promoted ? '=Q' : '';
  // Si es peón con captura, incluir columna origen
  if (piece.type === TYPE.P && isCapture) {
    return `${from[0]}x${to}${promo}`;
  }
  return `${p}${isCapture ? 'x' : ''}${to}${promo}`;
}
