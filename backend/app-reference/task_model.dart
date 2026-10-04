import 'package:flutter/material.dart';

class Task {
  final int? id;
  final String title;
  final String? description;
  final String priority;
  final String category;
  final bool completed;
  final bool photoVerified;
  final String? photoPath;
  final DateTime createdAt;
  final DateTime? completedAt;
  final DateTime? dueDate;
  final int? scheduledHour;
  final int? scheduledMinute;
  final List<String> verificationKeywords;

  Task({
    this.id,
    required this.title,
    this.description,
    this.priority = 'medium',
    this.category = 'general',
    this.completed = false,
    this.photoVerified = false,
    this.photoPath,
    DateTime? createdAt,
    this.completedAt,
    this.dueDate,
    this.scheduledHour,
    this.scheduledMinute,
    this.verificationKeywords = const [],
  }) : createdAt = createdAt ?? DateTime.now();

  String get scheduledTime {
    if (scheduledHour == null || scheduledMinute == null) return '';
    final h = scheduledHour!.toString().padLeft(2, '0');
    final m = scheduledMinute!.toString().padLeft(2, '0');
    return '$h:$m';
  }

  Color get priorityColor {
    switch (priority) {
      case 'high':
        return const Color(0xFFFF6B6B);
      case 'medium':
        return const Color(0xFFFFB74D);
      case 'low':
        return const Color(0xFF4CAF50);
      default:
        return const Color(0xFFFFB74D);
    }
  }

  String get priorityLabel {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return 'Media';
    }
  }

  IconData get categoryIcon {
    switch (category) {
      case 'hogar':
        return Icons.home_outlined;
      case 'trabajo':
        return Icons.work_outline;
      case 'salud':
        return Icons.favorite_outline;
      case 'personal':
        return Icons.person_outline;
      case 'estudio':
        return Icons.school_outlined;
      default:
        return Icons.task_alt;
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'priority': priority,
      'category': category,
      'completed': completed ? 1 : 0,
      'photo_verified': photoVerified ? 1 : 0,
      'photo_path': photoPath,
      'created_at': createdAt.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'due_date': dueDate?.toIso8601String(),
      'scheduled_hour': scheduledHour,
      'scheduled_minute': scheduledMinute,
      'verification_keywords': verificationKeywords.join(','),
    };
  }

  factory Task.fromMap(Map<String, dynamic> map) {
    return Task(
      id: map['id'] as int?,
      title: map['title'] as String,
      description: map['description'] as String?,
      priority: map['priority'] as String? ?? 'medium',
      category: map['category'] as String? ?? 'general',
      completed: (map['completed'] as int?) == 1,
      photoVerified: (map['photo_verified'] as int?) == 1,
      photoPath: map['photo_path'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      completedAt: map['completed_at'] != null
          ? DateTime.parse(map['completed_at'] as String)
          : null,
      dueDate: map['due_date'] != null
          ? DateTime.parse(map['due_date'] as String)
          : null,
      scheduledHour: map['scheduled_hour'] as int?,
      scheduledMinute: map['scheduled_minute'] as int?,
      verificationKeywords: (map['verification_keywords'] as String?)
              ?.split(',')
              .where((s) => s.isNotEmpty)
              .toList() ??
          [],
    );
  }

  Task copyWith({
    int? id,
    String? title,
    String? description,
    String? priority,
    String? category,
    bool? completed,
    bool? photoVerified,
    String? photoPath,
    DateTime? createdAt,
    DateTime? completedAt,
    DateTime? dueDate,
    int? scheduledHour,
    int? scheduledMinute,
    List<String>? verificationKeywords,
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      priority: priority ?? this.priority,
      category: category ?? this.category,
      completed: completed ?? this.completed,
      photoVerified: photoVerified ?? this.photoVerified,
      photoPath: photoPath ?? this.photoPath,
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
      dueDate: dueDate ?? this.dueDate,
      scheduledHour: scheduledHour ?? this.scheduledHour,
      scheduledMinute: scheduledMinute ?? this.scheduledMinute,
      verificationKeywords:
          verificationKeywords ?? this.verificationKeywords,
    );
  }
}
