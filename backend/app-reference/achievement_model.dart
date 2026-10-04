class Achievement {
  final int? id;
  final String key;
  final String title;
  final String description;
  final String icon;
  final bool unlocked;
  final DateTime? unlockedAt;
  final int requiredValue;
  final int currentValue;

  Achievement({
    this.id,
    required this.key,
    required this.title,
    required this.description,
    required this.icon,
    this.unlocked = false,
    this.unlockedAt,
    this.requiredValue = 1,
    this.currentValue = 0,
  });

  double get progress =>
      requiredValue > 0 ? (currentValue / requiredValue).clamp(0.0, 1.0) : 0.0;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'key': key,
      'title': title,
      'description': description,
      'icon': icon,
      'unlocked': unlocked ? 1 : 0,
      'unlocked_at': unlockedAt?.toIso8601String(),
      'required_value': requiredValue,
      'current_value': currentValue,
    };
  }

  factory Achievement.fromMap(Map<String, dynamic> map) {
    return Achievement(
      id: map['id'] as int?,
      key: map['key'] as String,
      title: map['title'] as String,
      description: map['description'] as String,
      icon: map['icon'] as String,
      unlocked: (map['unlocked'] as int?) == 1,
      unlockedAt: map['unlocked_at'] != null
          ? DateTime.parse(map['unlocked_at'] as String)
          : null,
      requiredValue: map['required_value'] as int? ?? 1,
      currentValue: map['current_value'] as int? ?? 0,
    );
  }

  Achievement copyWith({
    int? id,
    String? key,
    String? title,
    String? description,
    String? icon,
    bool? unlocked,
    DateTime? unlockedAt,
    int? requiredValue,
    int? currentValue,
  }) {
    return Achievement(
      id: id ?? this.id,
      key: key ?? this.key,
      title: title ?? this.title,
      description: description ?? this.description,
      icon: icon ?? this.icon,
      unlocked: unlocked ?? this.unlocked,
      unlockedAt: unlockedAt ?? this.unlockedAt,
      requiredValue: requiredValue ?? this.requiredValue,
      currentValue: currentValue ?? this.currentValue,
    );
  }
}
