import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppOTP(phone: string, otp: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Development mode: Log OTP to console if Twilio not configured
  if (!accountSid || !authToken) {
    if (process.env.NODE_ENV === "development") {
      console.log("🔐 [DEV MODE] WhatsApp OTP for", phone, ":", otp);
      console.log("⚠️  In production, set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
      return { success: true }; // Allow in dev mode
    }
    return {
      success: false,
      error: "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables.",
    };
  }

  if (!client) {
    return {
      success: false,
      error: "Twilio client not initialized",
    };
  }

  try {
    const message = await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${phone}`,
      body: `Your DevConnect verification code is ${otp}. Valid for 5 minutes.`,
    });

    if (message.sid) {
      return { success: true };
    } else {
      return {
        success: false,
        error: "Failed to send WhatsApp message",
      };
    }
  } catch (error: any) {
    console.error("Twilio WhatsApp send error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp OTP",
    };
  }
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && whatsappNumber);
}

