/**
 * Constants.js — Constantes compartidas sin dependencias circulares.
 * Importar desde aquí en lugar de Game.js cuando se necesiten TYPE o COLOR
 * en módulos que también son importados por Game.js (ej. Piece.js).
 */

export const COLOR = { W: 'w', B: 'b' };

export const TYPE = {
  P: 'P',   // Peón
  R: 'R',   // Torre (Rook)
  N: 'N',   // Caballo (Knight)
  B: 'B',   // Alfil (Bishop)
  Q: 'Q',   // Dama (Queen)
  K: 'K',   // Rey (King)
};
