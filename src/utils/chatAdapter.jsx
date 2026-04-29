// Rule-based booking chat adapter — collects all booking details
// Guides the tenant through picking service, date, time, name, phone, and vehicle size

const GREETINGS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];

function matchesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function buildReply(userText, conversationState = {}) {
  const t = userText.toLowerCase().trim();

  // Greeting
  if (matchesAny(t, GREETINGS) && !conversationState.greeted) {
    return {
      text: "Hi there! 👋 I can help you book a car wash. What service package would you like?\n\n• 🚿 Basic Wash\n• ✨ Full Detail\n• 🪑 Interior Clean\n• 🔆 Premium Package",
      state: { greeted: true }
    };
  }

  // Package selection
  if (!conversationState.package && (matchesAny(t, ["basic", "full detail", "interior", "premium", "wash", "detail", "clean", "package"]))) {
    let selectedPackage = null;
    if (matchesAny(t, ["basic"])) selectedPackage = "Basic Wash";
    else if (matchesAny(t, ["full detail", "full"])) selectedPackage = "Full Detail";
    else if (matchesAny(t, ["interior"])) selectedPackage = "Interior Clean";
    else if (matchesAny(t, ["premium"])) selectedPackage = "Premium Package";
    
    if (selectedPackage) {
      return {
        text: `Great! You selected **${selectedPackage}**. 🚗\n\nWhat's your vehicle size?\n• Sub-Compact\n• Small\n• Medium\n• Large\n• X-Large`,
        state: { ...conversationState, package: selectedPackage }
      };
    }
  }

  // Vehicle size selection
  if (conversationState.package && !conversationState.vehicleSize && 
      matchesAny(t, ["sub-compact", "sub compact", "small", "medium", "large", "x-large", "xlarge", "extra large"])) {
    let size = null;
    if (matchesAny(t, ["sub-compact", "sub compact"])) size = "Sub-Compact";
    else if (matchesAny(t, ["small"]) && !matchesAny(t, ["x-large", "xlarge"])) size = "Small";
    else if (matchesAny(t, ["medium"])) size = "Medium";
    else if (matchesAny(t, ["large"]) && !matchesAny(t, ["x-large", "xlarge", "extra"])) size = "Large";
    else if (matchesAny(t, ["x-large", "xlarge", "extra large"])) size = "X-Large";
    
    if (size) {
      return {
        text: `Perfect! **${size}** vehicle. 📅\n\nWhat date would you like to book? (e.g., tomorrow, May 15, or 05/15)`,
        state: { ...conversationState, vehicleSize: size }
      };
    }
  }

  // Date selection
  if (conversationState.vehicleSize && !conversationState.date) {
    const dateMatch = t.match(/\d{1,2}[\/\-]\d{1,2}/) || 
                     matchesAny(t, ["tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]) ||
                     /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/.test(t);
    
    if (dateMatch) {
      return {
        text: `Got it! ⏰ What time works for you?\n\nWe're open 8:00 AM – 6:00 PM.\n(e.g., 9am, 2:30pm, 10:00)`,
        state: { ...conversationState, date: userText }
      };
    }
  }

  // Time selection
  if (conversationState.date && !conversationState.time) {
    const timeMatch = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/.test(t) || matchesAny(t, ["morning", "afternoon", "evening"]);
    
    if (timeMatch) {
      return {
        text: `Excellent! 📝 Now I need your contact details.\n\nPlease provide your **full name** and **phone number**.\n\nExample: Juan Dela Cruz 09171234567`,
        state: { ...conversationState, time: userText }
      };
    }
  }

  // Name and phone extraction
  if (conversationState.time && (!conversationState.readyToConfirm)) {
    const phoneMatch = userText.match(/(?:\+63|0)?\s*9\d{2}\s*\d{3}\s*\d{4}/) || userText.match(/\d{10}/);
    const nameMatch = userText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/) || 
                     userText.match(/(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    
    // Determine current name and phone (from this message or previous state)
    const currentName = nameMatch ? nameMatch[1] : conversationState.name;
    const currentPhone = phoneMatch ? phoneMatch[0] : conversationState.phone;
    
    // Check if we now have both
    if (currentName && currentPhone) {
      return {
        text: `Perfect! ✅ Here's your booking summary:\n\n📦 Package: ${conversationState.package}\n🚗 Vehicle: ${conversationState.vehicleSize}\n📅 Date: ${conversationState.date}\n⏰ Time: ${conversationState.time}\n👤 Name: ${currentName}\n📱 Phone: ${currentPhone}\n\n**Confirm Booking?**\nType **"Yes"** to confirm or **"No"** to cancel.`,
        state: { 
          ...conversationState, 
          name: currentName,
          phone: currentPhone,
          readyToConfirm: true
        }
      };
    } else if (currentName && !currentPhone) {
      return {
        text: `Got your name! 👍 Now I just need your phone number.\n\nExample: 09171234567 or +639171234567`,
        state: { ...conversationState, name: currentName }
      };
    } else if (currentPhone && !currentName) {
      return {
        text: `Got your phone! 👍 Now I just need your full name.\n\nExample: Juan Dela Cruz`,
        state: { ...conversationState, phone: currentPhone }
      };
    }
  }

  // Help responses
  if (matchesAny(t, ["price", "cost", "how much", "fee", "rate"])) {
    return { text: "Pricing depends on your vehicle size and chosen package. You can see the full price list in the packages section on this page. 💰", state: conversationState };
  }

  if (matchesAny(t, ["cancel", "reschedule", "change"])) {
    return { text: "To cancel or reschedule, please contact us directly via the phone number or social links shown on this page. 📞", state: conversationState };
  }

  if (matchesAny(t, ["payment", "pay", "gcash", "cash", "bank"])) {
    return { text: "We accept Cash, GCash, and bank transfer. You can upload your payment proof in the booking form. 💳", state: conversationState };
  }

  if (matchesAny(t, ["thank", "thanks", "ok", "okay", "got it", "perfect", "great"])) {
    return { text: "You're welcome! 😊 Feel free to ask if you need anything else. Happy to help!", state: conversationState };
  }

  // Default fallback
  return { 
    text: "I'm here to help you book a car wash! Let's start with selecting a service package:\n\n• 🚿 Basic Wash\n• ✨ Full Detail\n• 🪑 Interior Clean\n• 🔆 Premium Package", 
    state: conversationState 
  };
}

export function createBookingAdapter() {
  let conversationState = {};
  
  return {
    async sendMessage({ message }) {
      // Extract text from message parts (MUI X Chat message format)
      const userText = message.parts?.[0]?.type === "text" ? message.parts[0].text : "";
      const result = buildReply(userText, conversationState);
      
      // Update conversation state
      conversationState = result.state || conversationState;
      
      // If user confirmed, populate form and submit
      if (conversationState.confirmed && window.updateBookingForm && window.submitBookingForm) {
        window.updateBookingForm(conversationState);
        // Submit after a short delay to allow form to update
        setTimeout(() => {
          window.submitBookingForm();
        }, 500);
      }

      // Return a ReadableStream with the required chunk protocol
      return new ReadableStream({
        start(controller) {
          const messageId = `msg-${Date.now()}`;
          const textId = `text-${Date.now()}`;

          // Simulate a short delay for natural feel
          setTimeout(() => {
            controller.enqueue({ type: "start", messageId });
            controller.enqueue({ type: "text-start", id: textId });
            controller.enqueue({ type: "text-delta", id: textId, delta: result.text });
            controller.enqueue({ type: "text-end", id: textId });
            controller.enqueue({ type: "finish", messageId });
            controller.close();
          }, 400);
        },
      });
    },
  };
}

// Initial welcome message
export const INITIAL_MESSAGES = [
  {
    id: "welcome-1",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hi! What can I do for you today? 😊",
      },
    ],
  },
  {
    id: "welcome-2",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "I can help you book a car wash! Just tell me:\n• 📦 Which service package\n• � Your vehicle size\n• 📅 Preferred date & time\n• � Your name & phone\n\nLet's get started!",
      },
    ],
  },
];

// Extract contact information from user message
export function extractContactInfo(text) {
  const info = {};
  
  // Extract phone number (Philippine format)
  const phonePatterns = [
    /(?:\+63|0)?\s*9\d{2}\s*\d{3}\s*\d{4}/g,
    /(?:\+63|0)?\s*\d{10}/g,
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      let phone = match[0].replace(/\s/g, "");
      if (phone.startsWith("0")) {
        phone = "+63" + phone.slice(1);
      } else if (!phone.startsWith("+")) {
        phone = "+63" + phone;
      }
      info.phone = phone;
      break;
    }
  }
  
  // Extract name
  const namePatterns = [
    /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/m,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      info.customerName = match[1].trim();
      break;
    }
  }
  
  return Object.keys(info).length > 0 ? info : null;
}
