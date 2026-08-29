import { handleRazorpayWebhook } from "@/lib/payments/webhook";
import { withApiContext, json, errorJson } from "@/lib/api/response";

export async function POST(request: Request) {
  return withApiContext(request, async () => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    const result = await handleRazorpayWebhook(rawBody, signature);
    if (!result.ok) {
      return errorJson(400, "WEBHOOK_ERROR", result.message);
    }

    return json({ received: true, message: result.message });
  });
}
