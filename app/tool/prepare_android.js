// Ajusta el AndroidManifest que genera `flutter create` (se puede correr varias veces):
//  - permiso de INTERNET para hablar con el backend
//  - http en claro (usesCleartextTraffic) solo en el manifest de debug
//  - allowBackup=false (lo pide flutter_secure_storage para no romper las llaves)
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'android', 'app', 'src');
const mainPath = path.join(src, 'main', 'AndroidManifest.xml');
if (!fs.existsSync(mainPath)) {
  console.error('No existe android/. Corre primero: flutter create --platforms=android .');
  process.exit(1);
}

let main = fs.readFileSync(mainPath, 'utf8');
if (!main.includes('android.permission.INTERNET')) {
  main = main.replace('<application', '<uses-permission android:name="android.permission.INTERNET"/>\n    <application');
}
if (!main.includes('android:allowBackup')) {
  main = main.replace('<application', '<application\n        android:allowBackup="false"');
}
fs.writeFileSync(mainPath, main);

const debugPath = path.join(src, 'debug', 'AndroidManifest.xml');
if (fs.existsSync(debugPath)) {
  let debug = fs.readFileSync(debugPath, 'utf8');
  if (!debug.includes('usesCleartextTraffic')) {
    debug = debug.includes('<application')
      ? debug.replace('<application', '<application android:usesCleartextTraffic="true"')
      : debug.replace('</manifest>', '    <application android:usesCleartextTraffic="true"/>\n</manifest>');
    fs.writeFileSync(debugPath, debug);
  }
}
console.log('AndroidManifest listo');
