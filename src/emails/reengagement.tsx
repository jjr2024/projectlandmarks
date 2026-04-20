import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
import { Body } from "@react-email/body";
import { Container } from "@react-email/container";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { Link } from "@react-email/link";
import { Hr } from "@react-email/hr";
import * as React from "react";

interface ReengagementEmailProps {
  firstName: string;
  variant: "import_nudge" | "sample_reminder" | "concierge_add";
  userId: string;
}

const brandOrange = "#d05a32";
const brandOrangeDark = "#ad4628";

const VARIANTS = {
  import_nudge: {
    day: 3,
    subject: (name: string) => `${name}, add your first birthday in 60 seconds`,
    headline: "Never miss a birthday again",
    body: (name: string) =>
      `Hi ${name},\n\nYou signed up for Daysight a few days ago — great call. But right now your account is empty, which means we can't help you yet.\n\nAdding your first contact takes about 60 seconds: a name, a date, and optionally a note about what they like. That's it.\n\nOnce you do, we'll send you a reminder before their next birthday with a handful of curated gift ideas you can order in one click. No more last-minute gas station flowers.`,
    ctaText: "Add your first contact →",
    ctaUrl: "https://daysight.xyz/contacts",
  },
  sample_reminder: {
    day: 10,
    subject: () => "Here's what a Daysight reminder actually looks like",
    headline: "This is what you'll get",
    body: (name: string) =>
      `Hi ${name},\n\nWe noticed you haven't added anyone to Daysight yet. Fair enough — maybe you weren't sure what to expect.\n\nBelow is an example of the reminder email you'd receive a week before a friend's birthday. It includes a few curated gift ideas based on what you tell us they like, with one-click ordering. No scrolling through endless product pages.\n\nThe whole point is to make you the person who always remembers — without any effort on your part.`,
    ctaText: "Try it — add someone now →",
    ctaUrl: "https://daysight.xyz/contacts",
    showSampleReminder: true,
  },
  concierge_add: {
    day: 30,
    subject: () => "One last thing — let us add your first contact for you",
    headline: "Let us set it up for you",
    body: (name: string) =>
      `Hi ${name},\n\nWe get it — life is busy, and setting up yet another app isn't always at the top of the list.\n\nSo here's an easy way to try Daysight out: just hit reply to this email and type a person's name, the event type (birthday, anniversary, etc.), and the date. Our team will add them to your account so you can see how it works.\n\nThis is just to help you get started — once you see your first reminder, you'll have a feel for whether Daysight is useful for you. No pressure either way.`,
    ctaText: "Just hit reply — we'll take it from here",
    ctaUrl: null as string | null,
    isReplyAction: true,
  },
};

