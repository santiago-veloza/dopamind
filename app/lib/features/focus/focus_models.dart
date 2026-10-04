enum SessionType { focus, mindfulness }

class FocusSession {
  const FocusSession({
    required this.id,
    required this.type,
    required this.durationMinutes,
    required this.startedAt,
  });

  factory FocusSession.fromJson(Map<String, dynamic> json) => FocusSession(
        id: json['id'] as int,
        type: SessionType.values.firstWhere((t) => t.name == json['type']),
        durationMinutes: json['duration_minutes'] as int,
        startedAt: DateTime.parse(json['started_at'] as String).toLocal(),
      );

  final int id;
  final SessionType type;
  final int durationMinutes;
  final DateTime startedAt;
}

class SessionSummary {
  const SessionSummary({
    required this.type,
    required this.sessionCount,
    required this.totalMinutes,
  });

  factory SessionSummary.fromJson(Map<String, dynamic> json) => SessionSummary(
        type: SessionType.values.firstWhere((t) => t.name == json['type']),
        sessionCount: json['session_count'] as int,
        totalMinutes: json['total_minutes'] as int,
      );

  final SessionType type;
  final int sessionCount;
  final int totalMinutes;
}
