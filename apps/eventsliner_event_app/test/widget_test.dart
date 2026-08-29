import 'package:flutter_test/flutter_test.dart';
import 'package:eventsliner_event_app/app.dart';
import 'package:eventsliner_event_app/config/app_config.dart';

void main() {
  testWidgets('Event app boots with config', (tester) async {
    final config = AppConfig(
      apiBaseUrl: 'http://127.0.0.1:43123',
      eventSlug: 'demo',
      displayName: 'Demo',
      primaryColorArgb: 0xFF6750A4,
    );
    await tester.pumpWidget(EventslinerEventApp(config: config));
    await tester.pump();
    expect(find.text('Demo'), findsWidgets);
  });
}
