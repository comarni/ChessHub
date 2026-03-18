import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { coursesApi } from '../api';

export default function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);

  useEffect(() => {
    coursesApi.getCourse(id).then(setCourse);
  }, [id]);

  if (!course) {
    return <p className="container">Cargando detalle...</p>;
  }

  return (
    <section className="container detail">
      <article className="panel">
        <h1>{course.name}</h1>
        <p>{course.description}</p>
        <p>
          Autor: <strong>{course.author}</strong>
        </p>
        <p>
          Nivel: <strong>{course.level}</strong>
        </p>
        <p>
          Total de líneas: <strong>{course.total_lines}</strong>
        </p>
        <p>
          Líneas free: <strong>{course.free_lines}</strong>
        </p>
        <div className="actions">
          <Link className="btn btn-primary" to={`/trainer?courseId=${course.id}`}>
            Entrenar ahora
          </Link>
        </div>
      </article>

      <aside className="panel">
        <h3>Social proof</h3>
        <div className="stats-list">
          <div className="stat">
            <strong>{course.players_count.toLocaleString()}</strong>
            <div>Jugadores</div>
          </div>
          <div className="stat">
            <strong>{course.community_score}%</strong>
            <div>Comunidad</div>
          </div>
          <div className="stat">
            <strong>{new Date(course.created_at).toLocaleDateString()}</strong>
            <div>Fecha de creación</div>
          </div>
          <div className="stat">
            <strong>{course.opening_key}</strong>
            <div>Apertura</div>
          </div>
        </div>
      </aside>
    </section>
  );
}
