export interface SendContactEmailInput {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(input: SendContactEmailInput): Promise<void>;
}