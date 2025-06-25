import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailOptions } from './email-options.interface';
import { create } from 'handlebars'; // Import Handlebars
import * as fs from 'fs/promises'; // Import file system module
import * as path from 'path';
import * as puppeteer from 'puppeteer';
// import { ClientsService } from 'src/clients/clients.service';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  cashPaid?: number;
  balanceDue?: number;
  paymentTerms?: string;
  servedBy?: string;
  notes?: string;
  clientId: string; // Changed from organizationId to clientId
}

// Enhanced client details interface to include payment information
export interface ClientDetails {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: Record<string, any>;
  logoUrl?: string;
  kraPin?: string;
  // Payment details
  bankPaymentDetails?: any;
  mpesaPaymentDetails?: any;
}

export interface QuotationData {
  quotationId: string;
  quotationNumber: string;
  date: Date;
  validUntil: Date;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  termsAndConditions?: string;
  createdBy?: string;
  clientId: string; // Changed from organizationId to clientId
}

@Injectable()
export class EmailsService {
  private transporter: nodemailer.Transporter;
  private hbs: any;

  // logger
  private logger = new Logger('EmailsService');

  constructor(
    private configService: ConfigService,
    // @Inject(forwardRef(() => ClientsService))
    // private clientsService: ClientsService,
  ) {
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


    this.hbs = create({});
  }

  async compileHTML(templateName: string, data: any): Promise<string> {
    try {
      // Construct the absolute path to the EJS template file
      const templatePath = path.join(
        process.cwd(),
        'src',
        'emails',
        'templates',
        `${templateName}.hbs`,
      );

      // Read the EJS template file
      const templateContent = await fs.readFile(templatePath, 'utf-8');

      // Use Handlebars to compile the template
      const compiledTemplate = this.hbs.compile(templateContent);

      // Render the template with the provided data
      const html = compiledTemplate(data);

      return html;
    } catch (error) {
      this.logger.error(
        `Failed to compile EJS template ${templateName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Could not compile template: ${templateName}`);
    }
  }

  async generatePdf(templateName: string, data: any): Promise<Buffer> {
    // Compile the EJS template into HTML
    const html = await this.compileHTML(templateName, data);

    // Launch a headless browser using Puppeteer
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Set the HTML content of the page
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate a PDF from the page content
    const pdfBuffer = await page.pdf({ format: 'A4' });

    // Close the browser
    await browser.close();

    return pdfBuffer;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.verify();

      const result = await this.transporter.sendMail({
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

  // Updated method to use EJS templates and generate PDF
  async sendInvoiceEmail(invoice: InvoiceData, to: string): Promise<boolean> {
    try {
      // Compile the EJS template for the email body
      const html = await this.compileHTML('invoice', invoice);

      // Generate the PDF using Puppeteer
      const pdfBuffer = await this.generatePdf('invoice', invoice);

      const emailOptions: EmailOptions = {
        to: to, // Dynamic recipient
        fromName: 'Ticketing System',
        subject: `Invoice #${invoice.invoiceNumber}`,
        html: html, // Use the compiled HTML
        attachments: [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer, // Attach the generated PDF
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
      // Compile the EJS template for the email body
      const html = await this.compileHTML('welcome', { username });

      const emailOptions: EmailOptions = {
        to: to,
        fromName: 'Ticketing System',
        subject: 'Welcome to Our Platform!',
        html: html, // Use the compiled HTML
      };

      return await this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Failed to generate and send welcome email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    try {
      // Compile the EJS template for the email body
      const html = await this.compileHTML('reset-password', { resetToken });

      const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

      const emailOptions: EmailOptions = {
        to,
        fromName: 'Ticketing System',
        subject: 'Password Reset Request',
        html: html, // Use the compiled HTML
      };
      return await this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Failed to generate and send reset password email:', error);
      return false;
    }
  }
 
}
