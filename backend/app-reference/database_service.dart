import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';
import 'package:path/path.dart';
import 'package:flutter/foundation.dart';
import '../models/task.dart';
import '../models/journal_entry.dart';
import '../models/achievement.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    if (kIsWeb) {
      final dbFactory = databaseFactoryFfiWeb;
      return await dbFactory.openDatabase(
        'dopamind.db',
        options: OpenDatabaseOptions(
          version: 1,
          onCreate: _createDatabase,
        ),
      );
    }
    String path = join(await getDatabasesPath(), 'dopamind.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDatabase,
    );
  }

  Future<void> _createDatabase(Database db, int version) async {
    await db.execute('''
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        category TEXT DEFAULT 'general',
        completed INTEGER DEFAULT 0,
        photo_verified INTEGER DEFAULT 0,
        photo_path TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        due_date TEXT,
        scheduled_hour INTEGER,
        scheduled_minute INTEGER,
        verification_keywords TEXT DEFAULT ''
      )
    ''');

    await db.execute('''
      CREATE TABLE journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        prompt TEXT,
        mood INTEGER DEFAULT 3,
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        unlocked INTEGER DEFAULT 0,
        unlocked_at TEXT,
        required_value INTEGER DEFAULT 1,
        current_value INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      )
    ''');

    await _seedAchievements(db);
  }

  Future<void> _seedAchievements(Database db) async {
    final achievements = [
      {'key': 'first_task', 'title': 'Primera Tarea', 'description': 'Completa tu primera tarea', 'icon': '✓', 'required_value': 1},
      {'key': 'streak_3', 'title': 'Racha de 3', 'description': '3 días consecutivos activo', 'icon': '🔥', 'required_value': 3},
      {'key': 'streak_7', 'title': 'Racha de 7', 'description': '7 días consecutivos activo', 'icon': '🌟', 'required_value': 7},
      {'key': 'streak_30', 'title': 'Racha de 30', 'description': '30 días consecutivos activo', 'icon': '👑', 'required_value': 30},
      {'key': 'mindful_1', 'title': 'Primera Sesión', 'description': 'Primera sesión de atención plena', 'icon': '🧘', 'required_value': 1},
      {'key': 'mindful_10', 'title': 'Mente Plena', 'description': '10 sesiones de atención plena', 'icon': '🧠', 'required_value': 10},
      {'key': 'focus_1', 'title': 'Enfocado', 'description': 'Primera sesión de enfoque', 'icon': '🎯', 'required_value': 1},
      {'key': 'focus_10', 'title': 'Maestro del Enfoque', 'description': '10 sesiones de enfoque', 'icon': '🏆', 'required_value': 10},
      {'key': 'journal_1', 'title': 'Primeras Palabras', 'description': 'Escribe tu primera entrada', 'icon': '📝', 'required_value': 1},
      {'key': 'journal_7', 'title': 'Escritor', 'description': '7 entradas en el diario', 'icon': '📖', 'required_value': 7},
      {'key': 'photo_verify', 'title': 'Verificador', 'description': 'Verifica una tarea con foto', 'icon': '📸', 'required_value': 1},
      {'key': 'tasks_50', 'title': 'Super Productivo', 'description': 'Completa 50 tareas', 'icon': '🚀', 'required_value': 50},
    ];

    for (final a in achievements) {
      await db.insert('achievements', {
        'key': a['key'],
        'title': a['title'],
        'description': a['description'],
        'icon': a['icon'],
        'required_value': a['required_value'],
        'current_value': 0,
        'unlocked': 0,
      });
    }
  }

  // Tasks
  Future<int> insertTask(Task task) async {
    final db = await database;
    return await db.insert('tasks', task.toMap()..remove('id'));
  }

  Future<List<Task>> getTasks({bool? completed, String? priority}) async {
    final db = await database;
    String whereClause = '';
    List<dynamic> whereArgs = [];

    if (completed != null) {
      whereClause = 'completed = ?';
      whereArgs.add(completed ? 1 : 0);
    }
    if (priority != null) {
      if (whereClause.isNotEmpty) whereClause += ' AND ';
      whereClause += 'priority = ?';
      whereArgs.add(priority);
    }

    final maps = await db.query(
      'tasks',
      where: whereClause.isNotEmpty ? whereClause : null,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: 'created_at DESC',
    );
    return maps.map((map) => Task.fromMap(map)).toList();
  }

  Future<void> updateTask(Task task) async {
    final db = await database;
    await db.update('tasks', task.toMap(), where: 'id = ?', whereArgs: [task.id]);
  }

  Future<void> deleteTask(int id) async {
    final db = await database;
    await db.delete('tasks', where: 'id = ?', whereArgs: [id]);
  }

  Future<int> getCompletedTasksCount() async {
    final db = await database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM tasks WHERE completed = 1');
    return result.first['count'] as int;
  }

  Future<int> getTodayCompletedTasksCount() async {
    final db = await database;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM tasks WHERE completed = 1 AND completed_at LIKE ?',
      ['$today%'],
    );
    return result.first['count'] as int;
  }

  // Journal
  Future<int> insertJournalEntry(JournalEntry entry) async {
    final db = await database;
    return await db.insert('journal_entries', entry.toMap()..remove('id'));
  }

  Future<List<JournalEntry>> getJournalEntries() async {
    final db = await database;
    final maps = await db.query('journal_entries', orderBy: 'created_at DESC');
    return maps.map((map) => JournalEntry.fromMap(map)).toList();
  }

  Future<void> deleteJournalEntry(int id) async {
    final db = await database;
    await db.delete('journal_entries', where: 'id = ?', whereArgs: [id]);
  }

  Future<int> getJournalCount() async {
    final db = await database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM journal_entries');
    return result.first['count'] as int;
  }

  // Achievements
  Future<List<Achievement>> getAchievements() async {
    final db = await database;
    final maps = await db.query('achievements');
    return maps.map((map) => Achievement.fromMap(map)).toList();
  }

  Future<void> updateAchievement(Achievement achievement) async {
    final db = await database;
    await db.update(
      'achievements',
      achievement.toMap(),
      where: 'key = ?',
      whereArgs: [achievement.key],
    );
  }

  Future<Achievement?> getAchievement(String key) async {
    final db = await database;
    final maps = await db.query('achievements', where: 'key = ?', whereArgs: [key]);
    if (maps.isEmpty) return null;
    return Achievement.fromMap(maps.first);
  }

  Future<void> incrementAchievement(String key, {int incrementBy = 1}) async {
    final achievement = await getAchievement(key);
    if (achievement == null) return;

    final newValue = achievement.currentValue + incrementBy;
    final updated = achievement.copyWith(
      currentValue: newValue,
      unlocked: newValue >= achievement.requiredValue,
      unlockedAt: newValue >= achievement.requiredValue ? DateTime.now() : null,
    );
    await updateAchievement(updated);
  }

  // Sessions
  Future<void> insertSession(String type, int durationMinutes) async {
    final db = await database;
    await db.insert('sessions', {
      'type': type,
      'duration_minutes': durationMinutes,
      'started_at': DateTime.now().toIso8601String(),
      'completed': 1,
    });
  }

  Future<int> getTotalSessionMinutes(String type) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COALESCE(SUM(duration_minutes), 0) as total FROM sessions WHERE type = ?',
      [type],
    );
    return result.first['total'] as int;
  }

  Future<int> getSessionCount(String type) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM sessions WHERE type = ?',
      [type],
    );
    return result.first['count'] as int;
  }
}
