import axios from "axios";
import nodemailer from "nodemailer";
import { prisma } from "../config/prisma.js";
import { logger } from "../logger/index.js";

export class NotificationService {
  /**
   * Fetches active notifications configured for a project, and alerts the channels
   */
  static async dispatchProjectAlert(projectId: string, subject: string, message: string) {
    try {
      const configurations = await prisma.notification.findMany({
        where: { projectId },
      });

      for (const config of configurations) {
        const settings = JSON.parse(config.config);

        if (config.type === "EMAIL" && settings.email) {
          await this.sendEmail(settings.email, subject, message);
        } else if (config.type === "SLACK" && settings.webhookUrl) {
          await this.sendSlack(settings.webhookUrl, `*${subject}*\n${message}`);
        } else if (config.type === "DISCORD" && settings.webhookUrl) {
          await this.sendDiscord(settings.webhookUrl, `**${subject}**\n${message}`);
        }
      }
    } catch (err: any) {
      logger.error(`Notification dispatcher error: ${err.message}`);
    }
  }

  private static async sendEmail(to: string, subject: string, body: string) {
    try {
      let transporter: nodemailer.Transporter;

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
        // Fallback test configuration
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: "ethereal-test-user",
            pass: "ethereal-pass",
          },
        });
      }

      await transporter.sendMail({
        from: '"Distributed Scheduler" <alerts@scheduler.io>',
        to,
        subject,
        text: body,
      });

      logger.info(`Alert email sent to ${to}`);
    } catch (err: any) {
      logger.error(`Nodemailer failure: ${err.message}`);
    }
  }

  private static async sendSlack(url: string, text: string) {
    try {
      await axios.post(url, { text });
      logger.info("Alert posted to Slack Webhook");
    } catch (err: any) {
      logger.error(`Slack webhook request failure: ${err.message}`);
    }
  }

  private static async sendDiscord(url: string, content: string) {
    try {
      await axios.post(url, { content });
      logger.info("Alert posted to Discord Webhook");
    } catch (err: any) {
      logger.error(`Discord webhook request failure: ${err.message}`);
    }
  }
}
