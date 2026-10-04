enum TaskPriority { high, medium, low }

const taskCategories = ['general', 'hogar', 'trabajo', 'salud', 'personal', 'estudio'];

class Task {
  const Task({
    required this.id,
    required this.title,
    required this.priority,
    required this.category,
    required this.completed,
    required this.createdAt,
    this.description,
    this.completedAt,
    this.dueDate,
    this.scheduledHour,
    this.scheduledMinute,
  });

  factory Task.fromJson(Map<String, dynamic> json) => Task(
        id: json['id'] as int,
        title: json['title'] as String,
        description: json['description'] as String?,
        priority: TaskPriority.values.firstWhere(
          (p) => p.name == json['priority'],
          orElse: () => TaskPriority.medium,
        ),
        category: json['category'] as String,
        completed: json['completed'] as bool,
        createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
        completedAt: json['completed_at'] == null
            ? null
            : DateTime.parse(json['completed_at'] as String).toLocal(),
        dueDate: json['due_date'] == null
            ? null
            : DateTime.parse(json['due_date'] as String).toLocal(),
        scheduledHour: json['scheduled_hour'] as int?,
        scheduledMinute: json['scheduled_minute'] as int?,
      );

  final int id;
  final String title;
  final String? description;
  final TaskPriority priority;
  final String category;
  final bool completed;
  final DateTime createdAt;
  final DateTime? completedAt;
  final DateTime? dueDate;
  final int? scheduledHour;
  final int? scheduledMinute;

  String? get scheduledLabel {
    if (scheduledHour == null) return null;
    final h = scheduledHour!.toString().padLeft(2, '0');
    final m = (scheduledMinute ?? 0).toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class PredefinedTask {
  const PredefinedTask({
    required this.title,
    required this.description,
    required this.priority,
    required this.category,
    required this.icon,
  });

  factory PredefinedTask.fromJson(Map<String, dynamic> json) => PredefinedTask(
        title: json['title'] as String,
        description: json['description'] as String,
        priority: TaskPriority.values.firstWhere(
          (p) => p.name == json['priority'],
          orElse: () => TaskPriority.medium,
        ),
        category: json['category'] as String,
        icon: json['icon'] as String,
      );

  final String title;
  final String description;
  final TaskPriority priority;
  final String category;
  final String icon;
}
