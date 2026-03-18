import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function LoginPage({ authContext }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const data =
        mode === 'register'
          ? await authApi.register({ username, email, password })
          : await authApi.login({ email, password });

      localStorage.setItem('chesshub_token', data.token);
      localStorage.setItem('chesshub_user', JSON.stringify(data.user));
      authContext.setUser(data.user);
      navigate('/dashboard');
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  return (
    <section className="auth-box">
      <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
      <p>{mode === 'login' ? 'Join 10k players y sigue tu progreso.' : 'Try for free y desbloquea líneas premium cuando quieras.'}</p>
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <input
            className="input"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="warning">{error}</p>}
        <button className="btn btn-primary" type="submit">
          {mode === 'login' ? 'Entrar' : 'Registrarme'}
        </button>
      </form>
      <button
        className="btn btn-secondary"
        style={{ marginTop: 10 }}
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
      </button>
    </section>
  );
}
