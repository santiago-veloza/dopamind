import 'package:flutter/foundation.dart';

import '../../core/safe_notifier.dart';

import '../../core/network/api_exception.dart';
import 'task_models.dart';
import 'task_repository.dart';

class TasksController extends ChangeNotifier with SafeNotifier {
  TasksController(this._repo);

  final TaskRepository _repo;

  List<Task> tasks = [];
  List<PredefinedTask> catalog = [];
  bool loading = false;
  String? error;

  // Se avisa a quien dependa de la actividad (p. ej. logros) cuando se completa algo
  VoidCallback? onActivity;

  List<Task> get pending => tasks.where((t) => !t.completed).toList();
  List<Task> get done => tasks.where((t) => t.completed).toList();

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      tasks = await _repo.list();
    } on ApiException catch (e) {
      error = e.message;
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loadCatalog() async {
    if (catalog.isNotEmpty) return;
    try {
      catalog = await _repo.predefined();
      notifyListeners();
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
    }
  }

  Future<bool> add({
    required String title,
    String? description,
    required TaskPriority priority,
    required String category,
  }) async {
    try {
      final task = await _repo.create(
        title: title,
        description: description,
        priority: priority,
        category: category,
      );
      tasks = [task, ...tasks];
      error = null;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<void> toggle(Task task) async {
    try {
      final updated = await _repo.setCompleted(task.id, !task.completed);
      tasks = [for (final t in tasks) t.id == updated.id ? updated : t];
      error = null;
      notifyListeners();
      if (updated.completed) onActivity?.call();
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
    }
  }

  Future<void> remove(Task task) async {
    try {
      await _repo.delete(task.id);
      tasks = tasks.where((t) => t.id != task.id).toList();
      error = null;
    } on ApiException catch (e) {
      error = e.message;
    }
    notifyListeners();
  }
}
