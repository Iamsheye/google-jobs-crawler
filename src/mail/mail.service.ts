import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailer: MailerService) {}
  private readonly logger = new Logger('EMAIL');

  async sendVerificationEmail(email: string, id: string) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?id=${id}`;

    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'Welcome to Scrapper🫡',
        html: `
        <p>Click the link below to verify your Scrapper email address</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (err) {
      this.logger.error(`Error sending verification email to ${email}`, err);
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?resetToken=${resetToken}`;

    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'Password Reset Request',
        html: `
        <p>You requested to reset your Scrapper password. Click the link below to create a new password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `,
      });
    } catch (err) {
      this.logger.error(`Error sending password reset email to ${email}`, err);
    }
  }
}
