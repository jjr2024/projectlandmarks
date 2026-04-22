import { Resend } from "resend";

/**
 * Lazy Resend client — defers instantiation to first use.
 * Prevents build-time crash when RESEND_API_KEY is unset
 * (Next.js evaluates API route modules during static page data collection).
 */
let _instance: Resend | null = null;

export function resend(): Resend {
  if (!_instance) {
    _instance = new Resend(process.env.RESEND_API_KEY);
  }
  return _instance;
}
