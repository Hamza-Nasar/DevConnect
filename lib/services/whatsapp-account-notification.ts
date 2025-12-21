/**
 * WhatsApp Account Creation Notification Service
 * Sends account creation confirmation using template messages
 */

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface AccountNotificationParams {
  phone: string;
  userName: string;
  verificationText: string;
  verificationToken: string;
  verificationUrl: string;
}

const ACCOUNT_TEMPLATE_NAME = process.env.WHATSAPP_ACCOUNT_TEMPLATE_NAME || "devconnect";
const ACCOUNT_TEMPLATE_LANGUAGE = process.env.WHATSAPP_ACCOUNT_TEMPLATE_LANGUAGE || "en";

/**
 * Send account creation confirmation via WhatsApp
 */
export async function sendAccountCreationNotification({
  phone,
  userName,
  verificationText,
  verificationToken,
  verificationUrl,
}: AccountNotificationParams): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  // Format phone number
  let formattedPhone = phone.trim();
  if (formattedPhone.startsWith("whatsapp:")) {
    formattedPhone = formattedPhone.replace("whatsapp:", "");
  }
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+${formattedPhone}`;
  }

  // Build the verification URL with token
  const fullVerificationUrl = `${verificationUrl}/${verificationToken}`;

  // Template message payload for account creation
  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: ACCOUNT_TEMPLATE_NAME,
      language: {
        code: ACCOUNT_TEMPLATE_LANGUAGE,
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: userName, // {{1}} - User's name
            },
            {
              type: "text",
              text: verificationText, // {{2}} - Verification text (e.g., "your email")
            },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: 0, // First button (Verify account)
          parameters: [
            {
              type: "text",
              text: verificationToken, // {{1}} in URL - Verification token
            },
          ],
        },
      ],
    },
  };

  try {
    // Use the WhatsApp Business API service
    const result = await sendWhatsAppMessage(payload);
    return result;
  } catch (error: any) {
    console.error("Account notification error:", error);
    return {
      success: false,
      error: error.message || "Failed to send account notification",
    };
  }
}

/**
 * Helper function to send WhatsApp message (used internally)
 */
async function sendWhatsAppMessage(payload: any): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  const GRAPH_API_VERSION = "v18.0";
  const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return {
      success: false,
      error: "WhatsApp Business API credentials not configured",
    };
  }

  const url = `${GRAPH_API_BASE_URL}/${phoneNumberId}/messages`;

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
      return {
        success: false,
        error: data.error?.message || "Failed to send message",
      };
    }

    if (data.messages && data.messages[0]?.id) {
      return {
        success: true,
        messageId: data.messages[0].id,
      };
    }

    return {
      success: false,
      error: "Unexpected response from WhatsApp API",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to send message",
    };
  }
}

