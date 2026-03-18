/**
 * Piece.js — Clase pieza de ajedrez con geometría 3D
 * Cada pieza se construye con primitivas Three.js (cilindros, esferas, cajas).
 * Expone select()/deselect() para cambio de material y rebuildMesh() para promoción.
 */

import * as THREE from 'three';
import { TYPE, COLOR } from './Constants.js';

// ── Materiales compartidos ────────────────────────────────────────────────────

const MAT = {
  w:          new THREE.MeshLambertMaterial({ color: 0xf5f0e8 }),
  b:          new THREE.MeshLambertMaterial({ color: 0x28160c }),
  w_selected: new THREE.MeshLambertMaterial({ color: 0xffe866 }),
  b_selected: new THREE.MeshLambertMaterial({ color: 0xcc8800 }),
};

// ── Helpers de geometría ──────────────────────────────────────────────────────

const cyl  = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph  = (r,  s = 10)        => new THREE.SphereGeometry(r, s, s);
const box  = (w, h, d)           => new THREE.BoxGeometry(w, h, d);
const cone = (r, h, s = 10)      => new THREE.ConeGeometry(r, h, s);

/** Crea un Mesh con sombras activadas, posicionado en Y */
function m(geo, y) {
  const mesh = new THREE.Mesh(geo, MAT.w.clone()); // material placeholder
  mesh.castShadow    = true;
  mesh.receiveShadow = false;
  mesh.position.y = y;
  return mesh;
}

// ── Constructores de geometría por tipo ───────────────────────────────────────

function buildPawn() {
  const g = new THREE.Group();
  g.add(m(cyl(0.37, 0.42, 0.12), 0.06));   // base
  g.add(m(cyl(0.17, 0.28, 0.38), 0.31));   // cuerpo
  g.add(m(sph(0.22),             0.62));   // cabeza
  return g;
}

function buildRook() {
  const g = new THREE.Group();
  g.add(m(cyl(0.38, 0.43, 0.12), 0.06));   // base
  g.add(m(cyl(0.27, 0.32, 0.55), 0.40));   // cuerpo
  g.add(m(cyl(0.34, 0.29, 0.10), 0.73));   // cuello
  // Almenas (3 cajas)
  for (let i = -1; i <= 1; i++) {
    const b = new THREE.Mesh(box(0.11, 0.16, 0.38), MAT.w.clone());
    b.castShadow = true;
    b.position.set(i * 0.15, 0.87, 0);
    g.add(b);
  }
  return g;
}

function buildKnight() {
  const g = new THREE.Group();
  g.add(m(cyl(0.38, 0.43, 0.12), 0.06));   // base
  g.add(m(cyl(0.21, 0.32, 0.44), 0.34));   // cuerpo

  // Cabeza (caja inclinada)
  const head = new THREE.Mesh(box(0.30, 0.48, 0.22), MAT.w.clone());
  head.castShadow = true;
  head.position.set(0.07, 0.82, 0);
  head.rotation.z = -0.22;
  g.add(head);

  // Hocico
  const snout = new THREE.Mesh(box(0.26, 0.16, 0.20), MAT.w.clone());
  snout.castShadow = true;
  snout.position.set(0.21, 0.64, 0);
  g.add(snout);

  // Orejas
  const ear = new THREE.Mesh(box(0.07, 0.12, 0.08), MAT.w.clone());
  ear.castShadow = true;
  ear.position.set(0.02, 1.09, 0.05);
  g.add(ear);
  const ear2 = ear.clone();
  ear2.position.z = -0.05;
  g.add(ear2);

  return g;
}

function buildBishop() {
  const g = new THREE.Group();
  g.add(m(cyl(0.38, 0.43, 0.12), 0.06));   // base
  g.add(m(cyl(0.14, 0.30, 0.58), 0.41));   // cuerpo
  g.add(m(sph(0.17),             0.76));   // cabeza
  g.add(m(cone(0.07, 0.24),      0.96));   // punta
  return g;
}

function buildQueen() {
  const g = new THREE.Group();
  g.add(m(cyl(0.40, 0.45, 0.12), 0.06));   // base
  g.add(m(cyl(0.21, 0.36, 0.64), 0.44));   // cuerpo
  g.add(m(sph(0.25, 12),         0.82));   // cabeza grande

  // Corona: 5 puntas circulares
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const pt = new THREE.Mesh(cyl(0.045, 0.045, 0.20), MAT.w.clone());
    pt.castShadow = true;
    pt.position.set(Math.cos(a) * 0.19, 1.06, Math.sin(a) * 0.19);
    g.add(pt);
  }
  return g;
}

function buildKing() {
  const g = new THREE.Group();
  g.add(m(cyl(0.40, 0.45, 0.12), 0.06));   // base
  g.add(m(cyl(0.23, 0.36, 0.68), 0.46));   // cuerpo
  g.add(m(cyl(0.32, 0.28, 0.10), 0.86));   // cuello ancho

  // Cruz vertical
  g.add(m(cyl(0.065, 0.065, 0.40), 1.07));

  // Cruz horizontal
  const cross = new THREE.Mesh(cyl(0.065, 0.065, 0.28), MAT.w.clone());
  cross.castShadow = true;
  cross.rotation.z = Math.PI / 2;
  cross.position.set(0, 1.12, 0);
  g.add(cross);

  return g;
}

const BUILDERS = {
  [TYPE.P]: buildPawn,
  [TYPE.R]: buildRook,
  [TYPE.N]: buildKnight,
  [TYPE.B]: buildBishop,
  [TYPE.Q]: buildQueen,
  [TYPE.K]: buildKing,
};

// ── Clase Piece ───────────────────────────────────────────────────────────────

export class Piece {
  /**
   * @param {string} type   — TYPE.P / TYPE.R / ...
   * @param {string} color  — COLOR.W / COLOR.B
   */
  constructor(type, color) {
    this.type  = type;
    this.color = color;
    this.col   = 0;
    this.row   = 0;
    this.hasMoved = false;

    this.mesh = this._buildMesh();
    this.mesh.userData.piece = this;
  }

  _buildMesh() {
    const group = BUILDERS[this.type]();
    group.userData.piece = this;
    this._applyMat(group, false);
    return group;
  }

  _applyMat(group, selected) {
    const key = this.color + (selected ? '_selected' : '');
    const mat = MAT[key];
    group.traverse(child => {
      if (child.isMesh) child.material = mat;
    });
  }

  /** Resalta la pieza seleccionada */
  select()   { this._applyMat(this.mesh, true); }

  /** Restaura el color original */
  deselect() { this._applyMat(this.mesh, false); }

  /**
   * Reconstruye la geometría del mesh (usado en promoción de peón).
   * Mantiene la posición actual del grupo.
   */
  rebuildMesh() {
    const pos = this.mesh.position.clone();
    const rot = this.mesh.rotation.clone();
    // Vaciar hijos actuales
    while (this.mesh.children.length) this.mesh.remove(this.mesh.children[0]);
    // Añadir nueva geometría al grupo existente
    const fresh = BUILDERS[this.type]();
    fresh.children.forEach(c => this.mesh.add(c));
    this._applyMat(this.mesh, false);
    this.mesh.position.copy(pos);
    this.mesh.rotation.copy(rot);
  }
}
