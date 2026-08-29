import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'config/app_config.dart';
import 'services/api_client.dart';

Future<void> promptTicketToken(BuildContext context) async {
  final controller = TextEditingController();
  final state = context.read<EventAppState>();
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) {
      return Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 24,
          bottom: MediaQuery.viewInsetsOf(ctx).bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Paste ticket token', style: Theme.of(ctx).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'From your ticket link /tickets/{token}.',
              style: Theme.of(ctx).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Ticket token',
                border: OutlineInputBorder(),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Save pass'),
            ),
          ],
        ),
      );
    },
  );
  if (ok == true && controller.text.trim().isNotEmpty && context.mounted) {
    try {
      await state.saveTicketToken(controller.text);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pass saved')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }
}

class EventAppState extends ChangeNotifier {
  EventAppState(this.config) : api = EventApiClient(config);

  final AppConfig config;
  final EventApiClient api;

  EventSummary? event;
  List<SessionItem> sessions = [];
  TicketPass? ticket;
  String? ticketToken;
  String? error;
  bool loading = true;

  Future<void> bootstrap() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      ticketToken = prefs.getString('ticket_token');
      event = await api.fetchEvent();
      sessions = await api.fetchSessions();
      if (ticketToken != null && ticketToken!.isNotEmpty) {
        try {
          ticket = await api.fetchTicket(ticketToken!);
        } catch (_) {
          ticket = null;
        }
      }
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> saveTicketToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('ticket_token', token.trim());
    ticketToken = token.trim();
    ticket = await api.fetchTicket(ticketToken!);
    notifyListeners();
  }

  Future<void> clearTicket() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('ticket_token');
    ticketToken = null;
    ticket = null;
    notifyListeners();
  }
}

class EventslinerEventApp extends StatelessWidget {
  const EventslinerEventApp({super.key, required this.config});

  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => EventAppState(config)..bootstrap(),
      child: Consumer<EventAppState>(
        builder: (context, state, _) {
          return MaterialApp(
            title: state.config.displayName,
            debugShowCheckedModeBanner: false,
            theme: buildEventTheme(state.config),
            home: const _HomeShell(),
          );
        },
      ),
    );
  }
}

class _HomeShell extends StatefulWidget {
  const _HomeShell();

  @override
  State<_HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<_HomeShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      const _HomeTab(),
      const _PassTab(),
      const _ScheduleTab(),
      const _MoreTab(),
    ];

    return Scaffold(
      body: SafeArea(child: pages[index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_2_outlined),
            selectedIcon: Icon(Icons.qr_code_2),
            label: 'My Pass',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: 'Schedule',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz),
            selectedIcon: Icon(Icons.more_horiz),
            label: 'More',
          ),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<EventAppState>();
    final theme = Theme.of(context);

    if (state.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final event = state.event;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      children: [
        Text(
          state.config.displayName,
          style: theme.textTheme.labelLarge?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          event?.title ?? 'Your event',
          style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        if (event?.venueName != null || event?.city != null) ...[
          const SizedBox(height: 8),
          Text(
            [event?.venueName, event?.city].whereType<String>().join(' · '),
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        if (event?.description != null && event!.description!.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(event.description!, style: theme.textTheme.bodyMedium),
        ],
        const SizedBox(height: 28),
        FilledButton.icon(
          onPressed: () => promptTicketToken(context),
          icon: const Icon(Icons.confirmation_number_outlined),
          label: Text(state.ticket == null ? 'Add my pass' : 'Update pass'),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: state.bootstrap,
          icon: const Icon(Icons.sync),
          label: const Text('Refresh'),
        ),
        if (state.error != null) ...[
          const SizedBox(height: 16),
          Text(state.error!, style: TextStyle(color: theme.colorScheme.error)),
        ],
      ],
    );
  }
}

class _PassTab extends StatelessWidget {
  const _PassTab();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<EventAppState>();
    final theme = Theme.of(context);

    if (state.ticket == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.qr_code_2, size: 64, color: theme.colorScheme.outline),
              const SizedBox(height: 16),
              Text('No pass yet', style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                'Add your ticket token to show a QR at the gate.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => promptTicketToken(context),
                child: const Text('Add my pass'),
              ),
            ],
          ),
        ),
      );
    }

    final pass = state.ticket!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      children: [
        Text('My Pass', style: theme.textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(pass.displayName, style: theme.textTheme.titleMedium),
        if (pass.ticketType != null)
          Text(
            pass.ticketType!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        const SizedBox(height: 24),
        Center(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.colorScheme.outlineVariant),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: QrImageView(
                data: pass.qrPayload ?? pass.token,
                size: 240,
                backgroundColor: Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Center(child: Text('Show this QR at check-in')),
        const SizedBox(height: 24),
        OutlinedButton(
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: pass.token));
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Token copied')),
              );
            }
          },
          child: const Text('Copy ticket token'),
        ),
        TextButton(
          onPressed: state.clearTicket,
          child: const Text('Remove pass from this device'),
        ),
      ],
    );
  }
}

class _ScheduleTab extends StatelessWidget {
  const _ScheduleTab();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<EventAppState>();
    final theme = Theme.of(context);

    if (state.loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.sessions.isEmpty) {
      return Center(child: Text('Schedule coming soon', style: theme.textTheme.titleMedium));
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      itemCount: state.sessions.length + 1,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        if (i == 0) {
          return Text('Schedule', style: theme.textTheme.headlineSmall);
        }
        final s = state.sessions[i - 1];
        return Card(
          elevation: 0,
          color: theme.colorScheme.surfaceContainerLowest,
          child: ListTile(
            title: Text(s.title),
            subtitle: Text(
              [
                if (s.startsAt != null) _fmt(s.startsAt!),
                if (s.room != null) s.room,
              ].join(' · '),
            ),
            leading: Icon(Icons.event, color: theme.colorScheme.primary),
          ),
        );
      },
    );
  }

  String _fmt(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

class _MoreTab extends StatelessWidget {
  const _MoreTab();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<EventAppState>();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      children: [
        Text('More', style: Theme.of(context).textTheme.headlineSmall),
        ListTile(
          leading: const Icon(Icons.info_outline),
          title: const Text('About'),
          subtitle: Text(
            'Event-specific Eventsliner Live app (Flutter). '
            'Configured without per-event code — see docs/22-flutter-event-app.md.',
          ),
        ),
        ListTile(
          leading: const Icon(Icons.cloud_outlined),
          title: const Text('API'),
          subtitle: Text(state.config.apiBaseUrl),
        ),
      ],
    );
  }
}
