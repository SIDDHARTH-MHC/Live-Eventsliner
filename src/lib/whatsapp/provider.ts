/** WhatsApp BSP adapter — Gupshup / Interakt ready. Mock when keys unset. */

export interface WhatsAppProvider {
  sendTemplate(params: {
    to: string;
    templateId: string;
    params: string[];
  }): Promise<{ providerId: string }>;
}

export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  async sendTemplate(params: { to: string; templateId: string; params: string[] }) {
    console.log(
      JSON.stringify({
        type: "whatsapp",
        to: params.to,
        templateId: params.templateId,
        params: params.params,
      }),
    );
    return { providerId: `wa_mock_${Date.now()}` };
  }
}

export class GupshupWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private apiKey: string,
    private source: string,
  ) {}

  async sendTemplate(params: { to: string; templateId: string; params: string[] }) {
    const phone = params.to.replace(/\D/g, "");
    const res = await fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
      method: "POST",
      headers: {
        apikey: this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        channel: "whatsapp",
        source: this.source,
        destination: phone,
        "src.name": "Eventsliner Live",
        template: JSON.stringify({
          id: params.templateId,
          params: params.params,
        }),
      }),
    });
    if (!res.ok) throw new Error(`GUPSHUP_WA_FAILED:${await res.text()}`);
    const data = (await res.json()) as { messageId?: string };
    return { providerId: data.messageId ?? `gupshup_${Date.now()}` };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const apiKey = process.env.GUPSHUP_API_KEY ?? process.env.WHATSAPP_BSP_API_KEY;
  const source = process.env.GUPSHUP_SOURCE_NUMBER ?? process.env.WHATSAPP_SOURCE_NUMBER;
  if (apiKey && source) {
    return new GupshupWhatsAppProvider(apiKey, source);
  }
  return new ConsoleWhatsAppProvider();
}
