import 'package:flutter/material.dart';

import 'journal_controller.dart';
import 'journal_models.dart';

Future<void> showJournalForm(BuildContext context, JournalController controller) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => JournalFormSheet(controller: controller),
  );
}

class JournalFormSheet extends StatefulWidget {
  const JournalFormSheet({super.key, required this.controller});

  final JournalController controller;

  @override
  State<JournalFormSheet> createState() => _JournalFormSheetState();
}

class _JournalFormSheetState extends State<JournalFormSheet> {
  final _content = TextEditingController();
  String? _prompt;
  int _mood = 3;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _content.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final text = _content.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Escribe algo antes de guardar');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final ok = await widget.controller.add(content: text, mood: _mood, prompt: _prompt);
    if (!mounted) return;
    if (ok) {
      Navigator.pop(context);
    } else {
      setState(() {
        _saving = false;
        _error = widget.controller.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Nueva entrada', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            const Text('¿Cómo te sientes?'),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              children: [
                for (final entry in moodLabels.entries)
                  ChoiceChip(
                    label: Text('${moodEmojis[entry.key]} ${entry.value}'),
                    selected: _mood == entry.key,
                    onSelected: (_) => setState(() => _mood = entry.key),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Una pregunta para empezar (opcional)'),
            Wrap(
              spacing: 8,
              children: [
                for (final p in journalPrompts)
                  ChoiceChip(
                    label: Text(p),
                    selected: _prompt == p,
                    onSelected: (on) => setState(() => _prompt = on ? p : null),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _content,
              minLines: 4,
              maxLines: 8,
              maxLength: 10000,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Escribe aquí', border: OutlineInputBorder()),
            ),
            if (_error != null)
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Guardar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
