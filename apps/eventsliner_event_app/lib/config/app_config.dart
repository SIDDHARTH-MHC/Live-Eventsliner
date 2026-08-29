/// Compile-time / runtime config for a white-label event build.
///
/// Example:
/// ```bash
/// flutter run \
///   --dart-define=API_BASE_URL=https://eventsliner-mh45.onrender.com \
///   --dart-define=EVENT_SLUG=delhi-demo-product-workshop \
///   --dart-define=APP_DISPLAY_NAME=Delhi Workshop \
///   --dart-define=PRIMARY_COLOR=6750A4
/// ```
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.eventSlug,
    required this.displayName,
    required this.primaryColorArgb,
  });

  final String apiBaseUrl;
  final String eventSlug;
  final String displayName;

  /// ARGB without `#`, e.g. `FF6750A4` or `6750A4`.
  final int primaryColorArgb;

  static AppConfig fromEnvironment() {
    const api = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:43123', // Android emulator → host
    );
    const slug = String.fromEnvironment(
      'EVENT_SLUG',
      defaultValue: 'delhi-demo-product-workshop',
    );
    const name = String.fromEnvironment(
      'APP_DISPLAY_NAME',
      defaultValue: 'Eventsliner Live',
    );
    const colorHex = String.fromEnvironment(
      'PRIMARY_COLOR',
      defaultValue: '6750A4',
    );

    return AppConfig(
      apiBaseUrl: api.replaceAll(RegExp(r'/$'), ''),
      eventSlug: slug,
      displayName: name,
      primaryColorArgb: _parseColor(colorHex),
    );
  }

  static int _parseColor(String hex) {
    var h = hex.replaceAll('#', '').toUpperCase();
    if (h.length == 6) h = 'FF$h';
    return int.parse(h, radix: 16);
  }
}
