class ApiException implements Exception {
  ApiException({required this.message, this.status, this.details = const []});

  final String message;
  final int? status; // null cuando ni siquiera hubo respuesta
  final List<String> details;

  bool get isNetwork => status == null;
  bool get isUnauthorized => status == 401;

  @override
  String toString() => message;
}
