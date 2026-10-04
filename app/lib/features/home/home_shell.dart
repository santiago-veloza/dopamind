import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../achievements/achievement_repository.dart';
import '../achievements/achievements_controller.dart';
import '../achievements/achievements_page.dart';
import '../auth/auth_controller.dart';
import '../focus/focus_controller.dart';
import '../focus/focus_page.dart';
import '../focus/focus_repository.dart';
import '../journal/journal_controller.dart';
import '../journal/journal_page.dart';
import '../journal/journal_repository.dart';
import '../tasks/task_repository.dart';
import '../tasks/tasks_controller.dart';
import '../tasks/tasks_page.dart';

// Los controladores viven mientras haya sesión: al salir se destruyen y no queda nada del usuario anterior
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.api});

  final ApiClient api;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  late final TasksController _tasks;
  late final FocusController _focus;
  late final JournalController _journal;
  late final AchievementsController _achievements;
  int _index = 0;

  static const _titles = ['Tareas', 'Enfoque', 'Diario', 'Logros'];

  @override
  void initState() {
    super.initState();
    _tasks = TasksController(TaskRepository(widget.api));
    _focus = FocusController(FocusRepository(widget.api));
    _journal = JournalController(JournalRepository(widget.api));
    _achievements = AchievementsController(AchievementRepository(widget.api));

    // cada actividad dispara la consulta del progreso (el servidor lo calcula con eventos)
    void onActivity() => _achievements.refreshAfterActivity();
    _tasks.onActivity = onActivity;
    _focus.onActivity = onActivity;
    _journal.onActivity = onActivity;

    _tasks.load();
    _focus.loadHistory();
    _journal.load();
    _achievements.load();
  }

  @override
  void dispose() {
    _tasks.dispose();
    _focus.dispose();
    _journal.dispose();
    _achievements.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _tasks),
        ChangeNotifierProvider.value(value: _focus),
        ChangeNotifierProvider.value(value: _journal),
        ChangeNotifierProvider.value(value: _achievements),
      ],
      child: Scaffold(
        appBar: AppBar(
          title: Text(_titles[_index]),
          actions: [
            PopupMenuButton<String>(
              tooltip: 'Cuenta',
              icon: const Icon(Icons.account_circle_outlined),
              onSelected: (_) => auth.logout(),
              itemBuilder: (_) => [
                PopupMenuItem(enabled: false, child: Text(auth.user?.shownName ?? '')),
                const PopupMenuItem(value: 'logout', child: Text('Cerrar sesión')),
              ],
            ),
          ],
        ),
        body: IndexedStack(
          index: _index,
          children: const [TasksPage(), FocusPage(), JournalPage(), AchievementsPage()],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.checklist), label: 'Tareas'),
            NavigationDestination(icon: Icon(Icons.timer_outlined), label: 'Enfoque'),
            NavigationDestination(icon: Icon(Icons.menu_book_outlined), label: 'Diario'),
            NavigationDestination(icon: Icon(Icons.emoji_events_outlined), label: 'Logros'),
          ],
        ),
      ),
    );
  }
}
