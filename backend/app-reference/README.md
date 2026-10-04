# app-reference — Código actual de la app Flutter

Estos son los archivos del lado cliente que definen **la forma de los datos hoy**.
Sirven de referencia para diseñar los endpoints y no perder campos en la migración.

| Archivo | Qué contiene |
|---------|--------------|
| `task_model.dart` | Modelo `Task`: 14 campos (title, priority, category, scheduled_hour/minute, verification_keywords...) con `toMap()`/`fromMap()` |
| `journal_entry_model.dart` | Modelo `JournalEntry`: content, prompt, mood (1-5), created_at |
| `achievement_model.dart` | Modelo `Achievement`: key, unlocked, required_value, current_value |
| `app_provider.dart` | **Toda la lógica de negocio actual**: puntos (+10 tarea, +5 journal, +15 foto), niveles, rachas, triggers de logros. Esto es lo que se traslada al backend por fases |
| `database_service.dart` | Esquema SQLite local (4 tablas) + los 12 logros sembrados |

## Correspondencia con los microservicios

| App Flutter (local) | Microservicio |
|---------------------|---------------|
| `DatabaseService.insertTask` | `POST /tasks` |
| `DatabaseService.getTasks` | `GET /tasks` |
| `DatabaseService.updateTask` | `PUT /tasks/:id` |
| `DatabaseService.deleteTask` | `DELETE /tasks/:id` |
| `DatabaseService.insertJournalEntry` | `POST /journal-entries` |
| `DatabaseService.getJournalEntries` | `GET /journal-entries` |
| `DatabaseService.getAchievements` | `GET /achievements` |
| `DatabaseService.incrementAchievement` | evento `task.completed` / `POST /achievements/:key/increment` |
| `DatabaseService.insertSession` | `POST /focus-sessions` |
| `AppProvider._addPoints` / `_checkStreak` | Se queda en la app por ahora (Fase 4) |

**Detalle importante:** los modelos Dart NO tienen `toJson`/`fromJson` — solo `toMap()`
con claves snake_case (mismas que las columnas SQL). Los contratos OpenAPI en
`contracts/` usan snake_case justamente para que la traducción sea directa.
