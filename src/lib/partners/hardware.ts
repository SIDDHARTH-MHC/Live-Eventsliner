/**
 * Phase 20 — Partner hardware integration contracts (integrate-only).
 * Eventsliner never builds printers, turnstiles, NFC writers, FR, or Aadhaar.
 */

export type BadgePrintPayload = {
  format: "html" | "pdf" | "zpl";
  attendeeId: string;
  publicId: string;
  displayName: string;
  ticketType: string;
  eventTitle: string;
  /** QZ Tray / Zebra raw ZPL when format=zpl */
  zpl?: string;
  html?: string;
};

export type NfcEncodeRequest = {
  attendeeId: string;
  publicId: string;
  /** Venue vendor writes this UID back via webhook */
  expectedNfcUid?: string;
};

export type TurnstileAdmitRequest = {
  eventId: string;
  publicId: string;
  stationId?: string;
  offlineId?: string;
};

export type TurnstileAdmitResult = {
  result: "admitted" | "already" | "denied" | "revoked";
  attendeeName?: string;
  message: string;
};

export type IdentityVerifyRequest = {
  /** Opt-in enterprise only — partner (IDfy / HyperVerge), never in-house */
  provider: "idfy" | "hyperverge";
  attendeeId: string;
  purpose: "kyc" | "age_gate";
};

export type IdentityVerifyResult = {
  status: "not_configured" | "queued" | "approved" | "rejected";
  providerRef?: string;
  message: string;
};

export interface BadgePrintPartner {
  name: string;
  buildPayload(input: Omit<BadgePrintPayload, "format"> & { format?: BadgePrintPayload["format"] }): Promise<BadgePrintPayload>;
}

export interface NfcPartner {
  name: string;
  /** Returns instructions + payload for venue encoding; does not write NFC itself */
  prepareEncode(req: NfcEncodeRequest): Promise<{ instructions: string; publicId: string }>;
  recordUid(attendeeId: string, nfcUid: string): Promise<void>;
}

export interface TurnstilePartner {
  name: string;
  /** Same contract as QR check-in — partners poll or push */
  admit(req: TurnstileAdmitRequest): Promise<TurnstileAdmitResult>;
}

export interface IdentityPartner {
  name: string;
  verify(req: IdentityVerifyRequest): Promise<IdentityVerifyResult>;
}

/** QZ Tray + Zebra / Brother — software payload only */
export class QzTrayBadgePartner implements BadgePrintPartner {
  name = "qz_tray_zebra";

  async buildPayload(
    input: Omit<BadgePrintPayload, "format"> & { format?: BadgePrintPayload["format"] },
  ): Promise<BadgePrintPayload> {
    const format = input.format ?? "html";
    const display = input.displayName.slice(0, 32);
    const zpl = `^XA^FO50,50^A0N,40,40^FD${display}^FS^FO50,120^BQN,2,6^FDQA,${input.publicId}^FS^XZ`;
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px">
      <h1>${escapeHtml(input.eventTitle)}</h1>
      <h2>${escapeHtml(display)}</h2>
      <p>${escapeHtml(input.ticketType)}</p>
      <p data-public-id="${escapeHtml(input.publicId)}">ID: ${escapeHtml(input.publicId.slice(0, 8))}…</p>
    </body></html>`;

    return {
      format,
      attendeeId: input.attendeeId,
      publicId: input.publicId,
      displayName: input.displayName,
      ticketType: input.ticketType,
      eventTitle: input.eventTitle,
      zpl: format === "zpl" ? zpl : undefined,
      html: format !== "zpl" ? html : undefined,
    };
  }
}

/** HID / Impinj venue vendors — encode same gate credential */
export class VenueNfcPartner implements NfcPartner {
  name = "venue_nfc";

  async prepareEncode(req: NfcEncodeRequest) {
    return {
      instructions:
        "Encode attendee public_id to NFC tag via venue HID/Impinj writer. POST nfc_uid to /api/v1/partners/nfc/uid when done.",
      publicId: req.publicId,
    };
  }

  async recordUid(attendeeId: string, nfcUid: string) {
    const { db } = await import("@/lib/db");
    await db.attendee.update({
      where: { id: attendeeId },
      data: { nfcUid },
    });
  }
}

/** Turnstile vendors use the same check-in API */
export class TurnstileAdapterPartner implements TurnstilePartner {
  name = "turnstile_checkin_api";

  async admit(req: TurnstileAdmitRequest): Promise<TurnstileAdmitResult> {
    const { processCheckIn } = await import("@/lib/checkin/service");
    try {
      const result = await processCheckIn({
        eventId: req.eventId,
        publicId: req.publicId,
        stationId: req.stationId ?? "turnstile",
        offlineId: req.offlineId,
        isManual: false,
      });
      const mapped: TurnstileAdmitResult["result"] =
        result.result === "ok"
          ? "admitted"
          : result.result === "already"
            ? "already"
            : result.result === "revoked"
              ? "revoked"
              : "denied";
      const name = result.attendee
        ? `${result.attendee.firstName} ${result.attendee.lastName}`
        : undefined;
      return {
        result: mapped,
        attendeeName: name,
        message: result.message,
      };
    } catch (e) {
      return {
        result: "denied",
        message: e instanceof Error ? e.message : "admit_failed",
      };
    }
  }
}

/** IDfy / HyperVerge — never call without enterprise contract + legal review */
export class OptInIdentityPartner implements IdentityPartner {
  name = "identity_opt_in";

  async verify(req: IdentityVerifyRequest): Promise<IdentityVerifyResult> {
    const configured =
      process.env.IDFY_API_KEY || process.env.HYPERVERGE_API_KEY;
    if (!configured) {
      return {
        status: "not_configured",
        message:
          "Identity verification partners are integrate-only. Set IDFY_API_KEY or HYPERVERGE_API_KEY after legal review. Do not build Aadhaar/OVSE or facial recognition in-house.",
      };
    }
    return {
      status: "queued",
      providerRef: `${req.provider}_${req.attendeeId}_${Date.now()}`,
      message: `Queued ${req.purpose} verification via ${req.provider} (stub — wire partner API per contract)`,
    };
  }
}

export function getBadgePrintPartner(): BadgePrintPartner {
  return new QzTrayBadgePartner();
}

export function getNfcPartner(): NfcPartner {
  return new VenueNfcPartner();
}

export function getTurnstilePartner(): TurnstilePartner {
  return new TurnstileAdapterPartner();
}

export function getIdentityPartner(): IdentityPartner {
  return new OptInIdentityPartner();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
