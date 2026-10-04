import '../../core/network/api_client.dart';
import 'achievement_models.dart';

class AchievementRepository {
  AchievementRepository(this._api);

  final ApiClient _api;

  Future<List<Achievement>> list() async {
    final data = await _api.get('/achievements') as Map<String, dynamic>;
    return (data['achievements'] as List)
        .map((a) => Achievement.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  Future<UserProgress> progress() async {
    final data = await _api.get('/progress') as Map<String, dynamic>;
    return UserProgress.fromJson(data['progress'] as Map<String, dynamic>);
  }
}
