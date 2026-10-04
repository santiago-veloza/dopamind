class JournalEntry {
  final int? id;
  final String content;
  final String? prompt;
  final int mood; // 1-5
  final DateTime createdAt;

  JournalEntry({
    this.id,
    required this.content,
    this.prompt,
    this.mood = 3,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  String get moodEmoji {
    switch (mood) {
      case 1:
        return '😞';
      case 2:
        return '😟';
      case 3:
        return '😐';
      case 4:
        return '🙂';
      case 5:
        return '😊';
      default:
        return '😐';
    }
  }

  String get moodLabel {
    switch (mood) {
      case 1:
        return 'Muy mal';
      case 2:
        return 'Mal';
      case 3:
        return 'Regular';
      case 4:
        return 'Bien';
      case 5:
        return 'Muy bien';
      default:
        return 'Regular';
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'content': content,
      'prompt': prompt,
      'mood': mood,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory JournalEntry.fromMap(Map<String, dynamic> map) {
    return JournalEntry(
      id: map['id'] as int?,
      content: map['content'] as String,
      prompt: map['prompt'] as String?,
      mood: map['mood'] as int? ?? 3,
      createdAt: DateTime.parse(map['created_at'] as String),
    );
  }

  JournalEntry copyWith({
    int? id,
    String? content,
    String? prompt,
    int? mood,
    DateTime? createdAt,
  }) {
    return JournalEntry(
      id: id ?? this.id,
      content: content ?? this.content,
      prompt: prompt ?? this.prompt,
      mood: mood ?? this.mood,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
