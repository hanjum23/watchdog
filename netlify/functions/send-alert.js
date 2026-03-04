export default async (request) => {
  // Only allow POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { recipients, siteName, siteUrl, status, latency } = await request.json();

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.SMTP2GO_API_KEY;
    const fromEmail = process.env.ALERT_FROM_EMAIL || "h.anjum@asta-uk.com";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "SMTP2GO API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isTest = status === "TEST";
    const isDown = status === "DOWN";
    const subject = isTest
      ? `🔵 [Asta Monitor] Test alert — configuration verified`
      : isDown
        ? `🔴 [Asta Monitor] ${siteName} is OFFLINE`
        : `🟢 [Asta Monitor] ${siteName} has recovered`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7fa; padding: 24px;">
        <div style="background: #1A3A5C; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Asta Service Monitor</h1>
          <p style="color: #00AEEF; margin: 4px 0 0; font-size: 12px; letter-spacing: 2px;">AUTOMATED ALERT</p>
        </div>
        <div style="background: #ffffff; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #dde3ea;">
          <div style="background: ${isDown ? "#fff0f0" : "#f0fff8"}; border-left: 4px solid ${isDown ? "#E04040" : "#2ECC8A"}; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <h2 style="margin: 0; color: ${isDown ? "#E04040" : "#2ECC8A"}; font-size: 18px;">
              ${isDown ? "🔴 Service Offline" : "🟢 Service Recovered"}
            </h2>
            <p style="margin: 8px 0 0; color: #555; font-size: 14px;">
              ${isTest
                ? `This is a test alert from Asta Watchdog. Your email alert configuration is working correctly.`
                : isDown
                  ? `${siteName} is currently unreachable and may be down.`
                  : `${siteName} is back online and responding normally.`
              }
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888; width: 140px;">Service</td>
              <td style="padding: 10px 0; color: #1A3A5C; font-weight: 600;">${siteName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">URL</td>
              <td style="padding: 10px 0;"><a href="${siteUrl}" style="color: #00AEEF;">${siteUrl}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Status</td>
              <td style="padding: 10px 0; color: ${isDown ? "#E04040" : "#2ECC8A"}; font-weight: 600;">${status}</td>
            </tr>
            ${latency ? `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Response Time</td>
              <td style="padding: 10px 0; color: #1A3A5C;">${latency}ms</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 10px 0; color: #888;">Time</td>
              <td style="padding: 10px 0; color: #1A3A5C;">${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })} (London)</td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #aaa;">
            Asta UK · Service Monitoring · Lloyd's Managing Agent<br>
            This is an automated alert from Asta Watchdog. Do not reply to this email.
          </div>
        </div>
      </div>
    `;

    const toList = recipients.map((email) => ({ email }));

    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: toList,
        sender: `Asta Monitor <${fromEmail}>`,
        subject,
        html_body: htmlBody,
      }),
    });

    const result = await response.json();

    if (result.data?.succeeded > 0) {
      return new Response(JSON.stringify({ success: true, sent: result.data.succeeded }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Failed to send", detail: result }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/send-alert" };
