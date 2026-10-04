import 'dart:convert';

import 'package:dopamind/core/network/api_client.dart';
import 'package:dopamind/core/network/api_exception.dart';
import 'package:dopamind/core/storage/token_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response jsonResponse(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

void main() {
  late MemoryTokenStorage tokens;

  setUp(() {
    tokens = MemoryTokenStorage()
      ..access = 'old'
      ..refresh = 'refresh-1';
  });

  ApiClient clientWith(Future<http.Response> Function(http.Request) handler) =>
      ApiClient(baseUrl: 'http://api.test', tokens: tokens, client: MockClient(handler));

  test('envía el access token en Authorization', () async {
    String? header;
    final api = clientWith((req) async {
      header = req.headers['Authorization'];
      return jsonResponse({'ok': true});
    });
    await api.get('/tasks');
    expect(header, 'Bearer old');
  });

  test('con 401 renueva los tokens y repite la petición', () async {
    final api = clientWith((req) async {
      if (req.url.path == '/auth/refresh') {
        expect(jsonDecode(req.body), {'refreshToken': 'refresh-1'});
        return jsonResponse({'accessToken': 'new', 'refreshToken': 'refresh-2'});
      }
      return req.headers['Authorization'] == 'Bearer new'
          ? jsonResponse({'tasks': []})
          : jsonResponse({'error': 'Token inválido o expirado'}, 401);
    });
    final data = await api.get('/tasks');
    expect(data, {'tasks': []});
    expect(tokens.access, 'new');
    expect(tokens.refresh, 'refresh-2');
  });

  test('varias peticiones con 401 a la vez hacen UNA sola renovación', () async {
    var refreshCalls = 0;
    final api = clientWith((req) async {
      if (req.url.path == '/auth/refresh') {
        refreshCalls++;
        await Future<void>.delayed(const Duration(milliseconds: 30));
        return jsonResponse({'accessToken': 'new', 'refreshToken': 'refresh-2'});
      }
      return req.headers['Authorization'] == 'Bearer new'
          ? jsonResponse({'ok': true})
          : jsonResponse({'error': 'expirado'}, 401);
    });
    await Future.wait([api.get('/tasks'), api.get('/journal-entries'), api.get('/progress')]);
    expect(refreshCalls, 1);
  });

  test('si el refresh es rechazado, borra los tokens y avisa que la sesión expiró', () async {
    var expired = false;
    final api = clientWith((req) async => jsonResponse({'error': 'x'}, 401))
      ..onSessionExpired = () => expired = true;
    await expectLater(
      api.get('/tasks'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)),
    );
    expect(expired, isTrue);
    expect(tokens.access, isNull);
    expect(tokens.refresh, isNull);
  });

  test('si falla la red al renovar NO se pierde la sesión', () async {
    final api = clientWith((req) async {
      if (req.url.path == '/auth/refresh') throw http.ClientException('sin red');
      return jsonResponse({'error': 'expirado'}, 401);
    });
    await expectLater(api.get('/tasks'), throwsA(isA<ApiException>()));
    expect(tokens.refresh, 'refresh-1');
  });

  test('las rutas públicas no llevan token ni intentan renovar', () async {
    var calls = 0;
    final api = clientWith((req) async {
      calls++;
      expect(req.headers.containsKey('Authorization'), isFalse);
      return jsonResponse({'error': 'Credenciales inválidas'}, 401);
    });
    await expectLater(
      api.post('/auth/login', body: {'email': 'a@a.com', 'password': 'x'}, auth: false),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Credenciales inválidas')),
    );
    expect(calls, 1);
  });

  test('sin conexión da un ApiException de red', () async {
    final api = clientWith((req) async => throw http.ClientException('no hay red'));
    await expectLater(
      api.get('/tasks'),
      throwsA(isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', isTrue)),
    );
  });

  test('traduce el error del servidor con su detalle por campo', () async {
    final api = clientWith((req) async => jsonResponse({
          'error': 'Datos inválidos',
          'details': [
            {'path': 'title', 'message': 'Too small'}
          ],
        }, 400));
    await expectLater(
      api.post('/tasks', body: {'title': ''}),
      throwsA(isA<ApiException>()
          .having((e) => e.status, 'status', 400)
          .having((e) => e.details, 'details', ['title: Too small'])),
    );
  });

  test('respuesta vacía (204) devuelve null', () async {
    final api = clientWith((req) async => http.Response('', 204));
    expect(await api.post('/auth/logout', body: {'refreshToken': 'r'}, auth: false), isNull);
  });
}
