import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'achievements_controller.dart';

// Nivel, puntos y racha: los calcula el servidor
class ProgressHeader extends StatelessWidget {
  const ProgressHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.watch<AchievementsController>().progress;
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Nivel ${p.level}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: scheme.onPrimaryContainer, fontWeight: FontWeight.w600)),
              const Spacer(),
              Text('${p.points} pts',
                  style: TextStyle(color: scheme.onPrimaryContainer)),
            ],
          ),
          const SizedBox(height: 8),
          Semantics(
            label: 'Progreso del nivel ${(p.levelProgress * 100).round()} por ciento',
            child: LinearProgressIndicator(value: p.levelProgress, minHeight: 8),
          ),
          const SizedBox(height: 8),
          Text('Racha: ${p.currentStreak} ${p.currentStreak == 1 ? 'día' : 'días'}'
              ' · Mejor: ${p.bestStreak}',
              style: TextStyle(color: scheme.onPrimaryContainer)),
        ],
      ),
    );
  }
}
