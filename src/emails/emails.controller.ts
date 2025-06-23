import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { EmailOptions } from './email-options.interface';
import { EmailsService, InvoiceData } from './emails.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailService: EmailsService) {}

  @Post('send')
  async sendEmail(@Body() emailOptions: EmailOptions) {
    return await this.emailService.sendEmail(emailOptions);
  }

  @Post('welcome')
  async sendWelcomeEmail(@Body() body: { email: string; username: string }) {
    if (!body.email || !body.username) {
      throw new BadRequestException('Email and username are required');
    }
    return await this.emailService.sendWelcomeEmail(body.email, body.username);
  }

  @Post('send-invoice')
  async sendInvoice(@Body() invoiceData: InvoiceData) {
    if (!invoiceData.clientId) {
      throw new BadRequestException('Client ID is required');
    }

    // Generate PDF for the invoice - this depends on how you're generating PDFs
    // This is a placeholder assuming you have a method to generate PDF buffers for invoices
    const pdfBuffer = await this.generateInvoicePdf(invoiceData);

    return await this.emailService.sendInvoiceEmail(invoiceData, pdfBuffer);
  }

  @Post('send-invoice/:clientId')
  async sendInvoiceWithClientId(
    @Param('clientId') clientId: string,
    @Body() invoiceData: Omit<InvoiceData, 'clientId'>,
  ) {
    const completeInvoiceData: InvoiceData = {
      ...invoiceData,
      clientId,
    };

    // Generate PDF for the invoice
    const pdfBuffer = await this.generateInvoicePdf(completeInvoiceData);

    return await this.emailService.sendInvoiceEmail(
      completeInvoiceData,
      pdfBuffer,
    );
  }

  @Post('reset-password')
  async sendPasswordReset(@Body() body: { email: string; resetToken: string }) {
    if (!body.email || !body.resetToken) {
      throw new BadRequestException('Email and reset token are required');
    }
    return await this.emailService.sendPasswordResetEmail(
      body.email,
      body.resetToken,
    );
  }

  /**
   * Helper method to generate PDF for invoice
   * This is a placeholder - you'll need to implement this based on your PDF generation logic
   */
  private async generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer> {
    // This implementation depends on how you're generating PDFs
    // You might use PDFKit, puppeteer, or another library

    // Example using PDFKit (you'd need to implement this)
    // const pdfDoc = new PDFDocument();
    // const chunks: Buffer[] = [];

    // // Collect PDF data chunks
    // pdfDoc.on('data', (chunk) => chunks.push(chunk));

    // // Generate PDF content
    // pdfDoc.text(`Invoice #${invoiceData.invoiceNumber}`);
    // // ... more PDF generation logic

    // pdfDoc.end();

    // return new Promise<Buffer>((resolve) => {
    //   pdfDoc.on('end', () => {
    //     const pdfBuffer = Buffer.concat(chunks);
    //     resolve(pdfBuffer);
    //   });
    // });

    // For now, returning an empty buffer as placeholder
    // Replace this with your actual PDF generation logic
    return Buffer.from('PDF placeholder');
  }
}
