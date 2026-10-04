import 'package:flutter/foundation.dart';

import '../../core/network/api_exception.dart';
import 'auth_models.dart';
import 'auth_repository.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthController extends ChangeNotifier {
  AuthController(this._repo);

  final AuthRepository _repo;

  AuthStatus status = AuthStatus.unknown;
  UserProfile? user;
  bool busy = false;
  String? error;

  // Al abrir la app: si hay sesión guardada se intenta recuperar el usuario
  Future<void> restore() async {
    if (!await _repo.hasSession()) {
      _setStatus(AuthStatus.unauthenticated);
      return;
    }
    try {
      user = await _repo.me();
      _setStatus(AuthStatus.authenticated);
    } on ApiException catch (e) {
      if (e.isNetwork) {
        // sin red no se pierde la sesión; se deja pasar y las pantallas mostrarán el error
        _setStatus(AuthStatus.authenticated);
      } else {
        _setStatus(AuthStatus.unauthenticated);
      }
    }
  }

  Future<bool> login(String email, String password) =>
      _run(() => _repo.login(email.trim(), password));

  Future<bool> register(String email, String password, String? name) =>
      _run(() => _repo.register(email.trim(), password, name?.trim()));

  Future<void> logout() async {
    await _repo.logout();
    user = null;
    _setStatus(AuthStatus.unauthenticated);
  }

  // El ApiClient avisa cuando el refresh ya no es válido
  void sessionExpired() {
    user = null;
    error = 'Tu sesión expiró, inicia sesión de nuevo';
    _setStatus(AuthStatus.unauthenticated);
  }

  void clearError() {
    if (error == null) return;
    error = null;
    notifyListeners();
  }

  Future<bool> _run(Future<UserProfile> Function() action) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      user = await action();
      busy = false;
      _setStatus(AuthStatus.authenticated);
      return true;
    } on ApiException catch (e) {
      busy = false;
      error = e.details.isEmpty ? e.message : '${e.message}\n${e.details.join('\n')}';
      notifyListeners();
      return false;
    }
  }

  void _setStatus(AuthStatus next) {
    status = next;
    notifyListeners();
  }
}
