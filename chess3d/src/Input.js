/**
 * Input.js — Gestión de interacción ratón y touch
 * Maneja selección, arrastre y suelta de piezas sobre el tablero 3D.
 * Deshabilita OrbitControls mientras se arrastra para evitar conflictos.
 *
 * Hook público:
 *   input.onMoveCompleted = (move) => {}   ← llamado tras cada movimiento
 */

import * as THREE from 'three';
import { b2w, w2b, COLOR } from './Game.js';
import { Animations } from './Animations.js';

export class InputHandler {
  /** Altura (Y) a la que vuela la pieza durante el arrastre */
  static HOVER_Y = 0.55;
  /**
   * @param {import('./Game.js').Game}    game
   * @param {THREE.Scene}                scene
   * @param {THREE.Camera}               camera
   * @param {THREE.WebGLRenderer}        renderer
   * @param {import('three/addons/controls/OrbitControls.js').OrbitControls} controls
   */
  constructor(game, scene, camera, renderer, controls) {
    this.game      = game;
    this.scene     = scene;
    this.camera    = camera;
    this.renderer  = renderer;
    this.controls  = controls;

    this.animations = new Animations();

    // Estado de arrastre
    this._dragging      = false;
    this._selectedPiece = null;
    this._originPos     = new THREE.Vector3();  // posición 3D original de la pieza

    // Plano horizontal para cálculo de posición durante arrastre
    this._dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
    this._hitPoint  = new THREE.Vector3();

    this._raycaster = new THREE.Raycaster();
    this._mouse     = new THREE.Vector2();

    /** Callback tras movimiento exitoso: (move) => void */
    this.onMoveCompleted = null;

    this._bindEvents();
  }

  // ── Eventos ───────────────────────────────────────────────────────────────

