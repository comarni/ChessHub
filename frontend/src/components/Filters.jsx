export default function Filters({ filters, setFilters }) {
  function onChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="filters">
      <input
        className="input"
        placeholder="Buscar curso u apertura..."
        value={filters.search}
        onChange={(e) => onChange('search', e.target.value)}
      />
      <select
        className="select"
        value={filters.opening}
        onChange={(e) => onChange('opening', e.target.value)}
      >
        <option value="">Todas las aperturas</option>
        <option value="sicilian">Siciliana</option>
        <option value="london">London</option>
        <option value="caro-kann">Caro-Kann</option>
      </select>
      <select
        className="select"
        value={filters.level}
        onChange={(e) => onChange('level', e.target.value)}
      >
        <option value="">Todos los niveles</option>
        <option value="principiante">Principiante</option>
        <option value="intermedio">Intermedio</option>
        <option value="avanzado">Avanzado</option>
      </select>
      <input
        className="input"
        placeholder="Autor"
        value={filters.author}
        onChange={(e) => onChange('author', e.target.value)}
      />
    </div>
  );
}
