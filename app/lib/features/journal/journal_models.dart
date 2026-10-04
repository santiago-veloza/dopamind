const journalPrompts = [
  '¿Qué fue lo mejor de hoy?',
  '¿Qué me quitó energía hoy?',
  '¿Por qué estoy agradecido hoy?',
  '¿Qué haría distinto mañana?',
];

const moodLabels = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Regular',
  4: 'Bien',
  5: 'Muy bien',
};

const moodEmojis = {1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄'};

class JournalEntry {
  const JournalEntry({
    required this.id,
    required this.content,
    required this.mood,
    required this.createdAt,
    this.prompt,
  });

  factory JournalEntry.fromJson(Map<String, dynamic> json) => JournalEntry(
        id: json['id'] as int,
        content: json['content'] as String,
        prompt: json['prompt'] as String?,
        mood: json['mood'] as int,
        createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
      );

  final int id;
  final String content;
  final String? prompt;
  final int mood;
  final DateTime createdAt;
}
