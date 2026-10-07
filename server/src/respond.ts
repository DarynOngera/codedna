import type { Request, Response } from 'express';

/**
 * Respond to a request per content negotiation:
 *  - JSON clients (the progressive-enhancement fetch) get a JSON payload;
 *  - plain browser form posts get a 303 redirect so the page works with JS off.
 */
export function respond(res: Response, status: number, payload: unknown, htmlPath: string): void {
  const accepts = res.req.accepts(['json', 'html']);
  if (accepts === 'json') {
    res.status(status).json(payload);
    return;
  }
  res.redirect(303, htmlPath);
}