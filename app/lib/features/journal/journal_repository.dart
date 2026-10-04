import '../../core/network/api_client.dart';
import 'journal_models.dart';

class JournalRepository {
  JournalRepository(this._api);

  final ApiClient _api;

  Future<List<JournalEntry>> list() async {
    final data = await _api.get('/journal-entries') as Map<String, dynamic>;
    return (data['journal_entries'] as List)
        .map((e) => JournalEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<JournalEntry> create({
    required String content,
    required int mood,
    String? prompt,
  }) async {
    final data = await _api.post('/journal-entries', body: {
      'content': content,
      'mood': mood,
      if (prompt != null) 'prompt': prompt,
    }) as Map<String, dynamic>;
    return JournalEntry.fromJson(data['journal_entry'] as Map<String, dynamic>);
  }

  Future<void> delete(int id) => _api.delete('/journal-entries/$id');
}
