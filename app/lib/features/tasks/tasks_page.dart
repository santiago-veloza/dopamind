import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets.dart';
import '../achievements/progress_header.dart';
import 'task_form_sheet.dart';
import 'task_models.dart';
import 'tasks_controller.dart';

const _priorityLabels = {
  TaskPriority.high: 'Alta',
  TaskPriority.medium: 'Media',
  TaskPriority.low: 'Baja',
};

class TasksPage extends StatefulWidget {
  const TasksPage({super.key});

  @override
  State<TasksPage> createState() => _TasksPageState();
}

class _TasksPageState extends State<TasksPage> {
  bool _showDone = false;

  @override
  Widget build(BuildContext context) {
    final c = context.watch<TasksController>();
    final items = _showDone ? c.done : c.pending;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: c.load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            const ProgressHeader(),
            const SizedBox(height: 12),
            SegmentedButton<bool>(
              segments: [
                ButtonSegment(value: false, label: Text('Pendientes (${c.pending.length})')),
                ButtonSegment(value: true, label: Text('Hechas (${c.done.length})')),
              ],
              selected: {_showDone},
              onSelectionChanged: (s) => setState(() => _showDone = s.first),
            ),
            const SizedBox(height: 12),
            if (c.error != null) ErrorBanner(message: c.error!, onRetry: c.load),
            if (c.loading && c.tasks.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (!c.loading && items.isEmpty && c.error == null)
              EmptyState(
                icon: _showDone ? Icons.task_alt : Icons.checklist,
                message: _showDone
                    ? 'Todavía no completas ninguna tarea'
                    : 'No tienes tareas pendientes.\nAgrega una con el botón +',
              ),
            for (final task in items) _TaskTile(task: task, controller: c),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showTaskForm(context, c),
        icon: const Icon(Icons.add),
        label: const Text('Nueva tarea'),
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task, required this.controller});

  final Task task;
  final TasksController controller;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final details = [
      task.category,
      'Prioridad ${_priorityLabels[task.priority]!.toLowerCase()}',
      if (task.scheduledLabel != null) task.scheduledLabel!,
    ].join(' · ');

    return Dismissible(
      key: ValueKey('task-${task.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        color: scheme.errorContainer,
        child: Icon(Icons.delete_outline, color: scheme.onErrorContainer),
      ),
      confirmDismiss: (_) => confirm(context, 'Eliminar tarea', '¿Eliminar "${task.title}"?'),
      onDismissed: (_) => controller.remove(task),
      child: Card(
        child: ListTile(
          leading: Checkbox(
            value: task.completed,
            onChanged: (_) => controller.toggle(task),
          ),
          title: Text(
            task.title,
            style: task.completed
                ? const TextStyle(decoration: TextDecoration.lineThrough)
                : null,
          ),
          subtitle: Text(details),
          trailing: task.priority == TaskPriority.high
              ? Icon(Icons.priority_high, color: scheme.error, semanticLabel: 'Prioridad alta')
              : null,
        ),
      ),
    );
  }
}
