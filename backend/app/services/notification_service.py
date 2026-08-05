import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_email(user_email: str, subject: str, body: str, user_prefs: dict = None):
        """
        Sends an email via SMTP. Falls back to terminal logging if credentials are not set.
        Checks if the user has opted in via user_prefs (defaults to True if not specified).
        """
        # 1. Check user preferences
        if user_prefs and user_prefs.get("email_alerts") is False:
            logger.info(f"⏭️  [SKIPPED EMAIL] to {user_email}: User has 'email_alerts' disabled.")
            return

        # 2. Check if we have credentials
        if not settings.EMAIL_USER or not settings.EMAIL_PASS:
            logger.info(f"📧 [MOCK EMAIL] to {user_email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"Body: \n{body}\n")
            return

        # 3. Send real email
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.EMAIL_USER
            msg['To'] = user_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
                server.send_message(msg)
                
            logger.info(f"✅ [EMAIL SENT] to {user_email}")
        except Exception as e:
            logger.error(f"❌ [EMAIL FAILED] to {user_email}: {str(e)}")

    @staticmethod
    def send_sms(phone_number: str, message: str, user_prefs: dict = None):
        """
        Sends an SMS via Twilio. Falls back to terminal logging if credentials are not set.
        Checks if the user has opted in via user_prefs (defaults to True if not specified).
        """
        # 1. Check user preferences
        if user_prefs and user_prefs.get("sms_alerts") is False:
            logger.info(f"⏭️  [SKIPPED SMS] to {phone_number}: User has 'sms_alerts' disabled.")
            return

        # 2. Check if we have credentials
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.info(f"📱 [MOCK SMS] to {phone_number}")
            logger.info(f"Message: {message}\n")
            return

        # 3. Send real SMS via Twilio HTTP API (avoiding heavy twilio python package dependency)
        import httpx
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            data = {
                "To": phone_number,
                "From": settings.TWILIO_FROM_NUMBER,
                "Body": message
            }
            
            with httpx.Client() as client:
                response = client.post(url, auth=auth, data=data)
                response.raise_for_status()
                
            logger.info(f"✅ [SMS SENT] to {phone_number}")
        except Exception as e:
            logger.error(f"❌ [SMS FAILED] to {phone_number}: {str(e)}")

