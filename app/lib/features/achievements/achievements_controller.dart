import 'package:flutter/foundation.dart';

import '../../core/safe_notifier.dart';

import '../../core/network/api_exception.dart';
import 'achievement_models.dart';
import 'achievement_repository.dart';

class AchievementsController extends ChangeNotifier with SafeNotifier {
  AchievementsController(this._repo,
      {Future<void> Function(Duration)? wait})
      : _wait = wait ?? ((d) => Future<void>.delayed(d));

  final AchievementRepository _repo;
  final Future<void> Function(Duration) _wait;

  List<Achievement> achievements = [];
  UserProgress progress = UserProgress.empty;
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      achievements = await _repo.list();
      progress = await _repo.progress();
    } on ApiException catch (e) {
      error = e.message;
    }
    loading = false;
    notifyListeners();
  }

  // El servidor calcula los puntos con eventos (llegan en 1 o 2 segundos).
  // Se consulta unas cuantas veces hasta que se vea el cambio.
  Future<void> refreshAfterActivity({int tries = 6}) async {
    final before = progress.points;
    for (var i = 0; i < tries; i++) {
      await _wait(const Duration(seconds: 1));
      try {
        final latest = await _repo.progress();
        if (latest.points != before) {
          await load();
          return;
        }
      } on ApiException {
        return;
      }
    }
  }
}
