/**
 * 🎨 Centralized HTML Email Templates for CampusBuddy
 * Includes branded header, footer, and reusable layouts.
 */

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const LOGO_URL = `${BASE_URL}/assets/logo.png`; // 🪶 place your logo in frontend /assets/logo.png or update path
const CONTACT_EMAIL = "support@campusbuddy.com";

function wrapWithLayout(content, universityName = null) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); overflow: hidden;">
        
        <!-- Header -->
        <div style="background-color: #2b6cb0; color: white; text-align: center; padding: 20px;">
          <!-- <img src="${LOGO_URL}" alt="CampusBuddy Logo" width="100" style="margin-bottom: 10px;" /> -->
          <h2 style="margin: 0;">CampusBuddy</h2>
          ${universityName ? `<p style="margin: 5px 0 0; font-size: 14px;">${universityName}</p>` : ""}
        </div>

        <!-- Main Content -->
        <div style="padding: 30px; color: #333; line-height: 1.6;">
          ${content}
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f3f6; text-align: center; padding: 15px; font-size: 13px; color: #666;">
          <p style="margin: 0;">© ${new Date().getFullYear()} CampusBuddy. All rights reserved.</p>
          <p style="margin: 5px 0 0;">
            <a href="${BASE_URL}/privacy" style="color: #2b6cb0; text-decoration: none;">Privacy Policy</a> |
            <a href="${BASE_URL}/terms" style="color: #2b6cb0; text-decoration: none;">Terms of Service</a>
          </p>
          <p style="margin: 8px 0 0;">Need help? Contact us at 
            <a href="mailto:${CONTACT_EMAIL}" style="color:#2b6cb0;">${CONTACT_EMAIL}</a>
          </p>
        </div>

      </div>
    </div>
  `;
}

const EmailTemplates = {
  /**
   * Password Reset Request Email
   */
  passwordResetRequest: (name, resetLink, universityName) =>
    wrapWithLayout(
      `
      <h2 style="color: #2b6cb0;">🔐 Password Reset Request</h2>
      <p>Hi ${name || "User"},</p>
      <p>We received a request to reset your password for your CampusBuddy account.</p>
      <p>Click below to reset your password:</p>
      <a href="${resetLink}" 
         style="background-color:#2b6cb0;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
         Reset Password
      </a>
      <p style="margin-top:20px;">If that doesn’t work, copy and paste this link:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
      <p>Best,<br><b>CampusBuddy Team</b></p>
      `,
      universityName
    ),

  /**
   * Password Reset Success Email
   */
  passwordResetSuccess: (name, loginUrl, universityName) =>
    wrapWithLayout(
      `
      <h2 style="color: #2b6cb0;">✅ Password Reset Successful</h2>
      <p>Hi ${name || "User"},</p>
      <p>Your password has been successfully reset.</p>
      <p>You can now log in using your new password:</p>
      <a href="${loginUrl}"
         style="background-color:#2b6cb0;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
         Go to Login
      </a>
      <p>If you didn’t request this change, please contact support immediately.</p>
      <p>— The CampusBuddy Team</p>
      `,
      universityName
    ),
  /**
   * Registration Request Email
   */
  registrationRequested: (name, role, universityName, loginUrl) =>
    wrapWithLayout(
      `
        <h2 style="color:#2b6cb0;">📥 New Registration Request</h2>
        <p>Hello Admin,</p>
        <p>A new <b>${role}</b> has submitted a registration request for <b>${universityName}</b>.</p>
        
        <table style="margin-top:15px; border-collapse:collapse; width:100%;">
          <tr>
            <td style="padding:8px; border:1px solid #ddd;"><strong>Name</strong></td>
            <td style="padding:8px; border:1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;"><strong>Role</strong></td>
            <td style="padding:8px; border:1px solid #ddd;">${role}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;"><strong>University</strong></td>
            <td style="padding:8px; border:1px solid #ddd;">${universityName}</td>
          </tr>
        </table>

        <p style="margin-top:20px;">
          Please review this request in your admin dashboard and take the appropriate action.
        </p>

        <a href="${loginUrl}" 
          style="display:inline-block; background-color:#2b6cb0; color:white; padding:10px 20px; 
          border-radius:6px; text-decoration:none; margin-top:10px;">
          Review Requests
        </a>

        <p style="margin-top:25px; font-size:0.9em; color:#555;">
          Best regards,<br>
          <b>CampusBuddy Team</b>
        </p>
      `,
      universityName
    ),


  /**
   * Registration Approved Email
   */
  registrationApproved: (name, role, universityName, loginUrl) =>
    wrapWithLayout(
      `
      <h2 style="color:#2b6cb0;">🎉 Registration Approved!</h2>
      <p>Hi <b>${name}</b>,</p>
      <p>Your registration as a <b>${role}</b> at <b>${universityName}</b> has been approved by the admin.</p>
      <p>You can now log in and start using CampusBuddy.</p>
      <a href="${loginUrl}" 
         style="background-color:#2b6cb0; color:white; padding:10px 20px; border-radius:5px; text-decoration:none;">
         Login Now
      </a>
      <p>Best regards,<br>CampusBuddy Team</p>
      `,
      universityName
    ),

  /**
   * Registration Rejected Email
   */
  registrationRejected: (name, universityName) =>
    wrapWithLayout(
      `
      <h2 style="color:#e53e3e;">❌ Registration Rejected</h2>
      <p>Hi <b>${name}</b>,</p>
      <p>We’re sorry to inform you that your registration request was <b>rejected</b> by the university admin.</p>
      <p>If you believe this was a mistake, please contact your university administrator.</p>
      <p>Regards,<br>CampusBuddy Team</p>
      `,
      universityName
    ),
};

module.exports = EmailTemplates;
