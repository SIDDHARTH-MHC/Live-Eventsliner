/// Compile-time / runtime config for a white-label event build.
///
/// Mode B CI injects these via `--dart-define`. Mode A can override branding
/// from `GET /api/v1/public/events/:slug/app-config` at runtime.
class AppConfig {
  AppConfig({
    required this.apiBaseUrl,
    required this.eventSlug,
    required this.displayName,
    required this.primaryColorArgb,
  });

  final String apiBaseUrl;
  final String eventSlug;
  String displayName;
  int primaryColorArgb;

  static AppConfig fromEnvironment() {
    const api = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:43123',
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

  void applyRemote({String? displayName, String? primaryColor}) {
    if (displayName != null && displayName.isNotEmpty) {
      this.displayName = displayName;
    }
    if (primaryColor != null && primaryColor.isNotEmpty) {
      primaryColorArgb = _parseColor(primaryColor);
    }
  }

  static int _parseColor(String hex) {
    var h = hex.replaceAll('#', '').toUpperCase();
    if (h.length == 6) h = 'FF$h';
    return int.parse(h, radix: 16);
  }
}
