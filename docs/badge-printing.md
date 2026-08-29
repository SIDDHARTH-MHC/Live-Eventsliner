# Badge printing (QZ Tray stub)

Phase 10 documents printer integration hooks. Full QZ Tray setup is organizer-side.

## PDF badge

Download HTML badge (print to PDF):

```
GET /api/v1/attendees/:attendeeId/badge
```

## QZ Tray config stub

Organizers can configure QZ Tray to print ZPL from the badge API. Set in org settings (future):

```json
{
  "qzTrayEnabled": false,
  "printerName": "Zebra-ZD420",
  "zplTemplate": "^XA^FO50,50^BQN,2,5^FD{{qrPayload}}^FS^XZ"
}
```

## NFC/RFID

Schema field `credentials.nfc_uid` and `attendees.nfc_uid` reserved for hardware partners. No in-app NFC reading in MVP.

## Offline check-in

Check-in PWA queues scans locally with `offline_id` UUID. On reconnect:

```
POST /api/v1/events/:eventId/check-ins/batch
{ "checkIns": [{ "rawPayload": "EL:...", "offlineId": "uuid", "stationId": "..." }] }
```
