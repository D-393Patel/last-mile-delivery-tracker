import { requireSession } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";
import { buildQuote } from "@/lib/pricing";
import { quoteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    await requireSession();
    const input = quoteSchema.parse(await request.json());
    const quote = await buildQuote(input);
    return Response.json({
      quote: {
        volumetricWeightKg: quote.volumetricWeightKg,
        billableWeightKg: quote.billableWeightKg,
        baseCharge: quote.baseCharge,
        codSurcharge: quote.codSurcharge,
        totalCharge: quote.totalCharge,
        currency: quote.currency,
        formula: quote.formula,
        pickupZone: quote.pickupArea.zone.name,
        dropZone: quote.dropArea.zone.name,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
