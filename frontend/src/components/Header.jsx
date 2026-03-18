import { Link, useNavigate } from 'react-router-dom';

export default function Header({ user, setUser }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('chesshub_token');
    localStorage.removeItem('chesshub_user');
    setUser(null);
    navigate('/');
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link to="/" className="brand">
          ChessHub
        </Link>
        <nav className="nav-links">
          <Link to="/">Catálogo</Link>
          <Link to="/trainer">Entrenamiento</Link>
          {user ? (
            <>
              <Link to="/dashboard">Progreso</Link>
              <span>{user.username}</span>
              <button className="btn btn-secondary" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
