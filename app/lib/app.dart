import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/config/api_config.dart';
import 'core/network/api_client.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/auth_page.dart';
import 'features/auth/auth_repository.dart';
import 'features/home/home_shell.dart';

class DopamindApp extends StatefulWidget {
  const DopamindApp({super.key});

  @override
  State<DopamindApp> createState() => _DopamindAppState();
}

class _DopamindAppState extends State<DopamindApp> {
  late final ApiClient _api;
  late final AuthController _auth;

  @override
  void initState() {
    super.initState();
    final tokens = SecureTokenStorage();
    _api = ApiClient(baseUrl: ApiConfig.baseUrl, tokens: tokens, timeout: ApiConfig.timeout);
    _auth = AuthController(AuthRepository(_api, tokens));
    _api.onSessionExpired = _auth.sessionExpired;
    _auth.restore();
  }

  @override
  void dispose() {
    _auth.dispose();
    _api.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _auth,
      child: MaterialApp(
        title: 'DopamiND',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(Brightness.light),
        darkTheme: buildTheme(Brightness.dark),
        home: Consumer<AuthController>(
          builder: (context, auth, _) {
            switch (auth.status) {
              case AuthStatus.unknown:
                return const Scaffold(body: Center(child: CircularProgressIndicator()));
              case AuthStatus.unauthenticated:
                return const AuthPage();
              case AuthStatus.authenticated:
                // la llave obliga a recrear los controladores si cambia el usuario
                return HomeShell(key: ValueKey(auth.user?.id), api: _api);
            }
          },
        ),
      ),
    );
  }
}
