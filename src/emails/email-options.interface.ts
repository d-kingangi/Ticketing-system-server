export interface EmailOptions {
  to: string | string[];
  from?: string;
  fromName?: string; // Added to support organization name as sender
  subject: string;
  text?: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}
