export type Lang = "hinglish" | "hindi" | "english";

interface AuthCopy {
  tagline: string;
  sending: string;
  sendOtp: string;
  sendMagicLink: string;
  phoneInvalidCountry: string;
  phoneInvalidFormat: string;
  phoneProviderError: string;
  genericError: string;
  otpMaxAttempts: string;
  otpInvalid: string;
  linkSent: string;
  emailSentDesc: (email: string) => string;
  verifying: string;
  verify: string;
  resendLink: string;
  resendOtp: string;
  otpNotReceived: string;
  tryEmail: string;
  otpSentTo: (phone: string) => string;
  back: string;
}

interface ChatCopy {
  online: string;
  fallbackWelcome: (name: string) => string;
  sessionExpired: string;
  messageNotSent: string;
  connectionBroken: string;
  aiError: string;
  limitAnon: string;
  limitDaily: string;
  limitPlaceholder: string;
  inputPlaceholder: string;
}

interface SettingsCopy {
  title: string;
  sectionCompanion: string;
  sectionMemories: string;
  sectionNotifications: string;
  sectionAccount: string;
  editBtn: string;
  save: string;
  saving: string;
  cancel: string;
  nameLabel: string;
  toneLabel: string;
  expectationLabel: string;
  expectationPlaceholder: string;
  personaSaved: (name: string) => string;
  personaSaveError: string;
  memoryDeleteError: string;
  memoriesLoadError: string;
  memoriesRetry: string;
  memoriesEmpty: string;
  dailyReminder: string;
  signOut: string;
}

interface OnboardingCopy {
  // Steps 0-2
  intro: string;
  meetHeading: string;
  meetSub: string;
  ctaNext: string;
  intakeHeading: string;
  intakeSub: string;
  nameQ: string;
  nameP: string;
  cityQ: string;
  cityP: string;
  sitQ: string;
  sitP: string;
  // Steps 3-5
  companionNameHeading: string;
  companionNameSub: string;
  companionNamePlaceholder: string;
  toneHeading: string;
  toneSub: string;
  toneHalkaPhulka: string;
  tonePushKartaRahe: string;
  tonePractical: string;
  toneBinaAdvice: string;
  toneFreeTextPlaceholder: string;
  expectationHeading: string;
  expectationSub: string;
  expectationPlaceholder: string;
  expectationHint: string;
  startChatting: string;
  next: string;
  back: string;
}

export interface LangCopy {
  auth: AuthCopy;
  chat: ChatCopy;
  settings: SettingsCopy;
  onboarding: OnboardingCopy;
}

