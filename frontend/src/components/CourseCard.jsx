import { Link, useNavigate } from 'react-router-dom';

export default function CourseCard({ course }) {
  const navigate = useNavigate();

  function startPreview() {
    navigate(`/trainer?courseId=${course.id}`);
  }

  return (
    <article className="card">
      <span className="badge">Join {course.players_count?.toLocaleString?.() || course.players_count} players</span>
      <h3>{course.name}</h3>
      <p className="meta">{course.description}</p>
      <p className="meta">
        {course.total_lines} líneas • {course.level} • {course.author}
      </p>
      <div className="actions">
        <button className="btn btn-primary" onClick={startPreview}>
          Try the first line
        </button>
        <Link className="btn btn-secondary" to={`/course/${course.id}`}>
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
