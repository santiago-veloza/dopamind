class Achievement {
  const Achievement({
    required this.key,
    required this.title,
    required this.description,
    required this.icon,
    required this.unlocked,
    required this.requiredValue,
    required this.currentValue,
  });

  factory Achievement.fromJson(Map<String, dynamic> json) => Achievement(
        key: json['key'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        icon: json['icon'] as String,
        unlocked: json['unlocked'] as bool,
        requiredValue: json['required_value'] as int,
        currentValue: json['current_value'] as int,
      );

  final String key;
  final String title;
  final String description;
  final String icon;
  final bool unlocked;
  final int requiredValue;
  final int currentValue;

  double get progress =>
      requiredValue == 0 ? 0 : (currentValue / requiredValue).clamp(0.0, 1.0);
}

class UserProgress {
  const UserProgress({
    required this.points,
    required this.level,
    required this.levelProgress,
    required this.currentStreak,
    required this.bestStreak,
  });

  factory UserProgress.fromJson(Map<String, dynamic> json) => UserProgress(
        points: json['points'] as int,
        level: json['level'] as int,
        levelProgress: (json['level_progress'] as num).toDouble(),
        currentStreak: json['current_streak'] as int,
        bestStreak: json['best_streak'] as int,
      );

  static const empty = UserProgress(
      points: 0, level: 1, levelProgress: 0, currentStreak: 0, bestStreak: 0);

  final int points;
  final int level;
  final double levelProgress;
  final int currentStreak;
  final int bestStreak;
}
