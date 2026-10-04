import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth_controller.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _register = false;
  bool _hidePassword = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit(AuthController auth) async {
    if (!_formKey.currentState!.validate()) return;
    if (_register) {
      await auth.register(_email.text, _password.text, _name.text);
    } else {
      await auth.login(_email.text, _password.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('DopamiND',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                              color: scheme.primary, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(
                        _register ? 'Crea tu cuenta' : 'Inicia sesión',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 24),
                      if (_register) ...[
                        TextFormField(
                          controller: _name,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.name],
                          decoration: const InputDecoration(
                              labelText: 'Nombre (opcional)', border: OutlineInputBorder()),
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(
                            labelText: 'Correo', border: OutlineInputBorder()),
                        validator: (v) {
                          final value = v?.trim() ?? '';
                          return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)
                              ? null
                              : 'Escribe un correo válido';
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _password,
                        obscureText: _hidePassword,
                        textInputAction: TextInputAction.done,
                        autofillHints: [
                          _register ? AutofillHints.newPassword : AutofillHints.password
                        ],
                        onFieldSubmitted: (_) => _submit(auth),
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          border: const OutlineInputBorder(),
                          helperText: _register ? 'Mínimo 8 caracteres' : null,
                          suffixIcon: IconButton(
                            tooltip: _hidePassword ? 'Mostrar contraseña' : 'Ocultar contraseña',
                            icon: Icon(_hidePassword ? Icons.visibility : Icons.visibility_off),
                            onPressed: () => setState(() => _hidePassword = !_hidePassword),
                          ),
                        ),
                        validator: (v) {
                          final value = v ?? '';
                          if (value.isEmpty) return 'Escribe tu contraseña';
                          if (_register && value.length < 8) return 'Mínimo 8 caracteres';
                          return null;
                        },
                      ),
                      if (auth.error != null) ...[
                        const SizedBox(height: 12),
                        Text(auth.error!, style: TextStyle(color: scheme.error)),
                      ],
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: auth.busy ? null : () => _submit(auth),
                        child: auth.busy
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2))
                            : Text(_register ? 'Crear cuenta' : 'Entrar'),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: auth.busy
                            ? null
                            : () {
                                auth.clearError();
                                setState(() => _register = !_register);
                              },
                        child: Text(_register
                            ? 'Ya tengo cuenta'
                            : '¿No tienes cuenta? Regístrate'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
