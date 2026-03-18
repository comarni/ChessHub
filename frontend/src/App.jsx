import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import CatalogPage from './pages/CatalogPage';
import CourseDetailPage from './pages/CourseDetailPage';
import TrainerPage from './pages/TrainerPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function getStoredUser() {
  const raw = localStorage.getItem('chesshub_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());

  const authContext = useMemo(
    () => ({
      user,
      setUser
    }),
    [user]
  );

  return (
    <div className="app-shell">
      <Header user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/course/:id" element={<CourseDetailPage />} />
        <Route path="/trainer" element={<TrainerPage user={user} />} />
        <Route path="/login" element={<LoginPage authContext={authContext} />} />
        <Route
          path="/dashboard"
          element={user ? <DashboardPage user={user} /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </div>
  );
}
