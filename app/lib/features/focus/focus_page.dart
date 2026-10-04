import 'dart:ui' show FontFeature;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/widgets.dart';
import 'focus_controller.dart';
import 'focus_models.dart';

const _typeLabels = {
  SessionType.focus: 'Enfoque',
  SessionType.mindfulness: 'Meditación',
};

class FocusPage extends StatelessWidget {
  const FocusPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.watch<FocusController>();
    final textTheme = Theme.of(context).textTheme;

    return RefreshIndicator(
      onRefresh: c.loadHistory,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<SessionType>(
            segments: [
              for (final t in SessionType.values)
                ButtonSegment(value: t, label: Text(_typeLabels[t]!)),
            ],
            selected: {c.type},
            onSelectionChanged: c.running ? null : (s) => c.select(newType: s.first),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            alignment: WrapAlignment.center,
            children: [
              for (final m in c.durations)
                ChoiceChip(
                  label: Text('$m min'),
                  selected: c.minutes == m,
                  onSelected: c.running ? null : (_) => c.select(newMinutes: m),
                ),
            ],
          ),
          const SizedBox(height: 24),
          Center(
            child: Semantics(
              label: 'Tiempo restante ${c.remaining.inMinutes} minutos',
              child: Text(
                formatClock(c.remaining),
                style: textTheme.displayLarge?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          if (c.saving)
            const Center(child: CircularProgressIndicator())
          else if (c.running)
            OutlinedButton(onPressed: c.cancel, child: const Text('Cancelar (no se guarda)'))
          else
            FilledButton.icon(
              onPressed: c.start,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Empezar'),
            ),
          const SizedBox(height: 8),
          Text(
            'La sesión se guarda al terminar el tiempo. Mantén la app abierta.',
            textAlign: TextAlign.center,
            style: textTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          if (c.error != null) ErrorBanner(message: c.error!, onRetry: c.loadHistory),
          if (c.summary.isNotEmpty) ...[
            Text('Resumen', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final s in c.summary)
              ListTile(
                dense: true,
                leading: Icon(s.type == SessionType.focus ? Icons.center_focus_strong : Icons.self_improvement),
                title: Text(_typeLabels[s.type]!),
                trailing: Text('${s.sessionCount} sesiones · ${s.totalMinutes} min'),
              ),
            const SizedBox(height: 8),
          ],
          if (c.sessions.isEmpty && c.error == null)
            const EmptyState(icon: Icons.timer_outlined, message: 'Aún no tienes sesiones'),
          for (final s in c.sessions.take(10))
            ListTile(
              dense: true,
              title: Text('${_typeLabels[s.type]} · ${s.durationMinutes} min'),
              subtitle: Text(formatDateTime(s.startedAt)),
            ),
        ],
      ),
    );
  }
}
