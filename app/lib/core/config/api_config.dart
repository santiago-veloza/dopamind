class ApiConfig {
  // Emulador de Android: 10.0.2.2 es tu PC. En celular físico usa la IP de tu PC:
  // flutter run --dart-define=API_URL=http://192.168.1.50:3000
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const Duration timeout = Duration(seconds: 10);
}
