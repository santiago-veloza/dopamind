import '../../core/network/api_client.dart';
import 'focus_models.dart';

class FocusHistory {
  const FocusHistory(this.sessions, this.summary);
  final List<FocusSession> sessions;
  final List<SessionSummary> summary;
}

class FocusRepository {
  FocusRepository(this._api);

  final ApiClient _api;

  Future<FocusHistory> history() async {
    final data = await _api.get('/focus-sessions') as Map<String, dynamic>;
    return FocusHistory(
      (data['focus_sessions'] as List)
          .map((s) => FocusSession.fromJson(s as Map<String, dynamic>))
          .toList(),
      (data['summary'] as List)
          .map((s) => SessionSummary.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }

  // No se manda started_at: el servidor usa su hora y evita problemas de reloj del celular
  Future<void> save(SessionType type, int minutes) => _api.post('/focus-sessions',
      body: {'type': type.name, 'duration_minutes': minutes});
}
