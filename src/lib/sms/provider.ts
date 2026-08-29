export interface SmsProvider {
  sendOtp(params: { phone: string; code: string }): Promise<void>;
}

export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(params: { phone: string; code: string }) {
    console.log(
      JSON.stringify({
        type: "sms_otp",
        phone: params.phone,
        code: params.code,
        message: `Your Eventsliner code is ${params.code}. Valid for 10 minutes.`,
      }),
    );
  }
}

export class Msg91SmsProvider implements SmsProvider {
  constructor(
    private authKey: string,
    private templateId: string,
    private senderId: string,
  ) {}

  async sendOtp(params: { phone: string; code: string }) {
    const phone = params.phone.replace(/\D/g, "");
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: this.authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: this.templateId,
        short_url: "0",
        recipients: [
          {
            mobiles: phone,
            var: params.code,
          },
        ],
        sender: this.senderId,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MSG91 error: ${response.status} ${body}`);
    }
  }
}

export function getSmsProvider(): SmsProvider {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID ?? "EVTLIN";
  if (authKey && templateId) {
    return new Msg91SmsProvider(authKey, templateId, senderId);
  }
  return new ConsoleSmsProvider();
}
