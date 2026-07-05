import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UserRepository } from "../repositories/user.repository.js";
import { BadRequestError, UnauthorizedError, ConflictError } from "../errors/custom-errors.js";
import { logger } from "../config/logger.js";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "super-secret-refresh-key";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Mock/Local Ethereal Mailer configuration for testing email notifications out-of-the-box
let transporter: nodemailer.Transporter | null = null;

const getMailTransporter = async () => {
  if (transporter) return transporter;

  try {
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Create ethereal mail transport for local mock
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info(`Initialized Ethereal Mailer. User: ${testAccount.user}`);
    }
  } catch (err: any) {
    logger.warn(`Failed to initialize mail service: ${err.message}. Emails will be logged to console instead.`);
  }

  return transporter;
};

export class AuthService {
  private userRepo = new UserRepository();

  async register(data: { email: string; passwordHash: string; name: string; orgName?: string }) {
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(data.passwordHash, salt);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Start a database transaction for creation
    const user = await this.userRepo.create({
      email: data.email,
      passwordHash: hash,
      name: data.name,
      verificationToken,
    });

    // Create default organization
    const orgName = data.orgName || `${data.name}'s Org`;
    const org = await this.userRepo.createOrganization(orgName);

    // Link user to org as OWNER
    await this.userRepo.addOrganizationMember(org.id, user.id, "OWNER");

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`;
    logger.info(`[Verification Link]: ${verificationLink}`);

    const mail = await getMailTransporter();
    if (mail) {
      mail.sendMail({
        from: '"Distributed Scheduler" <noreply@scheduler.io>',
        to: user.email,
        subject: "Verify your email address",
        text: `Please verify your email using this link: ${verificationLink}`,
        html: `<p>Please verify your email using this link: <a href="${verificationLink}">${verificationLink}</a></p>`,
      }).then(info => {
        logger.info(`Verification email sent: ${info.messageId}`);
      }).catch(err => {
        logger.error(`Failed to send verification email: ${err.message}`);
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      organization: org,
    };
  }

  async login(data: { email: string; passwordHash: string }) {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(data.passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.isVerified) {
      throw new BadRequestError("Please verify your email to log in");
    }

    // Generate tokens
    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    // Save refresh token to user
    await this.userRepo.update(user.id, { refreshToken });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string) {
    await this.userRepo.update(userId, { refreshToken: null });
    return { success: true };
  }

  async refresh(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string; email: string };
      const user = await this.userRepo.findById(decoded.id);

      if (!user || user.refreshToken !== token) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
      const newRefreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

      await this.userRepo.update(user.id, { refreshToken: newRefreshToken });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestError("Invalid or expired verification token");
    }

    await this.userRepo.update(user.id, {
      isVerified: true,
      verificationToken: null,
    });

    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Avoid revealing user exists or not, but return success
      return { success: true };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepo.update(user.id, {
      resetToken,
      resetTokenExpires: expires,
    });

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
    logger.info(`[Password Reset Link]: ${resetLink}`);

    const mail = await getMailTransporter();
    if (mail) {
      mail.sendMail({
        from: '"Distributed Scheduler" <noreply@scheduler.io>',
        to: user.email,
        subject: "Password Reset Request",
        text: `Reset your password using this link: ${resetLink}`,
        html: `<p>Reset your password using this link: <a href="${resetLink}">${resetLink}</a></p>`,
      }).then(info => {
        logger.info(`Reset email sent: ${info.messageId}`);
      }).catch(err => {
        logger.error(`Failed to send reset email: ${err.message}`);
      });
    }

    return { success: true };
  }

  async resetPassword(token: string, passwordHash: string) {
    const user = await this.userRepo.findByResetToken(token);
    if (!user) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordHash, salt);

    await this.userRepo.update(user.id, {
      passwordHash: hash,
      resetToken: null,
      resetTokenExpires: null,
    });

    return { success: true };
  }
}
