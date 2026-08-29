export interface EmailProvider {
  send(params: { to: string; subject: string; html: string; text?: string }): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(params: { to: string; subject: string; html: string; text?: string }) {
    console.log(
      JSON.stringify({
        type: "email",
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    );
  }
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private from: string) {}

  async send(params: { to: string; subject: string; html: string; text?: string }) {
    const { Resend } = await import("resend");
    const resend = new Resend(this.apiKey);
    const result = await resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Eventsliner Live <noreply@eventsliner.live>";
  if (apiKey) {
    return new ResendEmailProvider(apiKey, from);
  }
  return new ConsoleEmailProvider();
}
