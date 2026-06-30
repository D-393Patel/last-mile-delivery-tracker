import { AppError, errorResponse } from "@/lib/errors";
import { processNotificationOutbox } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new AppError("Invalid worker credentials.", 401, "UNAUTHENTICATED");
    }
    return Response.json({ result: await processNotificationOutbox() });
  } catch (error) {
    return errorResponse(error);
  }
}
