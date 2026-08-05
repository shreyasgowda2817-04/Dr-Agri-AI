import logging
import asyncio

logger = logging.getLogger(__name__)

async def send_welcome_email(user_email: str, user_name: str):
    """
    Simulated function to send a welcome email.
    In production, this would integrate with AWS SES, SendGrid, or Resend.
    """
    await asyncio.sleep(1) # Simulate network call
    print(f"\n{'='*50}\n[EMAIL SERVICE] Sending Welcome Email to {user_email}\nSubject: Welcome to Dr Agri AI, {user_name}!\nBody: We are thrilled to have you join our ecosystem. Complete your onboarding to get started.\n{'='*50}\n")
    logger.info(f"Welcome email sent to {user_email}")
    return True

async def send_purchase_receipt(user_email: str, order_id: str, amount: float):
    """
    Simulated function to send a purchase receipt.
    """
    await asyncio.sleep(1)
    print(f"\n{'='*50}\n[EMAIL SERVICE] Sending Receipt to {user_email}\nSubject: Dr Agri Marketplace Order #{order_id}\nBody: Thank you for your purchase of ${amount:.2f}. Your items are being prepared for shipping.\n{'='*50}\n")
    logger.info(f"Receipt email sent to {user_email} for order {order_id}")
    return True
