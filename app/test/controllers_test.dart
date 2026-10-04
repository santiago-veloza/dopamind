import 'package:dopamind/core/network/api_exception.dart';
import 'package:dopamind/features/achievements/achievement_models.dart';
import 'package:dopamind/features/achievements/achievement_repository.dart';
import 'package:dopamind/features/achievements/achievements_controller.dart';
import 'package:dopamind/features/auth/auth_controller.dart';
import 'package:dopamind/features/auth/auth_models.dart';
import 'package:dopamind/features/auth/auth_repository.dart';
import 'package:dopamind/features/focus/focus_controller.dart';
import 'package:dopamind/features/focus/focus_models.dart';
import 'package:dopamind/features/focus/focus_repository.dart';
import 'package:dopamind/features/tasks/task_models.dart';
import 'package:dopamind/features/tasks/task_repository.dart';
import 'package:dopamind/features/tasks/tasks_controller.dart';
import 'package:flutter_test/flutter_test.dart';

// ---- dobles de prueba ----

Task makeTask(int id, {bool completed = false}) => Task(
      id: id,
      title: 'Tarea $id',
      priority: TaskPriority.medium,
      category: 'general',
      completed: completed,
      createdAt: DateTime(2026, 10, 4),
    );

class FakeTaskRepository implements TaskRepository {
  List<Task> stored = [makeTask(1), makeTask(2)];
  bool failNext = false;

  void _maybeFail() {
    if (failNext) {
      failNext = false;
      throw ApiException(message: 'Sin conexión', status: null);
    }
  }

  @override
  Future<List<Task>> list() async {
    _maybeFail();
    return stored;
  }

  @override
  Future<Task> create({
    required String title,
    String? description,
    required TaskPriority priority,
    required String category,
  }) async {
    _maybeFail();
    return makeTask(99);
  }

  @override
  Future<Task> setCompleted(int id, bool completed) async {
    _maybeFail();
    return makeTask(id, completed: completed);
  }

  @override
  Future<void> delete(int id) async => _maybeFail();

  @override
  Future<List<PredefinedTask>> predefined() async => [];
}

class FakeAuthRepository implements AuthRepository {
  bool session = false;
  ApiException? loginError;
  ApiException? meError;

  @override
  Future<bool> hasSession() async => session;

  @override
  Future<UserProfile> login(String email, String password) async {
    if (loginError != null) throw loginError!;
    return const UserProfile(id: 1, email: 'ana@example.com');
  }

  @override
  Future<UserProfile> register(String email, String password, String? displayName) async =>
      const UserProfile(id: 1, email: 'ana@example.com');

  @override
  Future<UserProfile> me() async {
    if (meError != null) throw meError!;
    return const UserProfile(id: 1, email: 'ana@example.com');
  }

  @override
  Future<void> logout() async {}
}

class FakeFocusRepository implements FocusRepository {
  final saved = <(SessionType, int)>[];

  @override
  Future<FocusHistory> history() async => const FocusHistory([], []);

  @override
  Future<void> save(SessionType type, int minutes) async => saved.add((type, minutes));
}

class FakeAchievementRepository implements AchievementRepository {
  final pointsSequence = <int>[];
  int calls = 0;

  UserProgress _progress(int points) => UserProgress(
      points: points, level: 1, levelProgress: 0, currentStreak: 0, bestStreak: 0);

  @override
  Future<List<Achievement>> list() async => [];

  @override
  Future<UserProgress> progress() async {
    final i = calls < pointsSequence.length ? calls : pointsSequence.length - 1;
    calls++;
    return _progress(pointsSequence[i]);
  }
}

