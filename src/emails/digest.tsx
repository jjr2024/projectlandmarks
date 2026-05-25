import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
import { Body } from "@react-email/body";
import { Container } from "@react-email/container";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { Link } from "@react-email/link";
import { Hr } from "@react-email/hr";
import * as React from "react";

interface DigestEvent {
  contactName: string;
  eventType: "birthday" | "anniversary" | "custom";
  eventLabel?: string;
  dateFormatted: string;
  daysUntil: number;
  contactId: string;
}

interface DigestEmailProps {
  firstName: string;
  monthName: string;
  events: DigestEvent[];
  userId: string;
  unsubscribeUrl?: string;
}

const brandOrange = "#d05a32";
const brandOrangeDark = "#ad4628";
const brandOrangeLight = "#e47243";

function eventTypeLabel(eventType: string): string {
  return { birthday: "Birthday", anniversary: "Anniversary", custom: "Event" }[eventType] || "Event";
}

function eventIconUrl(eventType: string): string {
  const slug = { birthday: "birthday", anniversary: "anniversary", custom: "custom" }[eventType] || "custom";
  return `https://daysight.xyz/email/icon-${slug}.png`;
}

function eventBgColor(eventType: string): string {
  return { birthday: "#fef3c7", anniversary: "#ffe4e6", custom: "#f3f4f6" }[eventType] || "#f3f4f6";
}

function eventTextColor(eventType: string): string {
  return { birthday: "#b45309", anniversary: "#be123c", custom: "#6b7280" }[eventType] || "#6b7280";
}

function daysUntilLabel(days: number): string {
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

export default function DigestEmail({
  firstName = "there",
  monthName = "April",
  events = [],
  userId = "",
  unsubscribeUrl,
}: DigestEmailProps) {
  const unsubLink = unsubscribeUrl || "https://daysight.xyz/settings";
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "16px 0" }}>
        <Container style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}>
          {/* Header — compact, matches reminder template */}
          <Section style={{ background: `linear-gradient(135deg, ${brandOrange}, ${brandOrangeDark})`, borderRadius: "12px 12px 0 0", padding: "20px 32px", textAlign: "center" as const }}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto 8px" }}>
              <tbody>
                <tr>
                  <td style={{ width: "32px", height: "32px", verticalAlign: "middle" }}>
                    {/* Daysight logo — hosted PNG (data: URIs are blocked by Gmail) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://daysight.xyz/email/logo-daysight.png"
                      alt="Daysight"
                      width="32"
                      height="32"
                      style={{ display: "block", border: "none", borderRadius: "8px" }}
                    />
                  </td>
                  <td style={{ paddingLeft: "10px", verticalAlign: "middle" }}>
                    <span style={{ color: "#ffffff", fontSize: "18px", fontWeight: 800, letterSpacing: "0.01em", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                      Daysight
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 4px 0" }}>Monthly Planning Digest</Text>
            <Text style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, lineHeight: "1.3", margin: 0 }}>{monthName}&apos;s coming up</Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: "white", padding: "24px 32px", borderRadius: "0 0 12px 12px" }}>
            <Text style={{ color: "#374151", fontSize: "14px", margin: "0 0 12px 0" }}>Hi {firstName},</Text>
            <Text style={{ color: "#374151", fontSize: "14px", margin: "0 0 16px 0", lineHeight: "1.5" }}>
              Here&apos;s a look at everyone who has something special coming up in the next 30 days. You&apos;ve got plenty of time to order with standard shipping — no rush yet.
            </Text>

            {/* Event list */}
            {events.map((evt, i) => (
              <Section key={i} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", marginBottom: "8px", background: "#fafafa" }}>
                <table cellPadding="0" cellSpacing="0" width="100%">
                  <tbody>
                    <tr>
                      <td style={{ width: "36px", verticalAlign: "middle" }}>
                        <table cellPadding="0" cellSpacing="0" style={{ width: "36px", height: "36px" }}>
                          <tbody>
                            <tr>
                              <td
                                align="center"
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "8px",
                                  background: eventBgColor(evt.eventType),
                                  textAlign: "center" as const,
                                  verticalAlign: "middle",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={eventIconUrl(evt.eventType)}
                                  alt={eventTypeLabel(evt.eventType)}
                                  width="18"
                                  height="18"
                                  style={{ display: "inline-block", verticalAlign: "middle", border: "none" }}
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                      <td style={{ paddingLeft: "14px", verticalAlign: "middle" }}>
                        <Text style={{ fontWeight: 600, color: "#111827", fontSize: "14px", margin: 0 }}>{evt.contactName}</Text>
                        <Text style={{ color: "#6b7280", fontSize: "12px", margin: "2px 0 0 0" }}>
                          {eventTypeLabel(evt.eventType)} · {evt.dateFormatted} · <span style={evt.daysUntil <= 7 ? { color: "#dc2626", fontWeight: 600 } : {}}>{daysUntilLabel(evt.daysUntil)}</span>
                        </Text>
                      </td>
                      <td style={{ verticalAlign: "middle", textAlign: "right" as const }}>
                        <Link href={`https://daysight.xyz/contacts/${evt.contactId}`} style={{ background: "#f3f4f6", color: "#374151", textDecoration: "none", fontSize: "12px", fontWeight: 600, padding: "6px 14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            ))}

            {/* Footer */}
            <Hr style={{ borderColor: "#f3f4f6", margin: "14px 0" }} />
            <Section style={{ textAlign: "center" as const }}>
              <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto 10px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "0 8px" }}><Link href="https://daysight.xyz/contacts" style={{ color: brandOrangeLight, textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>Manage contacts</Link></td>
                    <td style={{ padding: "0 8px" }}><Link href="https://daysight.xyz/settings" style={{ color: brandOrangeLight, textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>Turn off digest</Link></td>
                  </tr>
                </tbody>
              </table>
              <Text style={{ color: "#9ca3af", fontSize: "10px", lineHeight: "1.5", margin: 0 }}>
                Daysight · Monthly digest · <Link href={unsubLink} style={{ color: "#9ca3af" }}>Unsubscribe</Link> · <Link href="https://daysight.xyz/privacy" style={{ color: "#9ca3af" }}>Privacy Policy</Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function digestSubject(monthName: string): string {
  return `Your ${monthName} reminders — plan ahead this month`;
}
