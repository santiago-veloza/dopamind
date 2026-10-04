import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/safe_notifier.dart';

import '../../core/network/api_exception.dart';
import 'focus_models.dart';
import 'focus_repository.dart';

const focusDurations = [15, 25, 45, 60];
const mindfulnessDurations = [5, 10, 15, 20];

class FocusController extends ChangeNotifier with SafeNotifier {
  FocusController(this._repo, {DateTime Function()? now})
      : _now = now ?? DateTime.now;

  final FocusRepository _repo;
  final DateTime Function() _now;

  SessionType type = SessionType.focus;
  int minutes = 25;
  List<FocusSession> sessions = [];
  List<SessionSummary> summary = [];
  String? error;
  bool saving = false;
  VoidCallback? onActivity;

  DateTime? _endsAt;
  Timer? _ticker;
  bool _completing = false;

  bool get running => _endsAt != null;

  // Se calcula con la hora de fin, así no se desfasa si la app queda en segundo plano
  Duration get remaining {
    final end = _endsAt;
    if (end == null) return Duration(minutes: minutes);
    final left = end.difference(_now());
    return left.isNegative ? Duration.zero : left;
  }

  List<int> get durations =>
      type == SessionType.focus ? focusDurations : mindfulnessDurations;

  void select({SessionType? newType, int? newMinutes}) {
    if (running) return;
    if (newType != null && newType != type) {
      type = newType;
      minutes = durations[1]; // duración habitual de cada tipo (25 o 10)
    }
    if (newMinutes != null) minutes = newMinutes;
    notifyListeners();
  }

  void start() {
    if (running) return;
    _endsAt = _now().add(Duration(minutes: minutes));
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => tick());
    error = null;
    notifyListeners();
  }

  // Cancelar no guarda nada
  void cancel() {
    _stopTicker();
    _endsAt = null;
    notifyListeners();
  }

  @visibleForTesting
  Future<void> tick() async {
    if (!running) return;
    if (remaining > Duration.zero) {
      notifyListeners();
      return;
    }
    await _complete();
  }

  Future<void> _complete() async {
    if (_completing) return;
    _completing = true;
    _stopTicker();
    _endsAt = null;
    saving = true;
    notifyListeners();
    try {
      await _repo.save(type, minutes);
      await loadHistory();
      onActivity?.call();
    } on ApiException catch (e) {
      error = 'No se pudo guardar la sesión: ${e.message}';
    }
    saving = false;
    _completing = false;
    notifyListeners();
  }

  Future<void> loadHistory() async {
    try {
      final history = await _repo.history();
      sessions = history.sessions;
      summary = history.summary;
    } on ApiException catch (e) {
      error = e.message;
    }
    notifyListeners();
  }

  void _stopTicker() {
    _ticker?.cancel();
    _ticker = null;
  }

  @override
  void dispose() {
    _stopTicker();
    super.dispose();
  }
}
