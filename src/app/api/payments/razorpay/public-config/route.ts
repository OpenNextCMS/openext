import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { getRazorpayPublicConfig, isRazorpayGatewayConfigured } from '@/lib/payments/razorpayGateway';

/**
 * GET /api/payments/razorpay/public-config
 * Public read of Razorpay Key ID + checkout metadata (no secret).
 * Use this on public pages to open Razorpay Checkout.
 */
export async function GET() {
  try {
    if (!(await isRazorpayGatewayConfigured())) {
      throw new ApiError('Razorpay Payment Gateway is not configured', 404);
    }

    const config = await getRazorpayPublicConfig();
    return apiOk(config);
  } catch (err) {
    return handleApiError(err);
  }
}
