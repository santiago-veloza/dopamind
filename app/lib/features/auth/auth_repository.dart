import '../../core/network/api_client.dart';
import '../../core/storage/token_storage.dart';
import 'auth_models.dart';

class AuthRepository {
  AuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStorage _tokens;

  Future<bool> hasSession() async => (await _tokens.readRefresh()) != null;

  Future<UserProfile> login(String email, String password) async {
    final data = await _api.post('/auth/login',
        body: {'email': email, 'password': password}, auth: false);
    return _store(data as Map<String, dynamic>);
  }

  Future<UserProfile> register(
      String email, String password, String? displayName) async {
    final data = await _api.post('/auth/register',
        body: {
          'email': email,
          'password': password,
          if (displayName != null && displayName.isNotEmpty)
            'display_name': displayName,
        },
        auth: false);
    return _store(data as Map<String, dynamic>);
  }

  Future<UserProfile> me() async {
    final data = await _api.get('/auth/me') as Map<String, dynamic>;
    return UserProfile.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    final refresh = await _tokens.readRefresh();
    try {
      if (refresh != null) {
        await _api.post('/auth/logout',
            body: {'refreshToken': refresh}, auth: false);
      }
    } catch (_) {
      // si no hay red igual se cierra la sesión local
    } finally {
      await _tokens.clear();
    }
  }

  Future<UserProfile> _store(Map<String, dynamic> data) async {
    await _tokens.save(
      access: data['accessToken'] as String,
      refresh: data['refreshToken'] as String,
    );
    return UserProfile.fromJson(data['user'] as Map<String, dynamic>);
  }
}
