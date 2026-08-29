import { createCheckout, completeMockPayment } from "@/lib/payments/checkout";
import { withApiContext, json, errorJson } from "@/lib/api/response";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { id } = await params;

    try {
      const checkout = await createCheckout(id);
      return json({ checkout });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout failed";
      if (message === "NOT_PENDING_PAYMENT") {
        return errorJson(400, "INVALID_STATE", "Registration is not awaiting payment");
      }
      if (message === "ORDER_EXPIRED") {
        return errorJson(400, "ORDER_EXPIRED", "Your reservation has expired. Please register again.");
      }
      return errorJson(400, "CHECKOUT_ERROR", message);
    }
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { id } = await params;
    const body = (await request.json()) as { mockComplete?: boolean };

    if (!body.mockComplete) {
      return errorJson(400, "VALIDATION", "Unsupported action");
    }

    try {
      const result = await completeMockPayment(id);
      return json({
        registration: {
          id: result.registration?.id,
          status: result.registration?.status,
        },
        alreadyProcessed: result.alreadyProcessed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed";
      return errorJson(400, "PAYMENT_ERROR", message);
    }
  });
}
