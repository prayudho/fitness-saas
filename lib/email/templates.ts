interface WelcomeEmailData {
  memberName: string
  brandName: string
  email: string
  tempPassword: string
  loginUrl: string
  packageName?: string
  expiryDate?: string
}

interface TeamInviteEmailData {
  memberName: string
  brandName: string
  role: string
  email: string
  tempPassword: string
  loginUrl: string
}

interface EmailResult {
  subject: string
  html: string
}

function baseLayout(brandName: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${brandName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;border-radius:8px 8px 0 0;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${brandName}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9fb;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#71717a;">This email was sent by ${brandName} via Gerak.</p>
              <p style="margin:0;font-size:13px;color:#71717a;">If you did not expect this email, please disregard it.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function credentialsBox(email: string, tempPassword: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:6px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#71717a;">Your Login Credentials</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;font-size:14px;color:#52525b;width:90px;">Email</td>
            <td style="padding:4px 0;">
              <code style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#18181b;background-color:#e4e4e7;padding:2px 6px;border-radius:3px;">${email}</code>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:14px;color:#52525b;width:90px;">Password</td>
            <td style="padding:4px 0;">
              <code style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#18181b;background-color:#e4e4e7;padding:2px 6px;border-radius:3px;">${tempPassword}</code>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

function loginButton(loginUrl: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="border-radius:6px;background-color:#18181b;">
        <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Login to Your Account &rarr;</a>
      </td>
    </tr>
  </table>`
}

export function renderWelcomeEmail(data: WelcomeEmailData): EmailResult {
  const { memberName, brandName, email, tempPassword, loginUrl, packageName, expiryDate } = data

  const membershipSection =
    packageName != null
      ? `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;">
    <tr>
      <td style="background-color:#18181b;padding:12px 20px;">
        <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#a1a1aa;">Membership Details</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="font-size:14px;color:#52525b;padding:3px 0;width:120px;">Package</td>
            <td style="font-size:14px;font-weight:600;color:#18181b;padding:3px 0;">${packageName}</td>
          </tr>
          ${
            expiryDate != null
              ? `<tr>
            <td style="font-size:14px;color:#52525b;padding:3px 0;width:120px;">Valid Until</td>
            <td style="font-size:14px;font-weight:600;color:#18181b;padding:3px 0;">${expiryDate}</td>
          </tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>`
      : ''

  const content = `
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Welcome, ${memberName}!</h2>
  <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
    Your account at <strong>${brandName}</strong> has been created and is ready to use.
    Below are your login credentials — please keep them safe.
  </p>

  ${credentialsBox(email, tempPassword)}
  ${membershipSection}
  ${loginButton(loginUrl)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #e4e4e7;padding-top:20px;">
    <tr>
      <td>
        <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
          <strong style="color:#18181b;">Security reminder:</strong> Please change your password immediately after your first login.
          You can do so from your account settings.
        </p>
      </td>
    </tr>
  </table>`

  return {
    subject: `Welcome to ${brandName}! Your account is ready`,
    html: baseLayout(brandName, content),
  }
}

export function renderTeamInviteEmail(data: TeamInviteEmailData): EmailResult {
  const { memberName, brandName, role, email, tempPassword, loginUrl } = data

  const roleBadge = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
    <tr>
      <td style="background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:9999px;padding:4px 14px;">
        <span style="font-size:13px;font-weight:600;color:#18181b;text-transform:capitalize;">${role}</span>
      </td>
    </tr>
  </table>`

  const content = `
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Hi ${memberName},</h2>
  <p style="margin:0 0 4px;font-size:15px;color:#52525b;line-height:1.6;">
    You have been added to <strong>${brandName}</strong> on Gerak as:
  </p>

  ${roleBadge}

  <p style="margin:0 0 4px;font-size:15px;color:#52525b;line-height:1.6;">
    Use the credentials below to sign in and get started.
  </p>

  ${credentialsBox(email, tempPassword)}
  ${loginButton(loginUrl)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#fef9c3;border:1px solid #fde047;border-radius:6px;">
    <tr>
      <td style="padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:#713f12;line-height:1.6;">
          <strong>Security notice:</strong> The password above is temporary. You must change it after your
          first login to keep your account secure. Never share your credentials with anyone.
        </p>
      </td>
    </tr>
  </table>`

  return {
    subject: `You've been added to ${brandName} on Gerak`,
    html: baseLayout(brandName, content),
  }
}
