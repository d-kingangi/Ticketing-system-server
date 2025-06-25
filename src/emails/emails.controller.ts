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

   @Post('send-invoice/:recipient')
  async sendInvoice(
    @Body() invoiceData: InvoiceData,
    @Param('recipient') recipient: string, // added to specify recipient address
  ) {
    if (!invoiceData.clientId) {
      throw new BadRequestException('Client ID is required');
    }

    return await this.emailService.sendInvoiceEmail(invoiceData, recipient);
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

  
}
