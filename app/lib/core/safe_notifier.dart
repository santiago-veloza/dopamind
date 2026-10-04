import 'package:flutter/foundation.dart';

// Evita el error de notificar después de dispose cuando una petición termina tras cerrar sesión
mixin SafeNotifier on ChangeNotifier {
  bool _disposed = false;

  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
