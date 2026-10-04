import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets.dart';
import 'achievement_models.dart';
import 'achievements_controller.dart';
import 'progress_header.dart';

class AchievementsPage extends StatelessWidget {
  const AchievementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.watch<AchievementsController>();
    return RefreshIndicator(
      onRefresh: c.load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const ProgressHeader(),
          const SizedBox(height: 16),
          if (c.error != null) ErrorBanner(message: c.error!, onRetry: c.load),
          if (c.loading && c.achievements.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (!c.loading && c.achievements.isEmpty && c.error == null)
            const EmptyState(icon: Icons.emoji_events_outlined, message: 'Aún no hay logros'),
          for (final a in c.achievements) _AchievementTile(a),
        ],
      ),
    );
  }
}

class _AchievementTile extends StatelessWidget {
  const _AchievementTile(this.a);

  final Achievement a;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: ListTile(
        leading: Opacity(
          opacity: a.unlocked ? 1 : 0.4,
          child: Text(a.icon, style: const TextStyle(fontSize: 28)),
        ),
        title: Text(a.title),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(a.description),
            const SizedBox(height: 6),
            LinearProgressIndicator(value: a.progress),
          ],
        ),
        // el estado va en texto, no solo en color
        trailing: a.unlocked
            ? Icon(Icons.check_circle, color: scheme.primary, semanticLabel: 'Desbloqueado')
            : Text('${a.currentValue}/${a.requiredValue}'),
      ),
    );
  }
}
