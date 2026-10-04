import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/widgets.dart';
import 'journal_controller.dart';
import 'journal_form_sheet.dart';
import 'journal_models.dart';

class JournalPage extends StatelessWidget {
  const JournalPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.watch<JournalController>();
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: c.load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            if (c.error != null) ErrorBanner(message: c.error!, onRetry: c.load),
            if (c.loading && c.entries.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (!c.loading && c.entries.isEmpty && c.error == null)
              const EmptyState(
                icon: Icons.menu_book_outlined,
                message: 'Tu diario está vacío.\nEscribe cómo te sientes hoy.',
              ),
            for (final e in c.entries) _EntryCard(entry: e, controller: c),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showJournalForm(context, c),
        icon: const Icon(Icons.edit),
        label: const Text('Escribir'),
      ),
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({required this.entry, required this.controller});

  final JournalEntry entry;
  final JournalController controller;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(moodEmojis[entry.mood]!, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${moodLabels[entry.mood]} · ${formatDateTime(entry.createdAt)}',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                ),
                IconButton(
                  tooltip: 'Eliminar entrada',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    final ok = await confirm(context, 'Eliminar entrada', '¿Eliminar esta entrada del diario?');
                    if (ok) controller.remove(entry);
                  },
                ),
              ],
            ),
            if (entry.prompt != null) ...[
              const SizedBox(height: 4),
              Text(entry.prompt!, style: const TextStyle(fontStyle: FontStyle.italic)),
            ],
            const SizedBox(height: 8),
            Text(entry.content),
          ],
        ),
      ),
    );
  }
}
