// Los 12 logros de la app. Cada uno tiene su valor requerido.
const ACHIEVEMENTS = [
  { key: 'first_task', title: 'Primera Tarea', description: 'Completa tu primera tarea', icon: '✓', required_value: 1 },
  { key: 'streak_3', title: 'Racha de 3', description: '3 días consecutivos activo', icon: '🔥', required_value: 3 },
  { key: 'streak_7', title: 'Racha de 7', description: '7 días consecutivos activo', icon: '🌟', required_value: 7 },
  { key: 'streak_30', title: 'Racha de 30', description: '30 días consecutivos activo', icon: '👑', required_value: 30 },
  { key: 'mindful_1', title: 'Primera Sesión', description: 'Primera sesión de atención plena', icon: '🧘', required_value: 1 },
  { key: 'mindful_10', title: 'Mente Plena', description: '10 sesiones de atención plena', icon: '🧠', required_value: 10 },
  { key: 'focus_1', title: 'Enfocado', description: 'Primera sesión de enfoque', icon: '🎯', required_value: 1 },
  { key: 'focus_10', title: 'Maestro del Enfoque', description: '10 sesiones de enfoque', icon: '🏆', required_value: 10 },
  { key: 'journal_1', title: 'Primeras Palabras', description: 'Escribe tu primera entrada', icon: '📝', required_value: 1 },
  { key: 'journal_7', title: 'Escritor', description: '7 entradas en el diario', icon: '📖', required_value: 7 },
  { key: 'photo_verify', title: 'Verificador', description: 'Verifica una tarea con foto', icon: '📸', required_value: 1 },
  { key: 'tasks_50', title: 'Super Productivo', description: 'Completa 50 tareas', icon: '🚀', required_value: 50 },
];

const STREAK_KEYS = ['streak_3', 'streak_7', 'streak_30'];

// Puntos por acción (los mismos de la app)
const POINTS = { TASK: 10, PHOTO: 15, JOURNAL: 5, MINDFULNESS_PER_MINUTE: 2, FOCUS_PER_MINUTE: 3 };
const POINTS_PER_LEVEL = 100;

module.exports = { ACHIEVEMENTS, STREAK_KEYS, POINTS, POINTS_PER_LEVEL };