export const COPY: Record<Lang, LangCopy> = {
  hinglish: {
    auth: {
      tagline: "Tera apna dost",
      sending: "Bhej raha hoon...",
      sendOtp: "OTP Bhejo",
      sendMagicLink: "Magic Link Bhejo",
      phoneInvalidCountry: "Country code zaruri hai (e.g. +91 98765 43210)",
      phoneInvalidFormat: "Valid phone number daalo",
      phoneProviderError: "Phone OTP abhi available nahi. Email se try karo.",
      genericError: "Kuch gadbad ho gayi, dobara try karo.",
      otpMaxAttempts: "Galat OTP hai. Dobara bhejo?",
      otpInvalid: "OTP galat hai, dobara try karo.",
      linkSent: "Link bhej diya!",
      emailSentDesc: (email) => `${email} pe ek login link hai — email kholo aur click karo.`,
      verifying: "Verify ho raha hai...",
      verify: "Verify Karo",
      resendLink: "Link dobara bhejo",
      resendOtp: "OTP dobara bhejo",
      otpNotReceived: "OTP nahi aaya?",
      tryEmail: "Email se try karo",
      otpSentTo: (phone) => `OTP bheja ${phone} pe`,
      back: "Wapas jao",
    },
    chat: {
      online: "online",
      fallbackWelcome: (name) => `Hey yaar! Main ${name} hoon. Bol, kya chal raha hai? 😊`,
      sessionExpired: "Session expire ho gaya. Login karo dobara.",
      messageNotSent: "Message nahi gaya. Internet check kar. 📶",
      connectionBroken: "Connection toot gayi. Jo aaya woh dikha diya. 📶",
      aiError: "Yaar, kuch gadbad ho gayi. Thodi der baad try karo.",
      limitAnon: "Yaar, free messages khatam! Sign up karo aur baat karte hain. 🙏",
      limitDaily: "Yaar, aaj ke 20 free messages ho gaye. Kal phir baat karte hain! 🌙",
      limitPlaceholder: "Daily limit reached. Kal phir aana! 🙏",
      inputPlaceholder: "Kuch bhi bolo yaar...",
    },
    settings: {
      title: "Settings",
      sectionCompanion: "Companion",
      sectionMemories: "Memories",
      sectionNotifications: "Notifications",
      sectionAccount: "Account",
      editBtn: "Edit →",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      nameLabel: "Name",
      toneLabel: "Tone",
      expectationLabel: "Expectation",
      expectationPlaceholder: "Tujhse kya chahiye...",
      personaSaved: (name) => `Done! ${name} ab waise hi behave karega.`,
      personaSaveError: "Save nahi hua. Dobara try karo.",
      memoryDeleteError: "Memory nahi hata. Dobara try karo.",
      memoriesLoadError: "Memories load nahi hui. Refresh karo.",
      memoriesRetry: "Dobara try karo",
      memoriesEmpty: "Abhi kuch yaad nahi — thoda aur baat karo!",
      dailyReminder: "Daily reminder",
      signOut: "Sign out",
    },
    onboarding: {
      intro: "Main Arjun hoon — tera apna dost. Job stress ho, relationships mein confusion ho, ya bas vent karna ho — yahan bata. Koi judgment nahi, sab confidential.",
      meetHeading: "Main Arjun hoon",
      meetSub: "Tera apna dost",
      ctaNext: "Haan, let's go!",
      intakeHeading: "Thoda aur bata apne baare mein",
      intakeSub: "Taaki woh tujhe better samajh sake",
      nameQ: "Tera naam kya hai?",
      nameP: "Apna naam batao...",
      cityQ: "Kahan se ho?",
      cityP: "Apna city batao...",
      sitQ: "Aaj kya chal raha hai life mein?",
      sitP: "Kuch bhi share karo, koi judgment nahi...",
      companionNameHeading: "Usse kya bulaaun?",
      companionNameSub: "Iska naam rakh — jo chahe. Default hai ‘Arjun’.",
      companionNamePlaceholder: "Arjun",
      toneHeading: "Main kaisa behave karun?",
      toneSub: "Apne hisaab se choose kar.",
      toneHalkaPhulka: "Halka phulka",
      tonePushKartaRahe: "Push karta rahe",
      tonePractical: "Practical advice",
      toneBinaAdvice: "Bina advice ke",
      toneFreeTextPlaceholder: "Ya apne words mein batao... (optional)",
      expectationHeading: "Tujhse kya chahiye mujhe?",
      expectationSub: "Honest reh — yahi kaam aayega.",
      expectationPlaceholder: "Jaise — vent karna hai, ya solution chahiye,\nya bas koi sun le...",
      expectationHint: "Thoda aur batao...",
      startChatting: "Start chatting →",
      next: "Next →",
      back: "Back",
    },
  },

  hindi: {
    auth: {
      tagline: "आपका अपना दोस्त",
      sending: "भेज रहा हूँ...",
      sendOtp: "OTP भेजें",
      sendMagicLink: "Magic Link भेजें",
      phoneInvalidCountry: "Country code ज़रूरी है (जैसे +91 98765 43210)",
      phoneInvalidFormat: "सही phone number डालें",
      phoneProviderError: "Phone OTP अभी उपलब्ध नहीं। Email से try करें।",
      genericError: "कुछ गड़बड़ हो गई, दोबारा try करें।",
      otpMaxAttempts: "OTP गलत है। दोबारा भेजें?",
      otpInvalid: "OTP गलत है, दोबारा try करें।",
      linkSent: "Link भेज दिया!",
      emailSentDesc: (email) => `${email} पर एक login link है — email खोलें और click करें।`,
      verifying: "Verify हो रहा है...",
      verify: "Verify करें",
      resendLink: "Link दोबारा भेजें",
      resendOtp: "OTP दोबारा भेजें",
      otpNotReceived: "OTP नहीं आया?",
      tryEmail: "Email से try करें",
      otpSentTo: (phone) => `OTP भेजा ${phone} पर`,
      back: "वापस जाएं",
    },
    chat: {
      online: "ऑनलाइन",
      fallbackWelcome: (name) => `Hey यार! मैं ${name} हूँ। बोलो, क्या चल रहा है? 😊`,
      sessionExpired: "Session expire हो गया। दोबारा login करें।",
      messageNotSent: "Message नहीं गया। Internet check करें। 📶",
      connectionBroken: "Connection टूट गई। जो आया वो दिखा दिया। 📶",
      aiError: "यार, कुछ गड़बड़ हो गई। थोड़ी देर बाद try करें।",
      limitAnon: "यार, free messages खत्म! Sign up करो और बात करते हैं। 🙏",
      limitDaily: "यार, आज के 20 free messages हो गए। कल फिर बात करते हैं! 🌙",
      limitPlaceholder: "Daily limit हो गई। कल फिर आना! 🙏",
      inputPlaceholder: "कुछ भी बोलो यार...",
    },
    settings: {
      title: "Settings",
      sectionCompanion: "Companion",
      sectionMemories: "Memories",
      sectionNotifications: "Notifications",
      sectionAccount: "Account",
      editBtn: "Edit →",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      nameLabel: "नाम",
      toneLabel: "Tone",
      expectationLabel: "उम्मीद",
      expectationPlaceholder: "तुझसे क्या चाहिए...",
      personaSaved: (name) => `Done! ${name} अब वैसे ही behave करेगा।`,
      personaSaveError: "Save नहीं हुआ। दोबारा try करें।",
      memoryDeleteError: "Memory नहीं हटी। दोबारा try करें।",
      memoriesLoadError: "Memories load नहीं हुई। Refresh करें।",
      memoriesRetry: "दोबारा try करें",
      memoriesEmpty: "अभी कुछ याद नहीं — थोड़ा और बात करो!",
      dailyReminder: "Daily reminder",
      signOut: "Sign out",
    },
    onboarding: {
      intro: "मैं अर्जुन हूँ — आपका अपना दोस्त। जॉब स्ट्रेस हो, रिश्तों में उलझन हो, या बस कुछ कहना हो — यहाँ बताएं। कोई judgment नहीं, सब confidential।",
      meetHeading: "मैं अर्जुन हूँ",
      meetSub: "आपका अपना दोस्त",
      ctaNext: "हाँ, चलते हैं!",
      intakeHeading: "थोड़ा और बताएं अपने बारे में",
      intakeSub: "ताकि वो आपको बेहतर समझ सके",
      nameQ: "आपका नाम क्या है?",
      nameP: "अपना नाम बताएं...",
      cityQ: "आप कहाँ से हैं?",
      cityP: "अपना शहर बताएं...",
      sitQ: "आज जीवन में क्या चल रहा है?",
      sitP: "कुछ भी साझा करें, कोई judgment नहीं...",
      companionNameHeading: "उसे क्या बुलाऊं?",
      companionNameSub: "इसका नाम रखो — जो चाहो। Default है ‘Arjun’।",
      companionNamePlaceholder: "Arjun",
      toneHeading: "मैं कैसे behave करूं?",
      toneSub: "अपने हिसाब से choose करो।",
      toneHalkaPhulka: "हल्का फुल्का",
      tonePushKartaRahe: "Push करता रहे",
      tonePractical: "Practical सलाह",
      toneBinaAdvice: "बिना advice के",
      toneFreeTextPlaceholder: "या अपने words में बताओ... (optional)",
      expectationHeading: "तुझसे क्या चाहिए मुझे?",
      expectationSub: "Honest रहो — यही काम आएगा।",
      expectationPlaceholder: "जैसे — vent करना है, या solution चाहिए,\nया बस कोई सुन ले...",
      expectationHint: "थोड़ा और बताओ...",
      startChatting: "बात शुरू करें →",
      next: "Next →",
      back: "Back",
    },
  },

  english: {
    auth: {
      tagline: "Your personal friend",
      sending: "Sending...",
      sendOtp: "Send OTP",
      sendMagicLink: "Send Magic Link",
      phoneInvalidCountry: "Country code required (e.g. +91 98765 43210)",
      phoneInvalidFormat: "Enter a valid phone number",
      phoneProviderError: "Phone OTP is unavailable. Try with email.",
      genericError: "Something went wrong, try again.",
      otpMaxAttempts: "Wrong OTP. Resend?",
      otpInvalid: "Incorrect OTP, try again.",
      linkSent: "Link sent!",
      emailSentDesc: (email) => `A login link was sent to ${email} — open your email and click it.`,
      verifying: "Verifying...",
      verify: "Verify",
      resendLink: "Resend link",
      resendOtp: "Resend OTP",
      otpNotReceived: "Didn’t get the OTP?",
      tryEmail: "Try with email",
      otpSentTo: (phone) => `OTP sent to ${phone}`,
      back: "Go back",
    },
    chat: {
      online: "online",
      fallbackWelcome: (name) => `Hey! I’m ${name}. What’s going on? 😊`,
      sessionExpired: "Session expired. Please log in again.",
      messageNotSent: "Message not sent. Check your internet. 📶",
      connectionBroken: "Connection dropped. Showing what arrived. 📶",
      aiError: "Something went wrong. Try again in a moment.",
      limitAnon: "Free messages used up! Sign up to keep chatting. 🙏",
      limitDaily: "You’ve used today’s 20 free messages. See you tomorrow! 🌙",
      limitPlaceholder: "Daily limit reached. Come back tomorrow! 🙏",
      inputPlaceholder: "Say anything…",
    },
    settings: {
      title: "Settings",
      sectionCompanion: "Companion",
      sectionMemories: "Memories",
      sectionNotifications: "Notifications",
      sectionAccount: "Account",
      editBtn: "Edit →",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      nameLabel: "Name",
      toneLabel: "Tone",
      expectationLabel: "Expectation",
      expectationPlaceholder: "What do you expect from me…",
      personaSaved: (name) => `Done! ${name} will behave that way now.`,
      personaSaveError: "Couldn’t save. Try again.",
      memoryDeleteError: "Couldn’t delete memory. Try again.",
      memoriesLoadError: "Couldn’t load memories. Refresh.",
      memoriesRetry: "Try again",
      memoriesEmpty: "Nothing remembered yet — chat a bit more!",
      dailyReminder: "Daily reminder",
      signOut: "Sign out",
    },
    onboarding: {
      intro: "I’m Arjun — your personal friend. Job stress, relationship confusion, or just need to vent — tell me here. Zero judgment, completely confidential.",
      meetHeading: "I’m Arjun",
      meetSub: "Your personal friend",
      ctaNext: "Yeah, let’s go!",
      intakeHeading: "Tell me a bit about yourself",
      intakeSub: "So they can understand you better",
      nameQ: "What’s your name?",
      nameP: "Tell me your name…",
      cityQ: "Where are you from?",
      cityP: "Your city…",
      sitQ: "What’s going on in your life today?",
      sitP: "Share anything, zero judgment…",
      companionNameHeading: "What should I call them?",
      companionNameSub: "Give them a name — whatever you like. Default is ‘Arjun’.",
      companionNamePlaceholder: "Arjun",
      toneHeading: "How should I behave?",
      toneSub: "Choose what fits you.",
      toneHalkaPhulka: "Light & easy",
      tonePushKartaRahe: "Keeps pushing you",
      tonePractical: "Practical advice",
      toneBinaAdvice: "No advice, just listen",
      toneFreeTextPlaceholder: "Or describe in your own words… (optional)",
      expectationHeading: "What do I want from you?",
      expectationSub: "Be honest — it’ll help.",
      expectationPlaceholder: "Like — I just need to vent, or I want solutions,\nor just someone to listen…",
      expectationHint: "Tell me a little more…",
      startChatting: "Start chatting →",
      next: "Next →",
      back: "Back",
    },
  },
};
