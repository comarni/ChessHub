DELETE FROM user_progress;
DELETE FROM lines;
DELETE FROM courses;

INSERT INTO courses (id, name, description, opening_key, level, author, players_count, community_score, created_at)
VALUES
  (1, 'Master the Sicilian in 7 Days', 'Aprende las ideas troncales de la Siciliana Najdorf con drills prácticos y patrones de táctica.', 'sicilian', 'intermedio', 'Coach Valeria', 10842, 92, '2025-08-02 10:00:00'),
  (2, 'London System Starter Pack', 'Construye un repertorio sólido y fácil de recordar para partidas rápidas y clásicas.', 'london', 'principiante', 'GM Ortega', 15670, 95, '2025-06-12 10:00:00'),
  (3, 'Caro-Kann: Keep It Solid', 'Neutraliza 1.e4 con planes robustos y contrajuego posicional preciso.', 'caro-kann', 'intermedio', 'IM Lucas Ferrer', 8740, 89, '2025-09-01 10:00:00');

INSERT INTO lines (course_id, name, moves, side_to_train, order_index, is_free_preview)
VALUES
  (1, 'Najdorf Main Line #1', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'white', 1, 1),
  (1, 'Najdorf Main Line #2', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5', 'white', 2, 0),
  (1, 'English Attack Pattern', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e6 f3', 'white', 3, 0),

  (2, 'London Core Setup', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3', 'white', 1, 1),
  (2, 'London vs ...Bf5', 'd4 d5 Nf3 Nf6 Bf4 Bf5 e3 e6 c4', 'white', 2, 0),
  (2, 'Jobava-London Idea', 'd4 Nf6 Nc3 d5 Bf4 e6 e3', 'white', 3, 0),

  (3, 'Classical Caro-Kann', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', 'black', 1, 1),
  (3, 'Advance Variation', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6', 'black', 2, 0),
  (3, 'Panov Structure', 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3', 'black', 3, 0);
