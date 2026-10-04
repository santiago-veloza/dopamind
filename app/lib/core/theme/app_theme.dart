import 'package:flutter/material.dart';

// Verde azulado, tono calmado: poca estimulación visual para una app de bienestar.
// ColorScheme.fromSeed genera los pares de color con contraste adecuado en claro y oscuro.
const _seed = Color(0xFF2A7F6F);

ThemeData buildTheme(Brightness brightness) => ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: _seed, brightness: brightness),
      visualDensity: VisualDensity.standard,
    );
