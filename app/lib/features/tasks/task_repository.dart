import '../../core/network/api_client.dart';
import 'task_models.dart';

class TaskRepository {
  TaskRepository(this._api);

  final ApiClient _api;

  Future<List<Task>> list() async {
    final data = await _api.get('/tasks', query: {'limit': '500'}) as Map<String, dynamic>;
    return (data['tasks'] as List)
        .map((t) => Task.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  Future<Task> create({
    required String title,
    String? description,
    required TaskPriority priority,
    required String category,
  }) async {
    final data = await _api.post('/tasks', body: {
      'title': title,
      if (description != null && description.isNotEmpty) 'description': description,
      'priority': priority.name,
      'category': category,
    }) as Map<String, dynamic>;
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  Future<Task> setCompleted(int id, bool completed) async {
    final data = await _api.put('/tasks/$id', body: {'completed': completed})
        as Map<String, dynamic>;
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  Future<void> delete(int id) => _api.delete('/tasks/$id');

  Future<List<PredefinedTask>> predefined() async {
    final data = await _api.get('/tasks/predefined') as Map<String, dynamic>;
    return (data['predefined_tasks'] as List)
        .map((t) => PredefinedTask.fromJson(t as Map<String, dynamic>))
        .toList();
  }
}
