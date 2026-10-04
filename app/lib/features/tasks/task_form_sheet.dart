import 'package:flutter/material.dart';

import 'task_models.dart';
import 'tasks_controller.dart';

Future<void> showTaskForm(BuildContext context, TasksController controller) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => TaskFormSheet(controller: controller),
  );
}

class TaskFormSheet extends StatefulWidget {
  const TaskFormSheet({super.key, required this.controller});

  final TasksController controller;

  @override
  State<TaskFormSheet> createState() => _TaskFormSheetState();
}

class _TaskFormSheetState extends State<TaskFormSheet> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  TaskPriority _priority = TaskPriority.medium;
  String _category = 'general';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _pickFromCatalog() async {
    await widget.controller.loadCatalog();
    if (!mounted) return;
    final picked = await showModalBottomSheet<PredefinedTask>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (_, scroll) => ListView(
          controller: scroll,
          children: [
            for (final t in widget.controller.catalog)
              ListTile(
                leading: Text(t.icon, style: const TextStyle(fontSize: 24)),
                title: Text(t.title),
                subtitle: Text(t.description),
                onTap: () => Navigator.pop(ctx, t),
              ),
          ],
        ),
      ),
    );
    if (picked == null) return;
    setState(() {
      _title.text = picked.title;
      _description.text = picked.description;
      _priority = picked.priority;
      _category = taskCategories.contains(picked.category) ? picked.category : 'general';
    });
  }

  Future<void> _save() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Escribe un título');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final ok = await widget.controller.add(
      title: title,
      description: _description.text.trim(),
      priority: _priority,
      category: _category,
    );
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
      // sube el formulario cuando aparece el teclado
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Nueva tarea', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            TextField(
              controller: _title,
              maxLength: 200,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Título', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _description,
              maxLines: 2,
              maxLength: 2000,
              decoration: const InputDecoration(labelText: 'Descripción (opcional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: _pickFromCatalog,
                icon: const Icon(Icons.list_alt),
                label: const Text('Elegir del catálogo'),
              ),
            ),
            const Text('Prioridad'),
            const SizedBox(height: 4),
            SegmentedButton<TaskPriority>(
              segments: const [
                ButtonSegment(value: TaskPriority.high, label: Text('Alta')),
                ButtonSegment(value: TaskPriority.medium, label: Text('Media')),
                ButtonSegment(value: TaskPriority.low, label: Text('Baja')),
              ],
              selected: {_priority},
              onSelectionChanged: (s) => setState(() => _priority = s.first),
            ),
            const SizedBox(height: 12),
            const Text('Categoría'),
            Wrap(
              spacing: 8,
              children: [
                for (final c in taskCategories)
                  ChoiceChip(
                    label: Text(c),
                    selected: _category == c,
                    onSelected: (_) => setState(() => _category = c),
                  ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
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
