import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../storage/token_storage.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokens,
    http.Client? client,
    this.timeout = const Duration(seconds: 10),
  }) : _http = client ?? http.Client();

  final String baseUrl;
  final TokenStorage tokens;
  final Duration timeout;
  final http.Client _http;

  // Se llama cuando el refresh ya no sirve y hay que volver al login
  void Function()? onSessionExpired;

  // Una sola renovación a la vez: el backend revoca la sesión si se reutiliza un refresh
  Future<bool>? _refreshing;

  Future<dynamic> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, query: query);

  Future<dynamic> post(String path, {Object? body, bool auth = true}) =>
      _send('POST', path, body: body ?? const {}, auth: auth);

  Future<dynamic> put(String path, {Object? body}) =>
      _send('PUT', path, body: body ?? const {});

  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
    bool auth = true,
    bool retried = false,
  }) async {
    final response = await _dispatch(method, path, query, body, auth);

    if (response.statusCode == 401 && auth && !retried) {
      final renewed = await _renewTokens();
      if (renewed) {
        return _send(method, path,
            query: query, body: body, auth: auth, retried: true);
      }
      onSessionExpired?.call();
      throw ApiException(message: 'Tu sesión expiró', status: 401);
    }
    return _decode(response);
  }

  Future<http.Response> _dispatch(
    String method,
    String path,
    Map<String, String>? query,
    Object? body,
    bool auth,
  ) async {
    var uri = Uri.parse('$baseUrl$path');
    if (query != null && query.isNotEmpty) uri = uri.replace(queryParameters: query);

    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
    };
    if (auth) {
      final token = await tokens.readAccess();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }

    final encoded = body == null ? null : jsonEncode(body);
    try {
      final Future<http.Response> request;
      switch (method) {
        case 'GET':
          request = _http.get(uri, headers: headers);
        case 'POST':
          request = _http.post(uri, headers: headers, body: encoded);
        case 'PUT':
          request = _http.put(uri, headers: headers, body: encoded);
        case 'DELETE':
          request = _http.delete(uri, headers: headers);
        default:
          throw ArgumentError('Método no soportado: $method');
      }
      return await request.timeout(timeout);
    } on TimeoutException {
      throw ApiException(message: 'El servidor tardó demasiado en responder');
    } on SocketException {
      throw ApiException(message: 'No hay conexión con el servidor');
    } on http.ClientException {
      throw ApiException(message: 'No hay conexión con el servidor');
    }
  }

  Future<bool> _renewTokens() {
    final running = _refreshing;
    if (running != null) return running;
    final future = _doRenew().whenComplete(() => _refreshing = null);
    _refreshing = future;
    return future;
  }

  Future<bool> _doRenew() async {
    final refresh = await tokens.readRefresh();
    if (refresh == null) return false;

    final response = await _dispatch(
        'POST', '/auth/refresh', null, {'refreshToken': refresh}, false);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      await tokens.save(
        access: data['accessToken'] as String,
        refresh: data['refreshToken'] as String,
      );
      return true;
    }
    // solo si el servidor lo rechaza de verdad se cierra la sesión local
    if (response.statusCode == 401) {
      await tokens.clear();
      return false;
    }
    throw ApiException(
        message: 'No se pudo renovar la sesión', status: response.statusCode);
  }

  dynamic _decode(http.Response response) {
    final text = utf8.decode(response.bodyBytes);
    dynamic json;
    if (text.isNotEmpty) {
      try {
        json = jsonDecode(text);
      } on FormatException {
        json = null;
      }
    }
    if (response.statusCode >= 200 && response.statusCode < 300) return json;

    final map = json is Map<String, dynamic> ? json : const <String, dynamic>{};
    final details = (map['details'] is List)
        ? (map['details'] as List)
            .map((d) => d is Map ? '${d['path']}: ${d['message']}' : '$d')
            .toList()
        : <String>[];
    throw ApiException(
      message: (map['error'] as String?) ?? 'Error ${response.statusCode}',
      status: response.statusCode,
      details: details,
    );
  }

  void close() => _http.close();
}