  _bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('mousedown',  e => this._onDown(e));
    el.addEventListener('mousemove',  e => this._onMove(e));
    el.addEventListener('mouseup',    e => this._onUp(e));
    el.addEventListener('touchstart', e => this._onDown(_touchToMouse(e)), { passive: false });
    el.addEventListener('touchmove',  e => this._onMove(_touchToMouse(e)), { passive: false });
    el.addEventListener('touchend',   e => this._onUp(_touchToMouse(e)));
  }

  _ndc(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width)  * 2 - 1,
      -((event.clientY - rect.top)  / rect.height) * 2 + 1
    );
  }

  // ── Raycasting ────────────────────────────────────────────────────────────

  /** Devuelve la Piece bajo el cursor, o null */
  _hitPiece(ndc) {
    this._raycaster.setFromCamera(ndc, this.camera);
    const meshes = [];
    this.game.pieces.forEach(p => p.mesh.traverse(c => { if (c.isMesh) meshes.push(c); }));
    const hits = this._raycaster.intersectObjects(meshes);
    if (!hits.length) return null;
    // Subir hasta el grupo raíz con userData.piece
    let obj = hits[0].object;
    while (obj && !obj.userData.piece) obj = obj.parent;
    return obj ? obj.userData.piece : null;
  }

  /** Intersección con el plano del tablero → {col, row} */
  _hitBoard(ndc) {
    this._raycaster.setFromCamera(ndc, this.camera);
    const ok = this._raycaster.ray.intersectPlane(this._dragPlane, this._hitPoint);
    if (!ok) return null;
    return w2b(this._hitPoint.x, this._hitPoint.z);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  _onDown(e) {
    if (e.button !== undefined && e.button !== 0) return; // solo click izquierdo

    const ndc = this._ndc(e);
    const piece = this._hitPiece(ndc);

    if (!piece || piece.color !== this.game.turn) return;

    this._selectedPiece = piece;
    this._dragging      = true;
    this._originPos.copy(piece.mesh.position);

    this.controls.enabled = false;
    piece.select();
    this.game.showLegalMoves(piece);

    document.body.style.cursor = 'grabbing';

    // Posicionar pieza INMEDIATAMENTE bajo el cursor a altura de hover
    // (evita que la pieza "se quede colgada" en su posición original)
    this._raycaster.setFromCamera(ndc, this.camera);
    this._raycaster.ray.intersectPlane(this._dragPlane, this._hitPoint);
    piece.mesh.position.set(this._hitPoint.x, InputHandler.HOVER_Y, this._hitPoint.z);

    // Cancelar cualquier animación pendiente sobre esta pieza
    this.animations._tweens = this.animations._tweens.filter(t => t.mesh !== piece.mesh);

    if (e.preventDefault) e.preventDefault();
  }

  _onMove(e) {
    const ndc = this._ndc(e);

    if (this._dragging && this._selectedPiece) {
      this._raycaster.setFromCamera(ndc, this.camera);
      this._raycaster.ray.intersectPlane(this._dragPlane, this._hitPoint);
      this._selectedPiece.mesh.position.set(
        this._hitPoint.x,
        InputHandler.HOVER_Y,
        this._hitPoint.z
      );

      if (e.preventDefault) e.preventDefault();
    } else {
      // Cursor hover
      const piece = this._hitPiece(ndc);
      document.body.style.cursor =
        (piece && piece.color === this.game.turn) ? 'grab' : 'default';
    }
  }

  _onUp(e) {
    if (!this._dragging || !this._selectedPiece) return;

    const ndc   = this._ndc(e);
    const piece = this._selectedPiece;

    piece.deselect();
    this.game.clearHighlights();
    this._dragging      = false;
    this._selectedPiece = null;
    this.controls.enabled = true;
    document.body.style.cursor = 'default';

    // Determinar casilla destino
    const target = this._hitBoard(ndc);
    const originWorld = b2w(piece.col, piece.row);

    if (target && this.game.isLegal(piece, target.col, target.row)) {
      // ── Movimiento legal ──────────────────────────────────────────────────
      const targetWorld = b2w(target.col, target.row);
      const move = this.game.executeMove(piece, target.col, target.row);

      // fromDrag=true → caída suave sin arco desde la altura de arrastre
      this.animations.movePiece(piece.mesh, targetWorld, 0.28, false, true, () => {
        if (this.onMoveCompleted) this.onMoveCompleted(move);
      });

      if (move.rookMove) {
        // La torre no viene de drag → deslizamiento con arco
        this.animations.movePiece(move.rookMove.rook.mesh, move.rookMove.target, 0.32, false, false);
      }

      this._playSound(move.captured ? 'capture' : 'move');
      this._showStatus(`${piece.color === COLOR.W ? '♔ Blancas' : '♚ Negras'}: ${move.notation}`);
    } else {
      // ── Movimiento ilegal → volver al origen con sacudida ─────────────────
      // Animar caída de vuelta a posición original
      this.animations.movePiece(piece.mesh, this._originPos, 0.28, false, true);
      this._showStatus('⚠ Movimiento ilegal');
    }
  }

  // ── API pública para Openings ─────────────────────────────────────────────

  /**
   * Aplica un movimiento programático (desde apertura).
   * @returns {boolean} true si tuvo éxito
   */
  applyProgrammaticMove(piece, toCol, toRow) {
    if (!this.game.isLegal(piece, toCol, toRow)) return false;

    const move = this.game.executeMove(piece, toCol, toRow);
    const targetWorld = b2w(toCol, toRow);

    this.animations.movePiece(piece.mesh, targetWorld, 0.40, false, false, () => {
      if (this.onMoveCompleted) this.onMoveCompleted(move);
    });

    if (move.rookMove) {
      this.animations.movePiece(move.rookMove.rook.mesh, move.rookMove.target, 0.40, false, false);
    }

    this._playSound(move.captured ? 'capture' : 'move');
    this._showStatus(`${piece.color === COLOR.W ? '♔ Blancas' : '♚ Negras'}: ${move.notation}`);
    return true;
  }

  // ── Loop ─────────────────────────────────────────────────────────────────

  update() {
    this.animations.update();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _showStatus(msg) {
    const el = document.getElementById('status-msg');
    if (el) el.textContent = msg;
  }

  /** Sonidos procedurales con Web Audio API (sin archivos externos) */
  _playSound(type) {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'move') {
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      }
    } catch (_) { /* AudioContext no disponible */ }
  }
}

// ── Utilidad touch ────────────────────────────────────────────────────────────

function _touchToMouse(e) {
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
  return { button: 0, clientX: t ? t.clientX : 0, clientY: t ? t.clientY : 0, preventDefault: () => e.preventDefault() };
}
