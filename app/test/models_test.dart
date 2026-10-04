import 'package:dopamind/features/achievements/achievement_models.dart';
import 'package:dopamind/features/tasks/task_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Task.fromJson lee los campos del servidor', () {
    final task = Task.fromJson({
      'id': 7,
      'title': 'Lavar la loza',
      'description': null,
      'priority': 'high',
      'category': 'hogar',
      'completed': false,
      'created_at': '2026-10-04T15:00:00.000Z',
      'completed_at': null,
      'due_date': null,
      'scheduled_hour': 9,
      'scheduled_minute': 5,
    });
    expect(task.priority, TaskPriority.high);
    expect(task.scheduledLabel, '09:05');
    expect(task.completedAt, isNull);
  });

  test('prioridad desconocida cae en media', () {
    final task = Task.fromJson({
      'id': 1, 'title': 't', 'priority': 'urgente', 'category': 'general',
      'completed': true, 'created_at': '2026-10-04T15:00:00Z',
    });
    expect(task.priority, TaskPriority.medium);
  });

  test('el progreso de un logro nunca pasa de 1', () {
    const a = Achievement(
      key: 'tasks_50', title: 't', description: 'd', icon: '🚀',
      unlocked: true, requiredValue: 50, currentValue: 80,
    );
    expect(a.progress, 1.0);
  });

  test('UserProgress acepta level_progress entero o decimal', () {
    final p = UserProgress.fromJson({
      'points': 120, 'level': 2, 'level_progress': 0,
      'current_streak': 3, 'best_streak': 5,
    });
    expect(p.levelProgress, 0.0);
    expect(p.level, 2);
  });
}
