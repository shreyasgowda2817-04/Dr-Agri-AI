import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.core.config import settings

def send_reset_password_email(to_email: str, reset_link: str):
    if not settings.EMAIL_USER or not settings.EMAIL_PASS:
        print("Warning: EMAIL_USER or EMAIL_PASS not set. Cannot send email.")
        return False

    sender_email = settings.EMAIL_USER
    sender_password = settings.EMAIL_PASS

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset Your Password - Dr Agri AI"
    message["From"] = sender_email
    message["To"] = to_email

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-w-4xl; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #059669; text-align: center;">Dr Agri AI</h2>
          <p style="color: #374151; font-size: 16px;">Hello,</p>
          <p style="color: #374151; font-size: 16px;">We received a request to reset your password. Click the button below to choose a new one:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email. This link will expire in 15 minutes.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">&copy; {datetime.now().year} Dr Agri AI. All rights reserved.</p>
        </div>
      </body>
    </html>
    """

    part = MIMEText(html, "html")
    message.attach(part)

    try:
        # Use settings for server and port instead of hardcoding
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT)
        else:
            server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
            server.starttls()
            
        with server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, message.as_string())
        return True
    except smtplib.SMTPAuthenticationError:
        print("❌ SMTP Authentication Error: If using Gmail, Google requires an 'App Password'. You cannot use your standard account password. Please generate a 16-character App Password in your Google Account Security settings.")
        return False
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
