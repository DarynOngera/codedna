export interface Contact {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type FieldName = keyof Contact;
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ValidationResult =
  | { ok: true; value: Contact }
  | { ok: false; errors: FieldErrors };

export const LIMITS = {
  nameMax: 120,
  emailMax: 254,
  subjectMax: 200,
  messageMin: 10,
  messageMax: 5000,
} as const;

const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

/** Remove control characters (keeping \n as line breaks). */
export function stripControl(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function sanitize(value: string): string {
  return stripControl(value).trim();
}

export function validateContact(input: unknown): ValidationResult {
  const errors: FieldErrors = {};

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    errors.name = 'Invalid submission.';
    return { ok: false, errors };
  }

  const record = input as Record<string, unknown>;
  const raw = (key: string): string => (typeof record[key] === 'string' ? (record[key] as string) : '');
  const { nameMax, emailMax, subjectMax, messageMin, messageMax } = LIMITS;

  const name = sanitize(raw('name'));
  if (name.length === 0) errors.name = 'Please enter your name.';
  else if (name.length > nameMax) errors.name = `Name must be ${nameMax} characters or fewer.`;

  const email = sanitize(raw('email'));
  if (email.length === 0) errors.email = 'Please enter your email.';
  else if (email.length > emailMax) errors.email = `Email must be ${emailMax} characters or fewer.`;
  else if (!EMAIL_RE.test(email)) errors.email = 'That email address does not look valid.';

  const subject = sanitize(raw('subject'));
  if (subject.length === 0) errors.subject = 'Please enter a subject.';
  else if (subject.length > subjectMax)
    errors.subject = `Subject must be ${subjectMax} characters or fewer.`;

  const message = sanitize(raw('message'));
  if (message.length === 0) errors.message = 'Please enter a message.';
  else if (message.length < messageMin)
    errors.message = `Message should be at least ${messageMin} characters.`;
  else if (message.length > messageMax)
    errors.message = `Message must be ${messageMax} characters or fewer.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, value: { name, email, subject, message } };
}