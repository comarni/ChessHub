import { useEffect, useState } from 'react';
import { coursesApi } from '../api';
import Filters from '../components/Filters';
import CourseCard from '../components/CourseCard';

export default function CatalogPage() {
  const [filters, setFilters] = useState({
    search: '',
    opening: '',
    level: '',
    author: ''
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    coursesApi
      .getCourses(filters)
      .then((data) => {
        if (mounted) setCourses(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filters]);

  return (
    <section className="container">
      <div className="hero">
        <h1>Master openings with guided drills</h1>
        <p>Try for free. Build consistency with spaced repetition and unlock premium lines.</p>
      </div>

      <Filters filters={filters} setFilters={setFilters} />

      {loading ? (
        <p>Cargando catálogo...</p>
      ) : (
        <div className="card-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}