void main() {
  group('TasksController', () {
    test('load llena la lista', () async {
      final c = TasksController(FakeTaskRepository());
      await c.load();
      expect(c.tasks.length, 2);
      expect(c.pending.length, 2);
      expect(c.error, isNull);
    });

    test('completar una tarea la mueve a hechas y avisa la actividad', () async {
      final c = TasksController(FakeTaskRepository());
      var activity = 0;
      c.onActivity = () => activity++;
      await c.load();
      await c.toggle(c.tasks.first);
      expect(c.done.length, 1);
      expect(activity, 1);
    });

    test('desmarcar no cuenta como actividad', () async {
      final repo = FakeTaskRepository()..stored = [makeTask(1, completed: true)];
      final c = TasksController(repo);
      var activity = 0;
      c.onActivity = () => activity++;
      await c.load();
      await c.toggle(c.tasks.first);
      expect(activity, 0);
    });

    test('un error de red deja un mensaje y no rompe la lista', () async {
      final repo = FakeTaskRepository();
      final c = TasksController(repo);
      await c.load();
      repo.failNext = true;
      await c.toggle(c.tasks.first);
      expect(c.error, 'Sin conexión');
      expect(c.tasks.length, 2);
    });

    test('agregar pone la tarea al inicio', () async {
      final c = TasksController(FakeTaskRepository());
      await c.load();
      final ok = await c.add(title: 'Nueva', priority: TaskPriority.low, category: 'hogar');
      expect(ok, isTrue);
      expect(c.tasks.first.id, 99);
    });
  });

  group('AuthController', () {
    test('sin sesión guardada queda sin autenticar', () async {
      final c = AuthController(FakeAuthRepository());
      await c.restore();
      expect(c.status, AuthStatus.unauthenticated);
    });

    test('con sesión guardada recupera el usuario', () async {
      final c = AuthController(FakeAuthRepository()..session = true);
      await c.restore();
      expect(c.status, AuthStatus.authenticated);
      expect(c.user?.email, 'ana@example.com');
    });

    test('sin red al abrir no se pierde la sesión', () async {
      final repo = FakeAuthRepository()
        ..session = true
        ..meError = ApiException(message: 'Sin red');
      final c = AuthController(repo);
      await c.restore();
      expect(c.status, AuthStatus.authenticated);
    });

    test('si el servidor rechaza la sesión vuelve al login', () async {
      final repo = FakeAuthRepository()
        ..session = true
        ..meError = ApiException(message: 'No', status: 401);
      final c = AuthController(repo);
      await c.restore();
      expect(c.status, AuthStatus.unauthenticated);
    });

    test('login correcto autentica; incorrecto muestra el error', () async {
      final repo = FakeAuthRepository();
      final c = AuthController(repo);
      expect(await c.login(' ana@example.com ', 'clave-segura-1'), isTrue);
      expect(c.status, AuthStatus.authenticated);

      repo.loginError = ApiException(message: 'Credenciales inválidas', status: 401);
      final c2 = AuthController(repo);
      expect(await c2.login('ana@example.com', 'mala'), isFalse);
      expect(c2.error, 'Credenciales inválidas');
      expect(c2.status, isNot(AuthStatus.authenticated));
    });

    test('sessionExpired vuelve al login con aviso', () async {
      final c = AuthController(FakeAuthRepository());
      c.sessionExpired();
      expect(c.status, AuthStatus.unauthenticated);
      expect(c.error, isNotNull);
    });
  });

  group('FocusController', () {
    test('al terminar el tiempo guarda la sesión y avisa la actividad', () async {
      var now = DateTime(2026, 10, 4, 10, 0);
      final repo = FakeFocusRepository();
      final c = FocusController(repo, now: () => now);
      var activity = 0;
      c.onActivity = () => activity++;

      c.select(newMinutes: 25);
      c.start();
      expect(c.running, isTrue);
      expect(c.remaining, const Duration(minutes: 25));

      now = now.add(const Duration(minutes: 25, seconds: 1));
      await c.tick();

      expect(repo.saved, [(SessionType.focus, 25)]);
      expect(activity, 1);
      expect(c.running, isFalse);
      c.dispose();
    });

    test('cancelar no guarda nada', () async {
      final repo = FakeFocusRepository();
      final c = FocusController(repo);
      c.start();
      c.cancel();
      expect(repo.saved, isEmpty);
      expect(c.running, isFalse);
      c.dispose();
    });

    test('cambiar de tipo ajusta la duración a una válida', () {
      final c = FocusController(FakeFocusRepository());
      c.select(newType: SessionType.mindfulness);
      expect(mindfulnessDurations.contains(c.minutes), isTrue);
      c.dispose();
    });

    test('no se puede cambiar el tipo con el temporizador corriendo', () {
      final c = FocusController(FakeFocusRepository());
      c.start();
      c.select(newType: SessionType.mindfulness);
      expect(c.type, SessionType.focus);
      c.cancel();
      c.dispose();
    });
  });

  group('AchievementsController', () {
    test('consulta hasta que los puntos cambian', () async {
      final repo = FakeAchievementRepository()..pointsSequence.addAll([0, 0, 10]);
      final c = AchievementsController(repo, wait: (_) async {});
      await c.refreshAfterActivity();
      expect(c.progress.points, 10);
    });

    test('si los puntos no cambian, se rinde tras los intentos', () async {
      final repo = FakeAchievementRepository()..pointsSequence.add(0);
      final c = AchievementsController(repo, wait: (_) async {});
      await c.refreshAfterActivity(tries: 3);
      expect(repo.calls, 3);
    });
  });
}
