# DopamiND — app Android (Flutter)

Consume el backend de microservicios por el gateway (`backend/`). Pantallas: inicio de sesión/registro, tareas (con catálogo), enfoque y meditación, diario y logros con nivel, puntos y racha.

## Primera vez

Necesitas Flutter instalado (versión estable reciente) y un emulador o celular Android.

```powershell
cd app
flutter create --platforms=android --project-name dopamind --org com.dopamind .
git checkout -- lib test pubspec.yaml analysis_options.yaml .gitignore   # por si flutter create tocó algo
Remove-Item test/widget_test.dart -ErrorAction SilentlyContinue         # el de ejemplo no aplica
node tool/prepare_android.js         # permiso de internet, http en debug, sin backup automático
flutter pub get
flutter analyze
flutter test
```

Si `flutter pub get` se queja de versiones, `flutter pub add provider http flutter_secure_storage` deja que Flutter escoja las compatibles con tu SDK.

## Ejecutar

1. Levanta el backend (`backend/README.md`).
2. Emulador Android: `flutter run` (usa `http://10.0.2.2:3000`).
3. Celular físico (misma red Wi‑Fi que tu PC): `flutter run --dart-define=API_URL=http://<IP-de-tu-PC>:3000`.

## Estructura

```
lib/core/       cliente HTTP (renueva el token una sola vez), almacenamiento seguro, tema
lib/features/   auth, tasks, focus, journal, achievements, home (cada una: modelos, repositorio, controlador, pantallas)
test/           pruebas del cliente HTTP, modelos y controladores
```

## Límites actuales

- Funciona con conexión: no hay caché sin red.
- La verificación de tareas por foto no está incluida.
- El temporizador se guarda al terminar; si cierras la app antes, esa sesión no se registra.
- No mide el uso de otras apps.
