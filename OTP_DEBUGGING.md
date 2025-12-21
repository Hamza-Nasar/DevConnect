# OTP Debugging Guide

## Development Mode - OTP Console Logging

In **development mode**, OTP codes are **ALWAYS** logged to the server console (terminal) for easy testing.

### Where to Find OTP

When you request an OTP, check your **server terminal/console** where you ran `npm run dev`. You'll see:

```
============================================================
🔐 [DEV MODE] OTP GENERATED
============================================================
📱 Phone: +923001234567
🔑 OTP Code: 123456
⏱️  Valid for: 5 minutes
============================================================
```

### Common Scenarios

#### 1. ✅ OTP Logged Successfully
- **Action**: Check server console/terminal
- **Look for**: The OTP code displayed clearly
- **Use**: Enter this OTP code in the app

#### 2. ⚠️ Phone Not in WhatsApp Allowed List (Error 131030)
- **What happens**: OTP is logged to console instead of being sent via WhatsApp
- **Action**: Use the OTP from console for testing
- **To fix**: Add phone number to [Meta Business Suite](https://business.facebook.com/) → [WhatsApp Manager](https://business.facebook.com/wa/manage/home/) → API Setup → Manage phone number list
- **Direct Link**: [API Setup](https://business.facebook.com/wa/manage/getting-started/)

#### 3. ❌ WhatsApp Credentials Not Configured
- **What happens**: OTP is logged to console (development mode only)
- **Action**: Check console for OTP code
- **To fix**: Add `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to `.env.local`

### Quick Checklist

- [ ] Check server terminal/console (not browser console)
- [ ] Look for the OTP code displayed in a clear format
- [ ] OTP is valid for 5 minutes
- [ ] If WhatsApp credentials are set, OTP should also be sent via WhatsApp
- [ ] In development, console logging works even if WhatsApp fails

### Production Mode

In production:
- OTP is sent via WhatsApp only
- No console logging
- Phone number must be in allowed list
- Proper error messages shown to users

---

**Remember**: In development mode, **always check your server console** for the OTP code!

