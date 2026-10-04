String two(int n) => n.toString().padLeft(2, '0');

String formatDateTime(DateTime d) =>
    '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';

String formatClock(Duration d) =>
    '${two(d.inMinutes)}:${two(d.inSeconds.remainder(60))}';
