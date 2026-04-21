import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
import { Body } from "@react-email/body";
import { Container } from "@react-email/container";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { Link } from "@react-email/link";
import { Hr } from "@react-email/hr";
import * as React from "react";

interface GiftItem {
  name: string;
  partner: string;
  description: string;
  price: string;
  affiliate_url: string;
}

interface ReminderEmailProps {
  firstName: string;
  contactFirstName: string;
  eventType: "birthday" | "anniversary" | "custom";
  eventLabel?: string;
  daysBefore: number;
  eventDateFormatted: string;
  gifts: GiftItem[];
  suppressGifts: boolean;
  lastYearLine?: string | null;
  contactId: string;
  userId: string;
}

const brandOrange = "#d05a32";
const brandOrangeDark = "#ad4628";
const brandOrangeLight = "#e47243";

function eventTypeLabel(eventType: string): string {
  return { birthday: "birthday", anniversary: "anniversary", custom: "event" }[eventType] || "event";
}

export default function ReminderEmail({
  firstName = "there",
  contactFirstName = "Someone",
  eventType = "birthday",
  daysBefore = 7,
  eventDateFormatted = "May 15",
  gifts = [],
  suppressGifts = false,
  lastYearLine = null,
  contactId = "",
  userId = "",
}: ReminderEmailProps) {
  const typeLabel = eventTypeLabel(eventType);
  const isLastMinute = daysBefore <= 2;

  const headline =
    daysBefore === 1
      ? `${contactFirstName}'s ${typeLabel} is tomorrow`
      : `${contactFirstName}'s ${typeLabel} is in ${daysBefore} days`;

  const intro =
    daysBefore === 1
      ? `Last chance — ${contactFirstName}'s ${typeLabel} is tomorrow, ${eventDateFormatted}. We've put together your best same-day options below.`
      : `${contactFirstName}'s ${typeLabel} is coming up on ${eventDateFormatted} — ${daysBefore} days from now. Here are a few gift ideas they'd love, ready to order in one click.`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "16px 0" }}>
        <Container style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}>
          {/* Header — compact */}
          <Section style={{ background: `linear-gradient(135deg, ${brandOrange}, ${brandOrangeDark})`, borderRadius: "12px 12px 0 0", padding: "20px 32px", textAlign: "center" as const }}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto 6px" }}>
              <tbody>
                <tr>
                  <td style={{ width: "22px", height: "22px", background: "rgba(255,255,255,0.2)", borderRadius: "6px", textAlign: "center" as const, fontSize: "12px", verticalAlign: "middle" }}>★</td>
                  <td style={{ paddingLeft: "6px", color: "rgba(255,255,255,0.9)", fontSize: "12px", fontWeight: 600, verticalAlign: "middle" }}>Daysight</td>
                </tr>
              </tbody>
            </table>
            <Text style={{ color: "white", fontSize: "18px", fontWeight: 700, lineHeight: "1.3", margin: 0 }}>{headline}</Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: "white", padding: "24px 32px", borderRadius: "0 0 12px 12px" }}>
            <Text style={{ color: "#374151", fontSize: "14px", margin: "0 0 12px 0" }}>Hi {firstName},</Text>
            <Text style={{ color: "#374151", fontSize: "14px", margin: "0 0 16px 0", lineHeight: "1.5" }}>{intro}</Text>

            {/* Last year's suggestions */}
            {lastYearLine && !suppressGifts && (
              <Section style={{ background: "#f9fafb", borderLeft: `3px solid ${brandOrange}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: "14px" }}>
                <Text style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.5", margin: 0 }}>{lastYearLine}</Text>
              </Section>
            )}

            {/* Suppressed gifts: warm message */}
            {suppressGifts && (
              <Section style={{ background: "#fdf5f0", border: "1px solid #f9cfb8", borderRadius: "10px", padding: "16px 20px", marginBottom: "16px", textAlign: "center" as const }}>
                <Text style={{ color: "#374151", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
                  Just a heads-up so this date doesn&apos;t slip by. We&apos;re thinking of you. ❤️
                </Text>
              </Section>
            )}

            {/* Gift suggestions (only when not suppressed) */}
            {!suppressGifts && (
              <>
                {/* Last-minute banner */}
                {isLastMinute && (
                  <Section style={{ background: "#fff7ed", border: "2px solid #fed7aa", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px" }}>
                    <Text style={{ color: "#c2410c", fontWeight: 700, fontSize: "13px", margin: "0 0 3px 0" }}>You still have options.</Text>
                    <Text style={{ color: "#ea580c", fontSize: "12px", margin: "0 0 10px 0" }}>Every gift below ships today or delivers instantly.</Text>
                    <Link href="https://www.amazon.com/gift-cards" style={{ display: "block", background: "#c2410c", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "13px", padding: "10px 16px", borderRadius: "8px", textAlign: "center" as const }}>
                      Send an e-gift card right now →
                    </Link>
                  </Section>
                )}

                {/* 3-day urgency banner */}
                {daysBefore === 3 && (
                  <Section style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" }}>
                    <Text style={{ color: "#dc2626", fontWeight: 600, fontSize: "12px", margin: "0 0 2px 0" }}>Time is running short!</Text>
                    <Text style={{ color: "#ef4444", fontSize: "11px", margin: 0 }}>Only 3 days left — order soon to ensure delivery in time.</Text>
                  </Section>
                )}

                {/* Gift Ideas header */}
                <Text style={{ color: "#111827", fontSize: "12px", fontWeight: 600, margin: "0 0 10px 0", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Gift Ideas</Text>

                {/* Gift cards — stacked layout for mobile compatibility */}
                {gifts.map((gift, i) => (
                  <Section key={i} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px 16px", marginBottom: "8px", background: "#fafafa" }}>
                    {/* Top row: icon + name/description */}
                    <table cellPadding="0" cellSpacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td style={{ width: "36px", verticalAlign: "top", paddingTop: "2px" }}>
                            <div style={{ width: "36px", height: "36px", background: "#fdf5f0", borderRadius: "8px", color: brandOrange, fontWeight: 700, fontSize: "14px", textAlign: "center" as const, lineHeight: "36px" }}>
                              {gift.partner?.charAt(0) || "G"}
                            </div>
                          </td>
                          <td style={{ paddingLeft: "12px", verticalAlign: "top" }}>
                            <Text style={{ fontWeight: 600, color: "#111827", fontSize: "14px", margin: 0 }}>{gift.name}</Text>
                            <Text style={{ color: "#6b7280", fontSize: "12px", margin: "2px 0 0 0", lineHeight: "1.4" }}>{gift.description}</Text>
                            <Text style={{ color: brandOrangeLight, fontSize: "12px", fontWeight: 600, margin: "2px 0 0 0" }}>{gift.price}</Text>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {/* Button on its own row — full width, mobile-friendly */}
                    <Link href={gift.affiliate_url || "#"} style={{ display: "inline-block", background: brandOrange, color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 600, padding: "9px 20px", borderRadius: "8px", textAlign: "center" as const, marginTop: "10px" }}>
                      Buy Now →
                    </Link>
                  </Section>
                ))}

                {/* Gift card fallback */}
                <Section style={{ background: "#fdf5f0", border: "1px solid #f9cfb8", borderRadius: "10px", padding: "14px 18px", textAlign: "center" as const, marginBottom: "16px", marginTop: "4px" }}>
                  <Text style={{ color: "#6b7280", fontSize: "12px", margin: "0 0 8px 0" }}>Not sure? Can&apos;t go wrong with this:</Text>
                  <Link href="https://www.amazon.com/gift-cards" style={{ display: "inline-block", background: "white", border: `2px solid ${brandOrange}`, color: brandOrange, textDecoration: "none", fontWeight: 700, fontSize: "13px", padding: "8px 20px", borderRadius: "8px" }}>
                    Send an Amazon Gift Card
                  </Link>
                </Section>
              </>
            )}

            {/* Footer */}
            <Hr style={{ borderColor: "#f3f4f6", margin: "0 0 14px 0" }} />
            <Section style={{ textAlign: "center" as const }}>
              <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto 10px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "0 8px" }}><Link href={`https://daysight.xyz/contacts/${contactId}`} style={{ color: brandOrangeLight, textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>Edit contact preferences</Link></td>
                    <td style={{ padding: "0 8px" }}><Link href="https://daysight.xyz/settings" style={{ color: brandOrangeLight, textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>Reminder settings</Link></td>
                  </tr>
                </tbody>
              </table>
              <Text style={{ color: "#9ca3af", fontSize: "10px", lineHeight: "1.5", margin: 0 }}>
                Daysight · <Link href={`https://daysight.xyz/unsubscribe?token=${userId}`} style={{ color: "#9ca3af" }}>Unsubscribe</Link> · <Link href="https://daysight.xyz/privacy" style={{ color: "#9ca3af" }}>Privacy Policy</Link>
                <br />
                You&apos;re getting this because you set up reminders for {contactFirstName}.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Helper to generate the subject line (used by the cron route). */
export function reminderSubject(contactFirstName: string, eventType: string, daysBefore: number): string {
  const label = eventTypeLabel(eventType);
  if (daysBefore === 1) return `Last chance — ${contactFirstName}'s ${label} is tomorrow`;
  return `${contactFirstName}'s ${label} is in ${daysBefore} days — here's what to get`;
}
