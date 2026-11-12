import "server-only";
import { escapeHtml as e, sendEmail } from "./email";
import { allow } from "./rate-limit";

/*
 * Emails the team (ORDER_NOTIFICATION_EMAIL) when something goes wrong that someone should act on:
 * a payment that doesn't match its order, Paystack refusing to open payments, emails that won't send.
 * Hosting logs are short-lived, so this is how problems get noticed. At most one alert per `kind` an
 * hour, so a bad spell can't flood the inbox. Never throws: an alert failing must not break the caller.
 */

export async function alertTeam(kind: string, subject: string, details: string, send = sendEmail): Promise<boolean> {
  try {
    const to = process.env.ORDER_NOTIFICATION_EMAIL;
    if (!to) return false;
    if (!(await allow("alert", kind, 1, 3600))) return false;
    await send({
      to,
      subject: `Woodspeaks site: ${subject}`,
      html:
        `<div style="font-family:Georgia,serif;color:#2a1712;max-width:560px;margin:0 auto;padding:24px">` +
        `<h1 style="font-size:20px;color:#4a1420;margin:0 0 12px">${e(subject)}</h1>` +
        `<p style="font-size:15px;line-height:1.5;white-space:pre-line">${e(details)}</p>` +
        `<p style="font-size:13px;color:#6b5446">An automatic message from the website. Similar problems are grouped: ` +
        `you get at most one of these an hour.</p></div>`,
      text: `${subject}\n\n${details}\n\nAn automatic message from the website (at most one of these an hour).`,
    });
    return true;
  } catch (error) {
    console.error(`Alert "${kind}" couldn't be sent.`, error);
    return false;
  }
}
