class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    this.displayName,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] as int,
        email: json['email'] as String,
        displayName: json['display_name'] as String?,
      );

  final int id;
  final String email;
  final String? displayName;

  String get shownName =>
      (displayName != null && displayName!.isNotEmpty) ? displayName! : email;
}
