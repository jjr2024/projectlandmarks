import { Resend } from "resend";
import { validateServerEnv } from "@/lib/env";

/**
 * Lazy Resend client — defers instantiation to first use.
 * Prevents build-time crash when RESEND_API_KEY is unset
 * (Next.js evaluates API route modules during static page data collection).
 */
let _instance: Resend | null = null;

export function resend(): Resend {
  if (!_instance) {
    validateServerEnv();
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _instance = new Resend(apiKey);
  }
  return _instance;
}
