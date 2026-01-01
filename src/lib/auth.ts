import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import db from "./db/db";
import * as schema from "./db/schema";
import { sendEmail } from "./email";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Don't await to prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Reset your Perpetually password",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">P</div>
            </div>
            <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px; text-align: center; color: #111;">Reset your password</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
              We received a request to reset the password for your Perpetually account. Click the button below to choose a new password.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Perpetually · License Management Made Simple
            </p>
          </div>
        `,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Don't await to prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Verify your Perpetually account",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">P</div>
            </div>
            <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px; text-align: center; color: #111;">Verify your email</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
              Welcome to Perpetually! Please verify your email address to get started with your account.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email</a>
            </div>
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
              If you didn't create an account, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Perpetually · License Management Made Simple
            </p>
          </div>
        `,
      });
    },
  },
  plugins: [tanstackStartCookies()],
});
