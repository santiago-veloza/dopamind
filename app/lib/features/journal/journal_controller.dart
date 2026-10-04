import 'package:flutter/foundation.dart';

import '../../core/safe_notifier.dart';

import '../../core/network/api_exception.dart';
import 'journal_models.dart';
import 'journal_repository.dart';

class JournalController extends ChangeNotifier with SafeNotifier {
  JournalController(this._repo);

  final JournalRepository _repo;

  List<JournalEntry> entries = [];
  bool loading = false;
  String? error;
  VoidCallback? onActivity;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      entries = await _repo.list();
    } on ApiException catch (e) {
      error = e.message;
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> add({required String content, required int mood, String? prompt}) async {
    try {
      final entry = await _repo.create(content: content, mood: mood, prompt: prompt);
      entries = [entry, ...entries];
      error = null;
      notifyListeners();
      onActivity?.call();
      return true;
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<void> remove(JournalEntry entry) async {
    try {
      await _repo.delete(entry.id);
      entries = entries.where((e) => e.id != entry.id).toList();
      error = null;
    } on ApiException catch (e) {
      error = e.message;
    }
    notifyListeners();
  }
}
