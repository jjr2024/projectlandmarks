import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";
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
}

const brandOrange = "#d05a32";
const brandOrangeDark = "#ad4628";
const brandOrangeLight = "#e47243";

function eventTypeLabel(eventType: string): string {
  return { birthday: "Birthday", anniversary: "Anniversary", custom: "Event" }[eventType] || "Event";
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
}: DigestEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          {/* Header */}
          <Section style={{ background: `linear-gradient(135deg, ${brandOrange}, ${brandOrangeDark})`, borderRadius: "16px 16px 0 0", padding: "28px 40px", textAlign: "center" as const }}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", fontWeight: 500, margin: "0 0 4px 0" }}>Monthly Planning Digest</Text>
            <Text style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>{monthName}&apos;s coming up</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", margin: "6px 0 0 0" }}>Here&apos;s everyone with an event this month.</Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: "white", padding: "28px 40px", borderRadius: "0 0 16px 16px" }}>
            <Text style={{ color: "#374151", fontSize: "15px", margin: "0 0 20px 0" }}>Hi {firstName},</Text>
            <Text style={{ color: "#374151", fontSize: "14px", margin: "0 0 24px 0", lineHeight: "1.6" }}>
              Here&apos;s a look at everyone who has something special coming up this month. You&apos;ve got plenty of time to order with standard shipping — no rush yet.
            </Text>

            {/* Event list */}
            {events.map((evt, i) => (
              <Section key={i} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px 18px", marginBottom: "10px", background: "#fafafa" }}>
                <table cellPadding="0" cellSpacing="0" width="100%">
                  <tbody>
                    <tr>
                      <td style={{ width: "36px", verticalAlign: "middle" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: eventBgColor(evt.eventType), color: eventTextColor(evt.eventType), textAlign: "center" as const, lineHeight: "36px", fontSize: "16px" }}>
                          {evt.eventType === "birthday" ? "🎂" : evt.eventType === "anniversary" ? "❤️" : "📅"}
                        </div>
                      </td>
                      <td style={{ paddingLeft: "14px", verticalAlign: "middle" }}>
                        <Text style={{ fontWeight: 600, color: "#111827", fontSize: "14px", margin: 0 }}>{evt.contactName}</Text>
                        <Text style={{ color: "#6b7280", fontSize: "12px", margin: "2px 0 0 0" }}>
                          {eventTypeLabel(evt.eventType)} · {evt.dateFormatted} · <span style={evt.daysUntil <= 7 ? { color: "#dc2626", fontWeight: 600 } : {}}>{daysUntilLabel(evt.daysUntil)}</span>
                        </Text>
                      </td>
                      <td style={{ verticalAlign: "middle", textAlign: "right" as const }}>
                        <Link href={`https://daysight.xyz/contacts/${evt.contactId}`} style={{ background: "#f3f4f6", color: "#374151", textDecoration: "none", fontSize: "12px", fontWeight: 600, padding: "6px 14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                          Shop →
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            ))}

            {/* Footer */}
            <Hr style={{ borderColor: "#f3f4f6", margin: "20px 0" }} />
            <Section style={{ textAlign: "center" as const }}>
              <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto 10px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "0 10px" }}><Link href="https://daysight.xyz/contacts" style={{ color: brandOrangeLight, textDecoration: "none", fontSize: "13px", fontWeight: 500 }}>Manage contacts</Link></td>
                    <td style={{ padding: "0 10px" }}><Link href="https://daysight.xyz/settings" style={{ color: brandOrangeLight, textDecoration: "none", fontSize: "13px", fontWeight: 500 }}>Turn off digest</Link></td>
                  </tr>
                </tbody>
              </table>
              <Text style={{ color: "#9ca3af", fontSize: "11px", margin: 0 }}>
                Daysight · Monthly digest · <Link href={`https://daysight.xyz/unsubscribe?token=${userId}`} style={{ color: "#9ca3af" }}>Unsubscribe</Link>
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
