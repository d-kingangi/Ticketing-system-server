import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailOptions } from './email-options.interface';
import { create } from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { Buffer } from 'buffer';

// Define a type for invoice data for your ticketing system
export interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
  issueDate: string;
  dueDate?: string;
  [key: string]: any;
}

// Define a type for ticket email data
export interface TicketEmailData {
  eventName: string;
  ticketCode: string;
  ticketType: string;
  attendeeName: string;
  eventDate: string;
  venue: string;
  [key: string]: any;
}

@Injectable()
export class EmailsService {
  private transporter: nodemailer.Transporter;
  private hbs: any;
  private logger = new Logger('EmailsService');

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.hbs = create();
  }

  async compileHTML(templateName: string, data: any): Promise<string> {
    try {
      const templatePath = path.join(
        process.cwd(),
        'src',
        'emails',
        'templates',
        `${templateName}.hbs`,
      );
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = this.hbs.compile(templateContent);
      const html = compiledTemplate(data);
      return html;
    } catch (error) {
      this.logger.error(
        `Failed to compile template ${templateName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Could not compile template: ${templateName}`);
    }
  }

  async generatePdf(templateName: string, data: any): Promise<Buffer> {
    const html = await this.compileHTML(templateName, data);
    const browser = await puppeteer.launch({ headless: true }); // Fix: use true
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    // Ensure the result is a Node.js Buffer
    return Buffer.from(pdfBuffer);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.verify();
      await this.transporter.sendMail({
        from: {
          name: options.fromName || 'Support Team',
          address: options.from || this.configService.get('SMTP_FROM_EMAIL'),
        },
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendInvoiceEmail(invoice: InvoiceData, to: string): Promise<boolean> {
    try {
      const html = await this.compileHTML('invoice', invoice);
      const pdfBuffer = await this.generatePdf('invoice', invoice);

      const emailOptions: EmailOptions = {
        to,
        fromName: 'Ticketing System',
        subject: `Invoice #${invoice.invoiceNumber}`,
        html,
        attachments: [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      return await this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Failed to generate and send invoice:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    try {
      const html = await this.compileHTML('welcome', { username });
      const emailOptions: EmailOptions = {
        to,
        fromName: 'Ticketing System',
        subject: 'Welcome to Our Platform!',
        html,
      };
      return await this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Failed to generate and send welcome email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    try {
      const html = await this.compileHTML('reset-password', { resetToken });
      const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
      const emailOptions: EmailOptions = {
        to,
        fromName: 'Ticketing System',
        subject: 'Password Reset Request',
        html,
      };
      return await this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Failed to generate and send reset password email:', error);
      return false;
    }
  }

  // Example: Send a ticket email (expand as needed)
  async sendTicketEmail(ticketData: TicketEmailData, to: string): Promise<boolean> {
    try {
      const html = await this.compileHTML('ticket', ticketData);
      const emailOptions: EmailOptions = {
        to,
        fromName: 'Ticketing System',
        subject: `Your Ticket for ${ticketData.eventName}`,
        html,
      };
      return await this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Failed to generate and send ticket email:', error);
      return false;
    }
  }
}