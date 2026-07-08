import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger('EMAIL');

  constructor(
    private mailer: MailerService,
    private config: ConfigService,
  ) {}

  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = this.config.getOrThrow('FRONTEND_URL');
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'Welcome to Scrapper🫡',
        html: `
        <div style="padding: 1px 12px 24px;font-weight: 500;">
        <p>Welcome to Scrapper,</p>
        <p>Your companion in helping you search for jobs! Job hunting is a full time job on its own, but it doesn't have to be, with Scrapper, cut out the searching, and get to the applying.</p>

        <p>The process is simple, create job alerts for your preferred role, and let Scrapper do the rest. Scrapper will search for jobs that match your criteria, and send them to you daily.</p>

        <p>Click the link below to verify your Scrapper email address and get started on creating alerts.</p>

        <p>
        <a href="${verificationLink}">Verify Email</a>
        </p>

        <p>This link will expire in 24 hours and can only be used once.</p>

        <p style="margin:0;">Love,</p>
        <p style="margin:0;">The Scrapper Team.</p>
        </div>
        `,
      });
    } catch (err) {
      this.logger.error(
        `Error sending verification email to ${email}, link: ${verificationLink}`,
        err,
      );
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const frontendUrl = this.config.getOrThrow('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?resetToken=${resetToken}`;

    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'Password Reset Request',
        html: `
        <div style="padding: 1px 12px 24px;font-weight: 500;">
        <p>You requested to reset your Scrapper password. Click the link below to create a new password:</p>
        <p>
        <a href="${resetLink}">Reset Password</a>
        </p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>

        <p style="margin:0;">Love,</p>
        <p style="margin:0;">The Scrapper Team.</p>
        </div>
      `,
      });
    } catch (err) {
      this.logger.error(`Error sending password reset email to ${email}`, err);
    }
  }
}
