import { useEffect, useState } from 'react';
import { progressApi, subscriptionApi } from '../api';

export default function DashboardPage({ user }) {
  const [activeCourses, setActiveCourses] = useState([]);
  const [dueLines, setDueLines] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    progressApi.activeCourses().then(setActiveCourses).catch(() => setActiveCourses([]));
    progressApi.dueLines().then(setDueLines).catch(() => setDueLines([]));
    progressApi.recommendations().then(setRecommendations).catch(() => setRecommendations([]));
  }, []);

  async function upgrade() {
    try {
      const response = await subscriptionApi.upgrade();
      const nextUser = {
        ...user,
        account_type: response.user.account_type
      };
      localStorage.setItem('chesshub_user', JSON.stringify(nextUser));
      setMessage('Plan premium activado. Recarga la página para ver todos los accesos.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="container" style={{ paddingTop: 20, paddingBottom: 24 }}>
      <h1>Tu progreso</h1>
      <p>
        Plan actual: <strong>{user.account_type}</strong>
      </p>
      {user.account_type === 'free' && (
        <button className="btn btn-primary" onClick={upgrade}>
          Upgrade a premium
        </button>
      )}
      {message && <p className="success">{message}</p>}

      <div className="detail" style={{ marginTop: 16 }}>
        <article className="panel">
          <h3>Cursos activos</h3>
          {activeCourses.length === 0 ? (
            <p>Aún no hay actividad registrada.</p>
          ) : (
            activeCourses.map((course) => (
              <div className="kpi" key={course.id}>
                <strong>{course.name}</strong>
                <div>{course.practiced_lines} líneas practicadas</div>
              </div>
            ))
          )}
        </article>

        <article className="panel">
          <h3>Revisiones pendientes</h3>
          {dueLines.length === 0 ? (
            <p>No tienes líneas pendientes por ahora.</p>
          ) : (
            dueLines.map((line) => (
              <div className="kpi" key={line.line_id}>
                <strong>{line.line_name}</strong>
                <div>{line.course_name}</div>
              </div>
            ))
          )}
        </article>
      </div>

      <article className="panel" style={{ marginTop: 16 }}>
        <h3>Recomendaciones para ti</h3>
        {recommendations.length === 0 ? (
          <p>Practica más líneas para personalizar recomendaciones.</p>
        ) : (
          recommendations.map((course) => (
            <div className="kpi" key={course.id}>
              <strong>{course.name}</strong>
              <div>{course.description}</div>
            </div>
          ))
        )}
      </article>
    </section>
  );
}