export default function ReengagementEmail({
  firstName = "there",
  variant = "import_nudge",
  userId = "",
}: ReengagementEmailProps) {
  const v = VARIANTS[variant];
  const bodyParagraphs = v.body(firstName).split("\n\n");

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          {/* Header */}
          <Section style={{ background: `linear-gradient(135deg, ${brandOrange}, ${brandOrangeDark})`, borderRadius: "16px 16px 0 0", padding: "28px 40px", textAlign: "center" as const }}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto 8px" }}>
              <tbody>
                <tr>
                  <td style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.2)", borderRadius: "8px", textAlign: "center" as const, fontSize: "14px", verticalAlign: "middle" }}>★</td>
                  <td style={{ paddingLeft: "8px", color: "rgba(255,255,255,0.9)", fontSize: "14px", fontWeight: 600, verticalAlign: "middle" }}>Daysight</td>
                </tr>
              </tbody>
            </table>
            <Text style={{ color: "white", fontSize: "22px", fontWeight: 700, lineHeight: "1.3", margin: 0 }}>{v.headline}</Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: "white", padding: "32px 40px", borderRadius: "0 0 16px 16px" }}>
            {bodyParagraphs.map((para, i) => (
              <Text key={i} style={{ color: "#374151", fontSize: "15px", margin: "0 0 18px 0", lineHeight: "1.6" }}>{para}</Text>
            ))}

            {/* Sample reminder inline (D+10 only) */}
            {"showSampleReminder" in v && v.showSampleReminder && (
              <Section style={{ border: "2px solid #e5e7eb", borderRadius: "16px", padding: "24px", margin: "20px 0 24px", background: "#fafafa" }}>
                <Text style={{ textAlign: "center" as const, color: "#9ca3af", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 14px 0" }}>Sample Reminder</Text>
                <Section style={{ background: `linear-gradient(135deg, ${brandOrange}, ${brandOrangeDark})`, borderRadius: "12px", padding: "18px 24px", textAlign: "center" as const, marginBottom: "16px" }}>
                  <Text style={{ color: "white", fontSize: "17px", fontWeight: 700, margin: 0 }}>Sarah&apos;s birthday is in 7 days</Text>
                </Section>
                {/* Sample gift items */}
                <Section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 14px", background: "white", marginBottom: "8px" }}>
                  <table cellPadding="0" cellSpacing="0" width="100%">
                    <tbody>
                      <tr>
                        <td style={{ width: "36px", verticalAlign: "middle" }}>
                          <div style={{ width: "36px", height: "36px", background: "#fdf5f0", borderRadius: "8px", color: brandOrange, fontWeight: 700, fontSize: "13px", textAlign: "center" as const, lineHeight: "36px" }}>B</div>
                        </td>
                        <td style={{ paddingLeft: "12px", verticalAlign: "middle" }}>
                          <Text style={{ fontWeight: 600, color: "#111827", fontSize: "13px", margin: 0 }}>Spring Bouquet</Text>
                          <Text style={{ color: "#6b7280", fontSize: "11px", margin: 0 }}>The Bouqs Co. · $45</Text>
                        </td>
                        <td style={{ verticalAlign: "middle", textAlign: "right" as const }}>
                          <span style={{ background: brandOrange, color: "white", fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "6px" }}>Buy →</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Section>
                <Section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 14px", background: "white" }}>
                  <table cellPadding="0" cellSpacing="0" width="100%">
                    <tbody>
                      <tr>
                        <td style={{ width: "36px", verticalAlign: "middle" }}>
                          <div style={{ width: "36px", height: "36px", background: "#fdf5f0", borderRadius: "8px", color: brandOrange, fontWeight: 700, fontSize: "13px", textAlign: "center" as const, lineHeight: "36px" }}>W</div>
                        </td>
                        <td style={{ paddingLeft: "12px", verticalAlign: "middle" }}>
                          <Text style={{ fontWeight: 600, color: "#111827", fontSize: "13px", margin: 0 }}>Curated Wine Box</Text>
                          <Text style={{ color: "#6b7280", fontSize: "11px", margin: 0 }}>Wine.com · $55</Text>
                        </td>
                        <td style={{ verticalAlign: "middle", textAlign: "right" as const }}>
                          <span style={{ background: brandOrange, color: "white", fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "6px" }}>Buy →</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Section>
                <Text style={{ textAlign: "center" as const, color: "#9ca3af", fontSize: "11px", margin: "12px 0 0 0" }}>One click to order. That&apos;s the whole idea.</Text>
              </Section>
            )}

            {/* CTA button */}
            {v.ctaUrl && (
              <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
                <Link href={v.ctaUrl} style={{ display: "inline-block", background: brandOrange, color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "10px" }}>
                  {v.ctaText}
                </Link>
              </Section>
            )}

            {/* Reply CTA (D+30) */}
            {"isReplyAction" in v && v.isReplyAction && (
              <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
                <Section style={{ background: "#f9fafb", border: "2px dashed #d1d5db", borderRadius: "12px", padding: "20px 24px" }}>
                  <Text style={{ color: "#374151", fontSize: "14px", fontWeight: 600, margin: "0 0 6px 0" }}>{v.ctaText}</Text>
                  <Text style={{ color: "#6b7280", fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
                    For example: <em>&quot;Mom, birthday, June 14&quot;</em> or <em>&quot;Jake, anniversary, October 3, likes hiking gear&quot;</em>
                  </Text>
                </Section>
              </Section>
            )}

            {/* Footer */}
            <Hr style={{ borderColor: "#f3f4f6", margin: "8px 0 20px 0" }} />
            <Section style={{ textAlign: "center" as const }}>
              <Text style={{ color: "#9ca3af", fontSize: "11px", lineHeight: "1.6", margin: 0 }}>
                Daysight · <Link href={`https://daysight.xyz/unsubscribe?token=${userId}`} style={{ color: "#9ca3af" }}>Unsubscribe</Link> · <Link href="https://daysight.xyz/privacy" style={{ color: "#9ca3af" }}>Privacy Policy</Link>
                <br />
                You&apos;re receiving this because you recently signed up for Daysight.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function reengagementSubject(firstName: string, variant: keyof typeof VARIANTS): string {
  return VARIANTS[variant].subject(firstName);
}
