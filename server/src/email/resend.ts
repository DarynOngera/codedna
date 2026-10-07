import type { EmailProvider, SendContactEmailInput } from './provider.ts';

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Resend provider using the native fetch API — no SDK dependency.
 * A different provider can be swapped in by implementing EmailProvider.
 */
export class ResendProvider implements EmailProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(input: SendContactEmailInput): Promise<void> {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        reply_to: input.replyTo,
        subject: input.subject,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      throw new Error(`Resend request failed with status ${status}`);
    }
  }
}