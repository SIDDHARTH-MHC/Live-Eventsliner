import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class EventSummary {
  EventSummary({
    required this.title,
    this.venueName,
    this.city,
    this.startsAt,
    this.description,
  });

  final String title;
  final String? venueName;
  final String? city;
  final String? startsAt;
  final String? description;

  factory EventSummary.fromJson(Map<String, dynamic> json) {
    return EventSummary(
      title: json['title'] as String? ?? 'Event',
      venueName: json['venueName'] as String?,
      city: json['city'] as String?,
      startsAt: json['startsAt'] as String?,
      description: json['description'] as String?,
    );
  }
}

class SessionItem {
  SessionItem({
    required this.id,
    required this.title,
    this.startsAt,
    this.room,
  });

  final String id;
  final String title;
  final String? startsAt;
  final String? room;

  factory SessionItem.fromJson(Map<String, dynamic> json) {
    return SessionItem(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Session',
      startsAt: json['startsAt'] as String?,
      room: json['room'] as String?,
    );
  }
}

class TicketPass {
  TicketPass({
    required this.token,
    required this.displayName,
    this.qrPayload,
    this.ticketType,
  });

  final String token;
  final String displayName;
  final String? qrPayload;
  final String? ticketType;
}

class EventApiClient {
  EventApiClient(this.config, {http.Client? client})
      : _client = client ?? http.Client();

  final AppConfig config;
  final http.Client _client;

  Uri _u(String path) => Uri.parse('${config.apiBaseUrl}$path');

  Future<Map<String, dynamic>> fetchAppConfig() async {
    final res = await _client.get(
      _u('/api/v1/public/events/${config.eventSlug}/app-config'),
    );
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, 'Unable to load app config');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<EventSummary> fetchEvent() async {
    try {
      final cfg = await fetchAppConfig();
      final event = cfg['event'] as Map<String, dynamic>? ?? {};
      final app = cfg['app'] as Map<String, dynamic>? ?? {};
      config.applyRemote(
        displayName: app['displayName'] as String?,
        primaryColor: app['primaryColor'] as String?,
      );
      if (event.isNotEmpty) return EventSummary.fromJson(event);
    } catch (_) {
      /* fall through */
    }

    final res = await _client.get(_u('/api/v1/public/events/${config.eventSlug}'));
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, 'Unable to load event');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final event = body['event'] as Map<String, dynamic>? ?? body;
    return EventSummary.fromJson(event);
  }

  Future<List<SessionItem>> fetchSessions() async {
    final res = await _client.get(
      _u('/api/v1/public/events/${config.eventSlug}/sessions'),
    );
    if (res.statusCode != 200) return [];
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final list = body['sessions'] as List<dynamic>? ?? [];
    return list
        .map((e) => SessionItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TicketPass> fetchTicket(String token) async {
    final res = await _client.get(_u('/api/v1/tickets/$token'));
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, 'Ticket not found');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final attendee = body['attendee'] as Map<String, dynamic>? ?? {};
    final first = attendee['firstName'] as String? ?? '';
    final last = attendee['lastName'] as String? ?? '';
    final name = '$first $last'.trim().isEmpty ? 'Attendee' : '$first $last'.trim();
    return TicketPass(
      token: token,
      displayName: name,
      qrPayload: body['qrPayload'] as String? ??
          body['publicId'] as String? ??
          token,
      ticketType: body['ticketType'] as String? ??
          (body['ticket'] as Map<String, dynamic>?)?['name'] as String?,
    );
  }
}

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

ThemeData buildEventTheme(AppConfig config) {
  final seed = Color(config.primaryColorArgb);
  final scheme = ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.light);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    appBarTheme: AppBarTheme(
      backgroundColor: scheme.surface,
      foregroundColor: scheme.onSurface,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 72,
      indicatorColor: scheme.primaryContainer,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
  );
}
