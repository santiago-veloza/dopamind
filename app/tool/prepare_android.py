#!/usr/bin/env python3
"""Ajusta el AndroidManifest que genera `flutter create` (es idempotente).

- INTERNET para poder hablar con el backend
- usesCleartextTraffic solo en el manifest de debug/profile (el backend local va por http)
- allowBackup=false (lo recomienda flutter_secure_storage para no romper las llaves)
"""
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent / 'android' / 'app' / 'src'
main = root / 'main' / 'AndroidManifest.xml'
if not main.exists():
    sys.exit('No existe android/. Corre primero: flutter create --platforms=android .')

text = main.read_text(encoding='utf-8')
if 'android.permission.INTERNET' not in text:
    text = text.replace('<application', '<uses-permission android:name="android.permission.INTERNET"/>\n    <application', 1)
if 'android:allowBackup' not in text:
    text = text.replace('<application', '<application\n        android:allowBackup="false"', 1)
main.write_text(text, encoding='utf-8')

# http en claro solo para desarrollo: se pone en el manifest de debug
debug = root / 'debug' / 'AndroidManifest.xml'
if debug.exists():
    d = debug.read_text(encoding='utf-8')
    if 'usesCleartextTraffic' not in d:
        if '<application' in d:
            d = d.replace('<application', '<application android:usesCleartextTraffic="true"', 1)
        else:
            d = d.replace('</manifest>', '    <application android:usesCleartextTraffic="true"/>\n</manifest>')
        debug.write_text(d, encoding='utf-8')
print('AndroidManifest listo')
