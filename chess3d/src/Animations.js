/**
 * Animations.js — Motor de animaciones de piezas
 * Usa un sistema de tweens propio (sin dependencias externas).
 * Cada tween tiene duración en segundos y una función easing configurable.
 *
 * API pública:
 *   animations.movePiece(mesh, targetPos, duration, bounce, onComplete)
 *   animations.update()   ← llamar en el loop de render
 */

export class Animations {
  constructor() {
    /** @type {Array<{mesh, update:(dt:number)=>boolean}>} */
    this._tweens   = [];
    this._lastTime = performance.now();
  }

  // ── Animación de pieza ──────────────────────────────────────────────────

  /**
   * Mueve el mesh de su posición actual a targetPos con un arco suave en Y.
   *
   * @param {THREE.Object3D} mesh
   * @param {THREE.Vector3}  targetPos   — destino (Y será 0.05)
   * @param {number}         duration    — segundos
   * @param {boolean}        bounce      — si true, rebota de vuelta al origen
   * @param {Function}       [onComplete]
   */
  /**
   * @param {boolean} fromDrag — true cuando la pieza viene de un arrastre manual:
   *   usa caída suave (sin arco) desde la altura actual de drag hasta BOARD_Y.
   *   false → deslizamiento con arco parabólico entre casillas (aperturas, etc.)
   */
  movePiece(mesh, targetPos, duration = 0.32, bounce = false, fromDrag = false, onComplete = null) {
    this._tweens = this._tweens.filter(t => t.mesh !== mesh);

    const BOARD_Y = 0.05;
    const sx = mesh.position.x;
    const sy = mesh.position.y;
    const sz = mesh.position.z;
    const ex = targetPos.x;
    const ey = BOARD_Y;
    const ez = targetPos.z;

    let elapsed = 0;

    if (fromDrag) {
      // Caída suave: interpola XYZ linealmente (no arco), la pieza "aterriza"
      this._tweens.push({
        mesh,
        update: (dt) => {
          elapsed += dt;
          const t = _easeOut(Math.min(elapsed / duration, 1));
          mesh.position.x = sx + (ex - sx) * t;
          mesh.position.y = sy + (ey - sy) * t;
          mesh.position.z = sz + (ez - sz) * t;
          if (elapsed >= duration) {
            mesh.position.set(ex, ey, ez);
            if (onComplete) onComplete();
            return true;
          }
          return false;
        }
      });
    } else {
      // Deslizamiento con arco parabólico (movimientos programáticos / enroque)
      const peakH = bounce ? 0.55 : 0.60;
      this._tweens.push({
        mesh,
        update: (dt) => {
          elapsed += dt;
          const raw = Math.min(elapsed / duration, 1);
          const t   = _easeInOut(raw);
          mesh.position.x = sx + (ex - sx) * t;
          mesh.position.z = sz + (ez - sz) * t;
          mesh.position.y = ey + Math.sin(raw * Math.PI) * peakH;
          if (raw >= 1) {
            mesh.position.set(ex, ey, ez);
            if (onComplete) onComplete();
            return true;
          }
          return false;
        }
      });
    }
  }

  /**
   * Animación de "sacudida" para movimiento ilegal.
   * La pieza oscila en X y vuelve a su posición original.
   */
  shake(mesh, onComplete = null) {
    this._tweens = this._tweens.filter(t => t.mesh !== mesh);

    const ox = mesh.position.x;
    const oy = mesh.position.y;
    const oz = mesh.position.z;
    let elapsed = 0;
    const duration = 0.4;

    this._tweens.push({
      mesh,
      update: (dt) => {
        elapsed += dt;
        const raw = Math.min(elapsed / duration, 1);
        const decay = 1 - raw;
        // Oscilación amortiguada
        mesh.position.x = ox + Math.sin(raw * Math.PI * 6) * 0.18 * decay;
        mesh.position.y = oy + Math.sin(raw * Math.PI) * 0.3 * decay;
        mesh.position.z = oz;

        if (raw >= 1) {
          mesh.position.set(ox, oy, oz);
          if (onComplete) onComplete();
          return true;
        }
        return false;
      }
    });
  }

  /**
   * Animación de captura: la pieza capturada sube y desaparece.
   */
  captureExit(mesh, onComplete = null) {
    let elapsed = 0;
    const duration = 0.25;
    const sy = mesh.position.y;

    this._tweens.push({
      mesh,
      update: (dt) => {
        elapsed += dt;
        const raw = Math.min(elapsed / duration, 1);
        mesh.position.y = sy + raw * 1.5;
        mesh.scale.setScalar(1 - raw * 0.8);
        if (raw >= 1) {
          if (onComplete) onComplete();
          return true;
        }
        return false;
      }
    });
  }

  // ── Loop ─────────────────────────────────────────────────────────────────

  /** Llamar en requestAnimationFrame antes de renderer.render() */
  update() {
    const now = performance.now();
    const dt  = Math.min((now - this._lastTime) / 1000, 0.1); // cap a 100ms
    this._lastTime = now;

    this._tweens = this._tweens.filter(tween => !tween.update(dt));
  }

  /** true si hay alguna animación en curso */
  get busy() { return this._tweens.length > 0; }
}

// ── Easing ───────────────────────────────────────────────────────────────────

function _easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function _easeOut(t)   { return 1 - (1 - t) * (1 - t); }
