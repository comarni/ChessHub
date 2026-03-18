import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { coursesApi, progressApi } from '../api';

function isUsersTurn(line, moveIndex) {
  if (!line) return false;
  const userPlaysWhite = line.side_to_train === 'white';
  return userPlaysWhite ? moveIndex % 2 === 0 : moveIndex % 2 === 1;
}

export default function TrainerPage({ user }) {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [lines, setLines] = useState([]);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState(new Chess().fen());
  const [status, setStatus] = useState('Cargando líneas...');
  const [mistakes, setMistakes] = useState(0);

  const currentLine = lines[lineIndex] || null;
  const moves = useMemo(() => (currentLine ? currentLine.moves.split(' ') : []), [currentLine]);

  useEffect(() => {
    coursesApi.getCourses({}).then((data) => {
      setCourses(data);
      if (!selectedCourseId && data.length > 0) {
        setSelectedCourseId(String(data[0].id));
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;

    setStatus('Cargando entrenamiento...');
    coursesApi
      .getLines(selectedCourseId)
      .then((data) => {
        setLines(data.lines);
        setHasFullAccess(data.hasFullAccess);
        setLineIndex(0);
        setMoveIndex(0);
        setMistakes(0);
        setFen(new Chess().fen());
        setStatus('Repite la línea moviendo las piezas correctas.');
      })
      .catch((error) => setStatus(error.message));
  }, [selectedCourseId]);

  useEffect(() => {
    if (!currentLine) return;
    if (moveIndex >= moves.length) return;

    if (!isUsersTurn(currentLine, moveIndex)) {
      const timer = setTimeout(() => {
        const chess = new Chess(fen);
        chess.move(moves[moveIndex], { sloppy: true });
        setFen(chess.fen());
        setMoveIndex((prev) => prev + 1);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [fen, moveIndex, moves, currentLine]);

  useEffect(() => {
    if (!currentLine) return;
    if (moveIndex < moves.length) return;

    const quality = mistakes === 0 ? 5 : mistakes <= 2 ? 4 : 3;

    setStatus(`¡Línea completada! Calidad ${quality}/5. Pasando a la siguiente...`);

    if (user) {
      progressApi.review({ lineId: currentLine.id, quality }).catch(() => {
        setStatus('Línea completada, pero no se pudo guardar el progreso.');
      });
    }

    const timer = setTimeout(() => {
      const nextIndex = (lineIndex + 1) % lines.length;
      setLineIndex(nextIndex);
      setMoveIndex(0);
      setMistakes(0);
      setFen(new Chess().fen());
      setStatus('Nueva línea cargada.');
    }, 1200);

    return () => clearTimeout(timer);
  }, [moveIndex, moves.length, currentLine, lineIndex, lines.length, user, mistakes]);

  function onDrop(sourceSquare, targetSquare, piece) {
    if (!currentLine) return false;
    if (!isUsersTurn(currentLine, moveIndex)) return false;
    if (moveIndex >= moves.length) return false;

    const expectedSan = moves[moveIndex];

    const expectedChess = new Chess(fen);
    const expectedMove = expectedChess.move(expectedSan, { sloppy: true });

    if (!expectedMove) {
      setStatus('Error de parseo en la línea de movimientos.');
      return false;
    }

    const liveChess = new Chess(fen);
    const promotion = piece.toLowerCase().includes('p') && (targetSquare.endsWith('1') || targetSquare.endsWith('8')) ? 'q' : undefined;
    const playedMove = liveChess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion
    });

    if (!playedMove) {
      return false;
    }

    const sameMove =
      playedMove.from === expectedMove.from &&
      playedMove.to === expectedMove.to &&
      (playedMove.promotion || '') === (expectedMove.promotion || '');

    if (!sameMove) {
      setMistakes((prev) => prev + 1);
      setStatus(`Movimiento incorrecto. Se esperaba ${expectedSan}. Intenta otra vez.`);
      return false;
    }

    setFen(liveChess.fen());
    setMoveIndex((prev) => prev + 1);
    setStatus('Buen movimiento.');
    return true;
  }

  return (
    <section className="container trainer" style={{ paddingBottom: 24 }}>
      <article className="panel">
        <h2>Drill Trainer</h2>
        <p>{status}</p>

        <label>Curso</label>
        <select
          className="select"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        <div style={{ maxWidth: 520, marginTop: 14 }}>
          <Chessboard position={fen} onPieceDrop={onDrop} boardWidth={520} />
        </div>
      </article>

      <aside className="panel info-list">
        <h3>Sesión actual</h3>
        {!hasFullAccess && (
          <p className="warning">Plan free activo: solo ves líneas de preview. Haz upgrade para contenido completo.</p>
        )}
        <div className="kpi">
          <strong>Línea</strong>
          <div>{currentLine ? currentLine.name : 'Sin línea cargada'}</div>
        </div>
        <div className="kpi">
          <strong>Moves</strong>
          <div>{currentLine ? currentLine.moves : '-'}</div>
        </div>
        <div className="kpi">
          <strong>Turno entrenado</strong>
          <div>{currentLine ? currentLine.side_to_train : '-'}</div>
        </div>
        <div className="kpi">
          <strong>Errores</strong>
          <div>{mistakes}</div>
        </div>
      </aside>
    </section>
  );
}
