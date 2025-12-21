/**
 * WhatsApp Business API Service
 * Uses Meta (Facebook) Graph API to send WhatsApp messages
 */

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Get credentials from environment variables
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Template message name (if using templates - recommended for OTP)
// Create this template in Meta Business Suite → WhatsApp Manager → Message Templates
// Only use template if explicitly set in environment variables
const OTP_TEMPLATE_NAME = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
const OTP_TEMPLATE_LANGUAGE = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || "en";

export interface WhatsAppMessageResponse {
  success: boolean;
  error?: string;
  messageId?: string;
  errorCode?: string;
}

/**
 * Send WhatsApp OTP message using WhatsApp Business API
 */
export async function sendWhatsAppOTP(
  phone: string,
  otp: string
): Promise<WhatsAppMessageResponse> {
  // Development mode: Always log OTP to console for easy testing
  const isDev = process.env.NODE_ENV === "development";
  
  if (isDev) {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 [DEV MODE] OTP GENERATED");
    console.log("=".repeat(60));
    console.log("📱 Phone:", phone);
    console.log("🔑 OTP Code:", otp);
    console.log("⏱️  Valid for: 5 minutes");
    console.log("=".repeat(60) + "\n");
  }

  // Development mode: Log OTP to console if credentials not configured
  if (!accessToken || !phoneNumberId) {
    if (isDev) {
      console.log(
        "⚠️  WhatsApp credentials not configured. OTP shown above for testing."
      );
      console.log(
        "💡 To enable WhatsApp sending, set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID"
      );
      return { success: true }; // Allow in dev mode
    }
    return {
      success: false,
      error:
        "WhatsApp Business API credentials not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment variables.",
    };
  }

  // Format phone number (remove whatsapp: prefix if present, ensure it starts with +)
  let formattedPhone = phone.trim();
  if (formattedPhone.startsWith("whatsapp:")) {
    formattedPhone = formattedPhone.replace("whatsapp:", "");
  }
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+${formattedPhone}`;
  }

  // WhatsApp Business API endpoint
  const url = `${GRAPH_API_BASE_URL}/${phoneNumberId}/messages`;

  // Determine which message type to use
  // If template name is configured in env, use template (more reliable)
  // Otherwise, use text message (only works within 24-hour window)
  const useTemplate = !!OTP_TEMPLATE_NAME;
  
  let payload: any;
  
  if (useTemplate) {
    // Template message payload (recommended for OTP)
    // Template messages don't have 24-hour window restriction
    payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: OTP_TEMPLATE_NAME,
        language: {
          code: OTP_TEMPLATE_LANGUAGE,
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp, // The OTP code
              },
            ],
          },
        ],
      },
    };
    
    if (isDev) {
      console.log("📋 Using template message:", OTP_TEMPLATE_NAME);
    }
  } else {
    // Text message payload (fallback - only works within 24-hour window)
    // WhatsApp allows text messages only within 24-hour window after user messages you
    // For production, use template messages which don't have this restriction
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: {
        preview_url: false,
        body: `Your DevConnect verification code is ${otp}. Valid for 5 minutes.`,
      },
    };
    
    if (isDev) {
      console.log("⚠️  Using text message (24-hour window restriction applies)");
      console.log("💡 For reliable delivery, create a template message in Meta Business Suite");
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      
      const errorCode = data.error?.code;
      const errorMessage = data.error?.message || data.error?.error_user_msg || "Failed to send WhatsApp message";
      
      // Handle specific error codes
      if (errorCode === 131030) {
        // Recipient phone number not in allowed list
        // In development mode, fall back to console logging
        if (isDev) {
          console.log("\n" + "⚠️".repeat(30));
          console.log("⚠️  WhatsApp API Error: Phone number not in allowed list");
          console.log("⚠️".repeat(30));
          console.log("📱 Phone:", formattedPhone);
          console.log("🔑 OTP Code:", otp, "(Use this OTP for testing)");
          console.log("💡 To enable WhatsApp sending:");
          console.log("   1. Go to https://business.facebook.com");
          console.log("   2. Navigate to WhatsApp Manager → API Setup");
          console.log("   3. Find 'Manage phone number list'");
          console.log("   4. Add your phone number:", formattedPhone);
          console.log("⚠️".repeat(30) + "\n");
          return { success: true }; // Allow in dev mode with console fallback
        }
        
        return {
          success: false,
          error: "This phone number is not registered in our WhatsApp system. Please contact support or use email login.",
          errorCode: "PHONE_NOT_ALLOWED",
        };
      }
      
      // Error code 131047: Message failed to send (usually 24-hour window expired)
      if (errorCode === 131047 || errorMessage?.includes("24 hour") || errorMessage?.includes("message window")) {
        if (isDev) {
          console.log("\n" + "⚠️".repeat(30));
          console.log("⚠️  WhatsApp API Error: 24-hour messaging window expired");
          console.log("⚠️".repeat(30));
          console.log("📱 Phone:", formattedPhone);
          console.log("🔑 OTP Code:", otp, "(Use this OTP for testing)");
          console.log("💡 Solution:");
          console.log("   1. User must send you a message first, OR");
          console.log("   2. Create a template message in Meta Business Suite");
          console.log("   3. Go to WhatsApp Manager → Message Templates");
          console.log("   4. Create an OTP template and use it instead");
          console.log("⚠️".repeat(30) + "\n");
          return { success: true }; // Allow in dev mode with console fallback
        }
        
        return {
          success: false,
          error: "Cannot send message. Please contact support or use email login.",
          errorCode: "MESSAGE_WINDOW_EXPIRED",
        };
      }
      
      // For other errors, return the error message
      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode?.toString(),
      };
    }

    // Success response
    if (data.messages && data.messages[0]?.id) {
      const messageId = data.messages[0].id;
      
      if (isDev) {
        console.log("✅ WhatsApp API accepted the message!");
        console.log("📨 Message ID:", messageId);
        console.log("📱 Sent to:", formattedPhone);
        console.log("⚠️  IMPORTANT: Free-form text messages only work if:");
        console.log("   1. User has messaged you in the last 24 hours, OR");
        console.log("   2. You use pre-approved template messages");
        console.log("💡 If message not received, check Meta Business Suite → WhatsApp Manager → Message Templates");
        console.log("💡 For OTP, consider creating a template message for better delivery");
      }
      
      // Check message status after a brief delay (optional - for better debugging)
      // Note: Message might be accepted but not delivered if outside 24-hour window
      
      return {
        success: true,
        messageId: messageId,
      };
    }

    return {
      success: false,
      error: "Unexpected response from WhatsApp API",
    };
  } catch (error: any) {
    console.error("WhatsApp Business API send error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp OTP",
    };
  }
}

/**
 * Check if WhatsApp Business API is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(accessToken && phoneNumberId);
}

/**
 * Get WhatsApp Business Account ID (for reference)
 */
export function getWhatsAppBusinessAccountId(): string | undefined {
  return process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
}

