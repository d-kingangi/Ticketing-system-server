import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailOptions } from './email-options.interface';
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
  // private transporter: nodemailer.Transporter;

  // // logger
  // private logger = new Logger('EmailsService');

  // constructor(
  //   private configService: ConfigService,
  //   // @Inject(forwardRef(() => ClientsService))
  //   // private clientsService: ClientsService,
  // ) {
  //   this.transporter = nodemailer.createTransport({
  //     host: this.configService.get('SMTP_HOST'),
  //     port: this.configService.get('SMTP_PORT'),
  //     secure: this.configService.get('SMTP_SECURE') === 'true',
  //     auth: {
  //       user: this.configService.get('SMTP_USER'),
  //       pass: this.configService.get('SMTP_PASSWORD'),
  //     },
  //     tls: {
  //       rejectUnauthorized: false,
  //     },
  //   });
  // }

  // // Enhanced method to fetch client details including payment information
  // // private async getClientDetails(clientId: string): Promise<ClientDetails> {
  // //   try {
  // //     const client = await this.clientsService.findOne(clientId);

  // //     if (!client) {
  // //       throw new Error(`Client with ID ${clientId} not found`);
  // //     }

  // //     // Map the client data from your ClientsService to the expected ClientDetails format
  // //     const clientDetails: ClientDetails = {
  // //       name: client.name,
  // //       email: client.contactEmail,
  // //       phone: client.contactPhone,
  // //       address: client.address,
  // //       // Assuming your client has a similar structure for these properties
  // //       // Otherwise you'll need to adapt them to match your client model
  // //       location: {
  // //         city: client.address.split(',')[0]?.trim(),
  // //         country: 'Kenya',
  // //       },
  // //       // // The following properties might need to be added to your client model
  // //       // logoUrl: client.logoUrl,
  // //       // kraPin: client.kraPin,
  // //       // // Payment details might need to be added to your client model
  // //       // bankPaymentDetails: client.bankPaymentDetails,
  // //       // mpesaPaymentDetails: client.mpesaPaymentDetails,
  // //     };

  // //     return clientDetails;
  // //   } catch (error) {
  // //     console.error('Error fetching client details:', error);
  // //     return {
  // //       name: 'Client',
  // //       email: this.configService.get('SMTP_FROM_EMAIL'),
  // //       phone: 'N/A',
  // //       address: 'N/A',
  // //       location: { city: 'ELDORET', country: 'Kenya' },
  // //     };
  // //   }
  // // }

  // async sendEmail(options: EmailOptions): Promise<boolean> {
  //   try {
  //     await this.transporter.verify();

  //     const result = await this.transporter.sendMail({
  //       from: {
  //         name: options.fromName || 'Support Team',
  //         address: options.from || this.configService.get('SMTP_FROM_EMAIL'),
  //       },
  //       to: options.to,
  //       subject: options.subject,
  //       text: options.text,
  //       html: options.html,
  //       attachments: options.attachments,
  //     });

  //     return true;
  //   } catch (error) {
  //     console.error('Failed to send email:', error);
  //     return false;
  //   }
  // }

  // async sendInvoiceEmail(
  //   invoice: InvoiceData,
  //   pdfBuffer: Buffer,
  // ): Promise<boolean> {
  //   try {
  //     // Fetch client details instead of organization details
  //     const clientDetails = await this.getClientDetails(invoice.clientId);

  //     // Calculate payment status
  //     const balanceDue = invoice.balanceDue || invoice.total;
  //     const isPaid = balanceDue <= 0;

  //     // Define status badge style for email template
  //     const statusBadgeStyle = isPaid
  //       ? 'display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;'
  //       : 'display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba;';

  //     // Extract M-Pesa payment details
  //     let mpesaPaybill = '';
  //     let mpesaAccount = '';
  //     let mpesaTill = '';

  //     if (clientDetails.mpesaPaymentDetails) {
  //       // Handle both array and object formats
  //       const mpesaDetails = Array.isArray(clientDetails.mpesaPaymentDetails)
  //         ? clientDetails.mpesaPaymentDetails[0]
  //         : clientDetails.mpesaPaymentDetails;

  //       if (mpesaDetails) {
  //         mpesaPaybill = mpesaDetails.paybillNumber || '';
  //         mpesaAccount = mpesaDetails.accountNumber || '';
  //         mpesaTill = mpesaDetails.tillNumber || '';
  //       }
  //     }

  //     // Extract bank payment details
  //     let bankName = '';
  //     let bankAccountName = '';
  //     let bankAccountNumber = '';
  //     let bankBranch = '';

  //     if (clientDetails.bankPaymentDetails) {
  //       // Handle both array and object formats
  //       const bankDetails = Array.isArray(clientDetails.bankPaymentDetails)
  //         ? clientDetails.bankPaymentDetails[0]
  //         : clientDetails.bankPaymentDetails;

  //       if (bankDetails) {
  //         bankName = bankDetails.bankName || '';
  //         bankAccountName = bankDetails.accountName || '';
  //         bankAccountNumber = bankDetails.accountNumber || '';
  //         bankBranch = bankDetails.bankBranch || '';
  //       }
  //     }

  //     // Get location string
  //     const locationString = clientDetails.location
  //       ? typeof clientDetails.location === 'string'
  //         ? clientDetails.location
  //         : `${clientDetails.location.city || 'Nyeri'}, ${clientDetails.location.country || 'Kenya'}`
  //       : 'Nyeri, Kenya';

  //     // Fixed method name to match the one defined above
  //     const templateData = {
  //       invoiceNumber: invoice.invoiceNumber,
  //       invoiceDate: invoice.date.toLocaleDateString('en-US', {
  //         day: '2-digit',
  //         month: 'short',
  //         year: 'numeric',
  //       }),
  //       dueDate: invoice.dueDate.toLocaleDateString('en-US', {
  //         day: '2-digit',
  //         month: 'short',
  //         year: 'numeric',
  //       }),
  //       businessName: clientDetails.name,
  //       businessAddress: clientDetails.address || locationString,
  //       businessPhone: clientDetails.phone || 'N/A',
  //       businessEmail: clientDetails.email || 'N/A',
  //       logoUrl: clientDetails.logoUrl,
  //       kraPin: clientDetails.kraPin,
  //       customerName: invoice.customerName,
  //       customerEmail: invoice.customerEmail,
  //       customerAddress: invoice.customerAddress,
  //       items: invoice.items.map((item, index) => ({
  //         index: index + 1,
  //         description: item.description,
  //         qty: item.quantity.toFixed(2),
  //         unitPrice: item.unitPrice.toFixed(2),
  //         total: item.total.toFixed(2),
  //       })),
  //       subtotal: invoice.subtotal.toFixed(2),
  //       tax: invoice.tax.toFixed(2),
  //       discount: '0.00',
  //       grandTotal: invoice.total.toFixed(2),
  //       amountPaid: (invoice.cashPaid || 0).toFixed(2),
  //       balance: (invoice.balanceDue || invoice.total).toFixed(2),
  //       servedBy: invoice.servedBy || 'Staff',
  //       generatedOn: new Date().toLocaleString(),
  //       isPaid: isPaid,

  //       // Payment details
  //       mpesaPaybill: mpesaPaybill,
  //       mpesaAccount: mpesaAccount,
  //       mpesaTill: mpesaTill,

  //       bankName: bankName,
  //       bankAccountName: bankAccountName,
  //       bankAccountNumber: bankAccountNumber,
  //       bankBranch: bankBranch,

  //       paymentTerms:
  //         invoice.paymentTerms || 'Payment due within 30 days of invoice date.',
  //     };

  //     // Format helpers for email body
  //     const formatCurrency = (amount: number): string => {
  //       return amount.toLocaleString('en-KE', {
  //         minimumFractionDigits: 2,
  //         maximumFractionDigits: 2,
  //       });
  //     };

  //     const formatDate = (date: Date): string => {
  //       return date.toLocaleDateString('en-US', {
  //         day: '2-digit',
  //         month: 'short',
  //         year: 'numeric',
  //       });
  //     };

  //     // Create payment methods HTML for email body
  //     let paymentMethodsHtml = '';

  //     // Handle payment methods - bank transfer section
  //     if (bankName || bankAccountName || bankAccountNumber) {
  //       paymentMethodsHtml += `
  //         <div style="margin-bottom: 10px;">
  //           <p style="font-weight: bold; margin: 0 0 5px 0;">Bank Transfer:</p>
  //           <p style="margin: 0 0 3px 10px;">Bank: ${bankName || 'undefined'}</p>
  //           <p style="margin: 0 0 3px 10px;">Account Name: ${bankAccountName || 'undefined'}</p>
  //           <p style="margin: 0 0 3px 10px;">Account Number: ${bankAccountNumber || 'undefined'}</p>
  //         </div>
  //       `;
  //     }

  //     // Handle payment methods - M-Pesa section
  //     if (mpesaPaybill || mpesaAccount || mpesaTill) {
  //       paymentMethodsHtml += `
  //         <div style="margin-bottom: 10px;">
  //           <p style="font-weight: bold; margin: 0 0 5px 0;">M-Pesa:</p>
  //           ${
  //             mpesaPaybill
  //               ? `<p style="margin: 0 0 3px 10px;">Paybill: ${mpesaPaybill}</p>`
  //               : ''
  //           }
  //           ${
  //             mpesaAccount
  //               ? `<p style="margin: 0 0 3px 10px;">Account Number: ${mpesaAccount}</p>`
  //               : ''
  //           }
  //           ${
  //             mpesaTill
  //               ? `<p style="margin: 0 0 3px 10px;">Till Number: ${mpesaTill}</p>`
  //               : ''
  //           }
  //         </div>
  //       `;
  //     }

  //     // If no payment methods added so far, add default text
  //     if (!paymentMethodsHtml) {
  //       paymentMethodsHtml =
  //         '<p style="margin: 5px 0;">Please contact us for payment options.</p>';
  //     }

  //     const emailOptions: EmailOptions = {
  //       to: invoice.customerEmail,
  //       fromName: clientDetails.name,
  //       subject: `Invoice #${invoice.invoiceNumber} from ${clientDetails.name}`,
  //       html: `
  //         <!DOCTYPE html>
  //         <html>
  //         <head>
  //           <meta charset="UTF-8">
  //           <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //           <title>Invoice #${invoice.invoiceNumber}</title>
  //           <style>
  //             * {
  //               margin: 0;
  //               padding: 0;
  //               box-sizing: border-box;
  //               font-family: Arial, sans-serif;
  //             }
  //             body {
  //               color: #333;
  //               line-height: 1.5;
  //               width: 100%;
  //               background-color: #f9f9f9;
  //             }
  //             .invoice-container {
  //               max-width: 800px;
  //               margin: 20px auto;
  //               padding: 30px;
  //               background-color: #fff;
  //               border: 1px solid #ddd;
  //               border-radius: 5px;
  //               box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  //             }
  //             .logo {
  //               max-width: 150px;
  //               margin-bottom: 20px;
  //             }
  //             .header {
  //               display: flex;
  //               justify-content: space-between;
  //               margin-bottom: 30px;
  //               border-bottom: 1px solid #eee;
  //               padding-bottom: 20px;
  //             }
  //             .org-info {
  //               flex: 1;
  //             }
  //             .invoice-details {
  //               text-align: right;
  //               flex: 1;
  //             }
  //             .org-name {
  //               font-size: 18px;
  //               font-weight: bold;
  //               margin-bottom: 5px;
  //             }
  //             .invoice-title {
  //               font-size: 24px;
  //               font-weight: bold;
  //               margin-bottom: 5px;
  //             }
  //             .status-badge {
  //               margin-top: 8px;
  //             }
  //             .customer-section {
  //               background-color: #f5f5f5;
  //               padding: 15px;
  //               border-radius: 5px;
  //               margin-bottom: 20px;
  //               display: flex;
  //               justify-content: space-between;
  //             }
  //             .table-container {
  //               margin-bottom: 20px;
  //             }
  //             table {
  //               width: 100%;
  //               border-collapse: collapse;
  //             }
  //             th {
  //               background-color: #333;
  //               color: white;
  //               text-align: left;
  //               padding: 10px;
  //               font-weight: normal;
  //             }
  //             td {
  //               padding: 10px;
  //               border-bottom: 1px solid #eee;
  //             }
  //             tr:nth-child(even) {
  //               background-color: #f9f9f9;
  //             }
  //             .text-right {
  //               text-align: right;
  //             }
  //             .text-center {
  //               text-align: center;
  //             }
  //             .summary-table {
  //               width: auto;
  //               margin-left: auto;
  //               margin-bottom: 30px;
  //             }
  //             .summary-table td {
  //               padding: 5px 10px;
  //             }
  //             .summary-table tr.total-row td {
  //               border-top: 1px solid #ddd;
  //               font-weight: bold;
  //               padding-top: 8px;
  //               padding-bottom: 8px;
  //             }
  //             .payment-section {
  //               background-color: #f5f5f5;
  //               padding: 15px;
  //               border-radius: 5px;
  //               margin-bottom: 20px;
  //             }
  //             .footer {
  //               margin-top: 30px;
  //               padding-top: 20px;
  //               border-top: 1px solid #eee;
  //               text-align: center;
  //               color: #666;
  //             }
  //           </style>
  //         </head>
  //         <body>
  //           <div class="invoice-container">
  //             <div class="header">
  //               <div class="org-info">
  //                 ${clientDetails.logoUrl ? `<img src="${clientDetails.logoUrl}" alt="${clientDetails.name}" class="logo">` : ''}
  //                 <h2 class="org-name">${clientDetails.name}</h2>
  //                 <p>${locationString}</p>
  //                 <p>Email: ${clientDetails.email || ''} | Tel: ${clientDetails.phone || ''}</p>
  //                 ${clientDetails.kraPin ? `<p>KRA PIN: ${clientDetails.kraPin}</p>` : ''}
  //               </div>
                
  //               <div class="invoice-details">
  //                 <h1 class="invoice-title">INVOICE</h1>
  //                 <p><strong>Invoice #${invoice.invoiceNumber}</strong></p>
  //                 <p>Invoice Date: ${formatDate(invoice.date)}</p>
  //                 <p>Due Date: ${formatDate(invoice.dueDate)}</p>
  //                 <div class="status-badge" style="${statusBadgeStyle}">
  //                   ${isPaid ? 'PAID' : 'UNPAID'}
  //                 </div>
  //               </div>
  //             </div>
              
  //             <div class="customer-section">
  //               <div>
  //                 <p style="font-weight: bold; margin-bottom: 5px;">Bill To:</p>
  //                 <p>${invoice.customerName}</p>
  //                 ${invoice.customerAddress ? `<p>${invoice.customerAddress}</p>` : ''}
  //               </div>
  //               ${invoice.customerEmail ? `<div><p>Email: ${invoice.customerEmail}</p></div>` : ''}
  //             </div>
              
  //             <div class="table-container">
  //               <table>
  //                 <thead>
  //                   <tr>
  //                     <th style="width: 5%;">#</th>
  //                     <th style="width: 45%;">Item Description</th>
  //                     <th style="width: 10%;" class="text-center">Qty</th>
  //                     <th style="width: 20%;" class="text-right">Unit Price (KES)</th>
  //                     <th style="width: 20%;" class="text-right">Amount (KES)</th>
  //                   </tr>
  //                 </thead>
  //                 <tbody>
  //                   ${invoice.items
  //                     .map(
  //                       (item, index) => `
  //                     <tr>
  //                       <td>${index + 1}</td>
  //                       <td>${item.description}</td>
  //                       <td class="text-center">${item.quantity.toFixed(2)}</td>
  //                       <td class="text-right">${formatCurrency(item.unitPrice)}</td>
  //                       <td class="text-right">${formatCurrency(item.total)}</td>
  //                     </tr>
  //                   `,
  //                     )
  //                     .join('')}
  //                 </tbody>
  //               </table>
  //             </div>
              
  //             <table class="summary-table">
  //               <tr>
  //                 <td class="text-right">Subtotal:</td>
  //                 <td class="text-right">KES ${formatCurrency(invoice.subtotal)}</td>
  //               </tr>
  //               <tr>
  //                 <td class="text-right">VAT (16%):</td>
  //                 <td class="text-right">KES ${formatCurrency(invoice.tax)}</td>
  //               </tr>
  //               <tr>
  //                 <td class="text-right">Total Amount:</td>
  //                 <td class="text-right">KES ${formatCurrency(invoice.total)}</td>
  //               </tr>
  //               <tr>
  //                 <td class="text-right">Cash Paid:</td>
  //                 <td class="text-right">KES ${formatCurrency(invoice.cashPaid || 0)}</td>
  //               </tr>
  //               <tr class="total-row">
  //                 <td class="text-right">Balance Due:</td>
  //                 <td class="text-right">KES ${formatCurrency(balanceDue)}</td>
  //               </tr>
  //             </table>
              
  //             <div class="payment-section">
  //               <h3 style="margin-bottom: 10px;">Payment Methods:</h3>
  //               ${paymentMethodsHtml}
                
  //               <h3 style="margin: 15px 0 5px 0;">Payment Terms:</h3>
  //               <p>${invoice.paymentTerms || 'Payment due within 30 days of invoice date. Thank you for your business.'}</p>
  //             </div>
              
  //             <div class="footer">
  //               <p style="font-weight: bold; margin-bottom: 5px;">Thank you for your business!</p>
  //               <p style="font-style: italic; margin-bottom: 5px;">This is a computer generated receipt and requires no signature</p>
  //               ${invoice.servedBy ? `<p style="margin-bottom: 5px;">Served by: ${invoice.servedBy}</p>` : ''}
  //               <p>Generated on: ${new Date().toLocaleString()}</p>
  //             </div>
  //           </div>
  //         </body>
  //         </html>
  //       `,
  //       attachments: [
  //         {
  //           filename: `invoice-${invoice.invoiceNumber}.pdf`,
  //           content: pdfBuffer,
  //           contentType: 'application/pdf',
  //         },
  //       ],
  //     };

  //     return await this.sendEmail(emailOptions);
  //   } catch (error) {
  //     console.error('Failed to generate and send invoice:', error);
  //     return false;
  //   }
  // }

  // // Other email sending methods remain the same
  // // Enhanced sendWelcomeEmail method in EmailsService
  // // Add this to your existing emails.service.ts file

  // /**
  //  * Send a welcome email to a newly registered user
  //  * @param to User's email address
  //  * @param username User's full name or username
  //  * @param clientId Optional client ID if the user belongs to a client
  //  */
  // async sendWelcomeEmail(
  //   to: string,
  //   username: string,
  //   clientId?: string,
  // ): Promise<boolean> {
  //   try {
  //     // Get client details if clientId is provided
  //     let clientName = 'Our Platform';
  //     let clientEmail = this.configService.get('SMTP_FROM_EMAIL');
  //     let clientLogo = '';

  //     if (clientId) {
  //       try {
  //         const clientDetails = await this.getClientDetails(clientId);
  //         clientName = clientDetails.name;
  //         clientEmail = clientDetails.email || clientEmail;
  //         clientLogo = clientDetails.logoUrl || '';
  //       } catch (error) {
  //         this.logger.warn(
  //           `Failed to get client details for welcome email: ${error.message}`,
  //         );
  //         // Continue with default values if client lookup fails
  //       }
  //     }

  //     // Format the welcome email with client branding if available
  //     const options: EmailOptions = {
  //       to,
  //       fromName: clientName,
  //       from: clientEmail,
  //       subject: `Welcome to ${clientName}!`,
  //       html: `
  //       <!DOCTYPE html>
  //       <html>
  //       <head>
  //         <meta charset="UTF-8">
  //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //         <title>Welcome to ${clientName}</title>
  //         <style>
  //           * {
  //             margin: 0;
  //             padding: 0;
  //             box-sizing: border-box;
  //             font-family: Arial, sans-serif;
  //           }
  //           body {
  //             color: #333;
  //             line-height: 1.6;
  //             width: 100%;
  //             background-color: #f9f9f9;
  //           }
  //           .email-container {
  //             max-width: 600px;
  //             margin: 20px auto;
  //             padding: 30px;
  //             background-color: #fff;
  //             border: 1px solid #ddd;
  //             border-radius: 5px;
  //             box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  //           }
  //           .logo {
  //             max-width: 150px;
  //             max-height: 80px;
  //             margin-bottom: 20px;
  //           }
  //           .header {
  //             text-align: center;
  //             margin-bottom: 30px;
  //             padding-bottom: 20px;
  //             border-bottom: 1px solid #eee;
  //           }
  //           .welcome-title {
  //             font-size: 24px;
  //             color: #2c3e50;
  //             margin-bottom: 10px;
  //           }
  //           .content {
  //             margin-bottom: 30px;
  //           }
  //           .button {
  //             display: inline-block;
  //             padding: 12px 24px;
  //             background-color: #3498db;
  //             color: white;
  //             text-decoration: none;
  //             border-radius: 4px;
  //             font-weight: bold;
  //             margin: 15px 0;
  //           }
  //           .footer {
  //             margin-top: 30px;
  //             padding-top: 20px;
  //             border-top: 1px solid #eee;
  //             text-align: center;
  //             color: #7f8c8d;
  //             font-size: 12px;
  //           }
  //         </style>
  //       </head>
  //       <body>
  //         <div class="email-container">
  //           <div class="header">
  //             ${clientLogo ? `<img src="${clientLogo}" alt="${clientName}" class="logo">` : ''}
  //             <h1 class="welcome-title">Welcome to ${clientName}!</h1>
  //           </div>
            
  //           <div class="content">
  //             <p>Hello ${username},</p>
  //             <p>We're excited to welcome you to ${clientName}! Your account has been successfully created.</p>
  //             <p>You can now log in using your email and password to access all our features and services.</p>
              
  //             <div style="text-align: center; margin: 25px 0;">
  //               <a href="${this.configService.get('FRONTEND_URL') || 'https://yourapp.com'}" class="button">Get Started</a>
  //             </div>
              
  //             <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
  //             <p>Thank you for joining us!</p>
  //             <p>Best regards,<br>The ${clientName} Team</p>
  //           </div>
            
  //           <div class="footer">
  //             <p>This email was sent to ${to}. If you did not create an account, please ignore this email.</p>
  //             <p>&copy; ${new Date().getFullYear()} ${clientName}. All rights reserved.</p>
  //           </div>
  //         </div>
  //       </body>
  //       </html>
  //     `,
  //     };

  //     return await this.sendEmail(options);
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to send welcome email: ${error.message}`,
  //       error.stack,
  //     );
  //     return false;
  //   }
  // }

  // async sendPasswordResetEmail(
  //   to: string,
  //   resetToken: string,
  // ): Promise<boolean> {
  //   const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

  //   const options: EmailOptions = {
  //     to,
  //     subject: 'Password Reset Request',
  //     html: `
  //       <h1>Password Reset Request</h1>
  //       <p>You requested a password reset. Click the link below to reset your password:</p>
  //       <a href="${resetUrl}">Reset Password</a>
  //       <p>If you didn't request this, please ignore this email.</p>
  //     `,
  //   };
  //   return this.sendEmail(options);
  // }
}
