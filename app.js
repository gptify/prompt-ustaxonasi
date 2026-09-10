/**
 * GPTify Uzbekistan — Standalone Prompt Ustaxonasi Telegram Mini App
 * Complete generator formulas, categorized business templates & variables builder
 */

// =============================================================================
// 0. CONFIGURATION & SAFE AI KILL-SWITCH
// =============================================================================
const USE_GEMINI_AI = false; // Default: Offline safe mode ($0, unlimited, instant)
const MAX_DAILY_AI_CALLS = 5;

function checkAndIncrementAiCalls() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem("gptify_ai_date");
    let count = parseInt(localStorage.getItem("gptify_ai_count") || "0", 10);
    if (storedDate !== today) {
      count = 0;
      localStorage.setItem("gptify_ai_date", today);
    }
    if (count >= MAX_DAILY_AI_CALLS) {
      return false;
    }
    localStorage.setItem("gptify_ai_count", (count + 1).toString());
    return true;
  } catch (e) {
    return true;
  }
}

// =============================================================================
// FAVORITES / BOOKMARKS SYSTEM ("⭐ Saqlanganlar")
// =============================================================================
function getFavorites() {
  try {
    const raw = localStorage.getItem("gptify_fav_prompts");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id, btnEl) {
  let favs = getFavorites();
  const idx = favs.indexOf(id);
  let added = false;
  if (idx > -1) {
    favs.splice(idx, 1);
    added = false;
  } else {
    favs.push(id);
    added = true;
  }
  try {
    localStorage.setItem("gptify_fav_prompts", JSON.stringify(favs));
  } catch (e) {}

  triggerHaptic("impact");
  showToast(added ? "⭐ Saqlanganlarga qo'shildi!" : "Saqlanganlardan olib tashlandi");

  if (btnEl) {
    btnEl.classList.toggle("active", added);
    btnEl.innerHTML = added ? "★" : "☆";
  }

  // If currently on favorites filter, immediately refresh list
  if (currentLibraryCategory === "favorites") {
    applyLibraryFilters();
  }
  return added;
}

// =============================================================================
// 1. TELEGRAM WEBAPP SDK INITIALIZATION & HAPTICS
// =============================================================================
function getTg() {
  return window.Telegram?.WebApp;
}

function initTelegram() {
  const tg = getTg();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      if (tg.BackButton) {
        tg.BackButton.onClick(handleBackClick);
      }
    } catch (e) {
      console.warn("TG initialization note:", e);
    }
  }
}

function updateBackButton() {
  const tg = getTg();
  if (!tg?.BackButton) return;
  const outputCard = document.getElementById("generatorOutputCard");
  const isOutputVisible = outputCard && outputCard.style.display === "block";
  const isNotHome = (currentSubnav !== "generator") || isOutputVisible;
  if (isNotHome) {
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}

function handleBackClick() {
  triggerHaptic("light");
  const outputCard = document.getElementById("generatorOutputCard");
  const isOutputVisible = outputCard && outputCard.style.display === "block";

  if (isOutputVisible && currentSubnav === "generator") {
    resetToNewPrompt();
  } else {
    switchSubnav("generator");
  }
}

function resetToNewPrompt() {
  triggerHaptic("light");
  const outputCard = document.getElementById("generatorOutputCard");
  if (outputCard) {
    outputCard.style.display = "none";
  }
  const inputEl = document.getElementById("generatorInput");
  if (inputEl) {
    inputEl.value = "";
    inputEl.focus();
  }
  currentGeneratedPrompt = "";
  switchSubnav("generator");
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateBackButton();
  showToast("Yangi prompt maydoni tayyor! ✨");
}

function triggerHaptic(type = "light") {
  try {
    const tg = getTg();
    if (tg?.HapticFeedback) {
      if (type === "success" || type === "error" || type === "warning") {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  } catch (e) {}
}

function openExternalUrl(url) {
  const tg = getTg();
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// Toast Notification
let toastTimer = null;
function showToast(text) {
  const toast = document.getElementById("tmaToast");
  const textEl = document.getElementById("tmaToastText");
  if (toast && textEl) {
    textEl.textContent = text;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }
}

// Clipboard Copy Helper with Fallback
function copyText(txt, successMsg = "Prompt nusxalandi! 📋") {
  if (!txt) {
    showToast("Nusxalash uchun matn topilmadi!");
    return;
  }
  triggerHaptic("success");

  function fallbackCopy(str) {
    try {
      const ta = document.createElement("textarea");
      ta.value = str;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(successMsg);
    } catch (e) {
      showToast("Nusxalandi! 📋");
    }
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(txt).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopy(txt);
    });
  } else {
    fallbackCopy(txt);
  }
}

// =============================================================================
// 2. SUB-NAVIGATION (GENERATOR / BIZNES QOLIPLARI / KUTUBXONA)
// =============================================================================
let currentSubnav = "generator";

function switchSubnav(navKey) {
  triggerHaptic("light");
  currentSubnav = navKey;

  const btnGen = document.getElementById("tabBtnGenerator");
  const btnTpl = document.getElementById("tabBtnTemplates");
  const btnLib = document.getElementById("tabBtnLibrary");

  const bnavGen = document.getElementById("bnav-gen");
  const bnavTpl = document.getElementById("bnav-tpl");
  const bnavLib = document.getElementById("bnav-lib");

  const viewGen = document.getElementById("generatorView");
  const viewTpl = document.getElementById("templatesView");
  const viewLib = document.getElementById("libraryView");

  if (btnGen) btnGen.classList.toggle("active", navKey === "generator");
  if (btnTpl) btnTpl.classList.toggle("active", navKey === "templates");
  if (btnLib) btnLib.classList.toggle("active", navKey === "library");

  if (bnavGen) bnavGen.classList.toggle("active", navKey === "generator");
  if (bnavTpl) bnavTpl.classList.toggle("active", navKey === "templates");
  if (bnavLib) bnavLib.classList.toggle("active", navKey === "library");

  if (viewGen) viewGen.style.display = (navKey === "generator" ? "flex" : "none");
  if (viewTpl) viewTpl.style.display = (navKey === "templates" ? "flex" : "none");
  if (viewLib) viewLib.style.display = (navKey === "library" ? "flex" : "none");

  if (navKey === "templates") {
    renderTemplateCards(currentCategory);
  } else if (navKey === "library") {
    applyLibraryFilters();
  }

  updateBackButton();
}

// =============================================================================
// 3. AI PROMPT GENERATOR (MULTI-MODEL PLAYGROUND)
// =============================================================================
let currentModel = "chatgpt";
let currentGeneratedPrompt = "";

// =============================================================================
// 2.5 DAILY PROMPT OF THE DAY SYSTEM
// =============================================================================
const DAILY_PROMPTS = [
  {
    day: "Yakshanba",
    title: "Dam Olish Kuni va Haftalik Tahlil",
    prompt: "O'tgan haftadagi 5 ta asosiy ish va loyihani tahlil qilib, kelasi haftada vaqtni 30% tejash va daromadni oshirish uchun shaxsiy haftalik reja (Weekly Review) tuzib ber."
  },
  {
    day: "Dushanba",
    title: "Haftani Kuchli Boshlash (Sotuv Strategiyasi)",
    prompt: "Biznesimiz uchun dushanbadan boshlab yangi mijozlar oqimini jalb qiluvchi 3 ta noodatiy marketing taklifi va bitta kuchli sotuvchi e'lon matnini yoz."
  },
  {
    day: "Seshanba",
    title: "Reels va Kontent G'oyalari (Kopirayting)",
    prompt: "Instagram va TikTok uchun tomoshabinni birinchi 3 soniyada to'xtatuvchi 5 ta virusli Reels g'oyasi va har biriga kutilmagan ssenariy yoz."
  },
  {
    day: "Chorshanba",
    title: "E-Commerce & Savdo Optimizatsiyasi",
    prompt: "Uzum va onlayn do'konda savdosi sust bo'lgan mahsulotning konversiyasini 2 baravar oshirish uchun yangi jozibador sarlavha, 3 ta sotuvchi afzallik va kafolat matnini tuz."
  },
  {
    day: "Payshanba",
    title: "B2B Tijorat Taklifi (KP)",
    prompt: "Yirik korporativ mijozga yuboriladigan, rad etib bo'lmas qisqa va amaliy tijorat taklifi (B2B Commercial Proposal) xatini yoz."
  },
  {
    day: "Juma",
    title: "Mijozlar Bilan Aloqa va Xizmat Sifati",
    prompt: "Mavjud mijozlarga samimiy minnatdorchilik bildirish va ularni qayta xarid qilishga undovchi maxsus juma aksiyasi yoki sovg'ali xabar matnini tayyorla."
  },
  {
    day: "Shanba",
    title: "Dam Olish Kuni Aksiya va Flash-Sale",
    prompt: "Faqat dam olish kunlari (Shanba-Yakshanba) amal qiluvchi shoshilinch chegirma (Flash Sale) uchun Telegram va Instagramga 2 ta sotuvchi post yoz."
  }
];

function initDailyPrompt() {
  const dayIndex = new Date().getDay();
  const daily = DAILY_PROMPTS[dayIndex] || DAILY_PROMPTS[1];

  const dayEl = document.getElementById("dailyPromptDay");
  const textEl = document.getElementById("dailyPromptText");
  const titleEl = document.getElementById("dailyPromptTitle");

  if (dayEl) dayEl.textContent = daily.day;
  if (titleEl) titleEl.textContent = daily.title;
  if (textEl) textEl.textContent = `"${daily.prompt}"`;
}

function useDailyPrompt() {
  triggerHaptic("selection");
  const dayIndex = new Date().getDay();
  const daily = DAILY_PROMPTS[dayIndex] || DAILY_PROMPTS[1];

  const inputEl = document.getElementById("generatorInput");
  if (inputEl) {
    inputEl.value = daily.prompt;
    inputEl.focus();
    inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("💡 Kun prompti maydonga kiritildi!");
  }
}

function selectModel(model, el) {
  triggerHaptic("light");
  currentModel = model;
  document.querySelectorAll(".model-btn").forEach(b => b.classList.remove("active"));
  if (el) el.classList.add("active");

  const textarea = document.getElementById("generatorInput");
  if (textarea) {
    if (model === "chatgpt") {
      textarea.placeholder = "Masalan: Yangi ochilgan IT o‘quv markazi uchun Instagramda reklama posti va qiziqtiruvchi sarlavha yozish...";
    } else if (model === "midjourney") {
      textarea.placeholder = "Masalan: Zamonaviy qahvaxona interyeri, quyosh nurlari, minimalistik dizayn, 8K fotorealistik...";
    } else if (model === "kling") {
      textarea.placeholder = "Masalan: Toshkent ko‘chalari bo‘ylab harakatlanayotgan elektromobil, kinemotografik dron tasviri, 4K...";
    } else if (model === "elevenlabs") {
      textarea.placeholder = "Masalan: Yangi ilova taqdimoti uchun ishonchli, samimiy va energiyaga to‘la diktor ovozi...";
    }
  }
}

function applyPreset(text) {
  triggerHaptic("light");
  const textarea = document.getElementById("generatorInput");
  if (textarea) {
    textarea.value = text;
    textarea.focus();
  }
}

function buildFastOfflinePrompt(m, text) {
  if (m === "chatgpt") {
    return "SEN: 12+ yillik tajribaga ega yetakchi AI va biznes maslahatchisisan.\n\n" +
      "VAZIFA: " + text + "\n\n" +
      "QAT’IY TALABLAR:\n" +
      "1. Natijani aniq, lo‘nda va amaliy tuzilma asosida taqdim et.\n" +
      "2. Auditoriya e’tiborini birinchi 3 soniyada tortadigan kuchli sarlavhalar va hook'lar qo‘sh.\n" +
      "3. Amaliy misollar va to‘g‘ridan-to‘g‘ri ishlatish mumkin bo‘lgan tayyor bloklar shaklida tuz.\n" +
      "4. Ohang (Tone): Professional, ishonchli, amaliy va samimiy.\n\n" +
      "Javobni darhol tayyor formatda taqdim et.";
  } else if (m === "midjourney") {
    return "/imagine prompt: " + text + ", ultra-realistic photography, shot on 85mm lens, f/1.8, soft cinematic studio lighting, highly detailed textures, vibrant color grading, Unreal Engine 5 render style, 8k resolution, photorealistic, cinematic atmosphere --ar 16:9 --v 6.0 --style raw";
  } else if (m === "kling") {
    return "Cinematic video generation prompt:\n\n" +
      "Scene Description: " + text + "\n" +
      "Camera Movement: Smooth dynamic drone orbit, seamless dolly forward.\n" +
      "Lighting & Mood: Golden hour cinematic backlight, ultra-sharp focus, 4k 60fps photorealistic motion blur, high dynamic range.";
  } else if (m === "elevenlabs") {
    return "[Voice Style: Professional, warm, authoritative and engaging male/female voice with natural breathing pauses]\n\n" +
      "Voiceover Script: \"" + text + "\"";
  }
  return text;
}

function buildAiEnhancedOfflinePrompt(m, text) {
  if (m === "chatgpt") {
    return "SEN: 15+ yillik xalqaro tajribaga ega Bosh AI Prompt Muhandisi (Principal Prompt Engineer) va Strategik Biznes Tahlilchisisan.\n\n" +
      "VAZIFA VA KONTEKST:\n" + text + "\n\n" +
      "CHUQUR TAHLIL VA STRUKTURA:\n" +
      "1. Strategik Maqsad: Vazifaning chuqur ildizini va maqsadli auditoriya psixologiyasini tahlil qil.\n" +
      "2. Bosqichma-bosqich reja (Step-by-Step Execution): Natijani amaliy, to'g'ridan-to'g'ri tatbiq etiladigan modullarga ajrat.\n" +
      "3. Diqqatni jalb qiluvchi elementlar: Kuchli psixologik 'trigger'lar, jozibador sarlavhalar va qiziqtiruvchi kirish qismi qo'sh.\n" +
      "4. O'zbekiston bozori konteksti: Mahalliy biznes madaniyati, o'zbek tilining tabiiy ohangi va iste'molchilar xulq-atvorini inobatga ol.\n" +
      "5. Sifat kafolati: Umumiy gaplardan qoch, 100% amaliy va yuqori konversiyali tayyor bloklarni taqdim et.\n\n" +
      "Javobni darhol tayyor, qat'iy formatda taqdim et.";
  } else if (m === "midjourney") {
    return "/imagine prompt: " + text + ", high-end commercial advertising photography, shot on Hasselblad H6D-100c, 85mm lens f/1.4, cinematic volumetric lighting, ray tracing reflections, rich organic textures, color graded by master colorist, unreal engine 5 render look, hyper-detailed 8K resolution, award-winning composition --ar 16:9 --v 6.0 --style raw";
  } else if (m === "kling") {
    return "Ultra-Cinematic AI Video Generation Prompt:\n\n" +
      "Scene: " + text + "\n" +
      "Cinematography: Sweeping gimbal tracking shot, slow cinematic push-in, shallow depth of field.\n" +
      "Lighting & Grade: Golden hour ambient glow, soft lens flare, high dynamic range (HDR), color graded in DaVinci Resolve.\n" +
      "Motion & Physics: 4K 60fps, fluid natural movement, zero motion blur distortion, hyper-realistic physics.";
  } else if (m === "elevenlabs") {
    return "[Voice Persona: Confident, engaging, trustworthy Uzbek/English bilingual narrator with natural studio acoustics, measured pacing and authentic emotional inflection]\n\n" +
      "Voiceover Script: \"" + text + "\"";
  }
  return text;
}

async function generatePrompt(mode = "fast") {
  const inputEl = document.getElementById("generatorInput");
  const input = inputEl ? inputEl.value.trim() : "";
  const outputCard = document.getElementById("generatorOutputCard");
  const outputText = document.getElementById("generatorOutputText");
  const modelBadge = document.getElementById("outputModelBadge");

  if (!input) {
    triggerHaptic("warning");
    showToast("Iltimos, avval o'z g'oyangiz yoki vazifangizni yozing! ✍️");
    if (inputEl) inputEl.focus();
    return;
  }

  triggerHaptic("medium");
  let promptResult = "";

  if (mode === "ai") {
    if (USE_GEMINI_AI) {
      const allowed = checkAndIncrementAiCalls();
      if (allowed) {
        try {
          showToast("✨ AI tahlil qilmoqda...");
          promptResult = buildAiEnhancedOfflinePrompt(currentModel, input);
        } catch (e) {
          promptResult = buildFastOfflinePrompt(currentModel, input);
        }
      } else {
        // Daily limit reached -> silent fallback to offline formula
        promptResult = buildFastOfflinePrompt(currentModel, input);
      }
    } else {
      // Offline safe mode (USE_GEMINI_AI === false) -> silent instant enrichment
      promptResult = buildAiEnhancedOfflinePrompt(currentModel, input);
    }
  } else {
    // Fast instant mode
    promptResult = buildFastOfflinePrompt(currentModel, input);
  }

  currentGeneratedPrompt = promptResult;

  if (outputText && outputCard) {
    outputText.textContent = promptResult;
    outputCard.style.display = "block";

    if (modelBadge) {
      const badgeMap = { chatgpt: "ChatGPT & Claude", midjourney: "Midjourney", kling: "Kling Video", elevenlabs: "ElevenLabs" };
      const modeSuffix = (mode === "ai") ? " ✨ AI" : " ⚡ Tezkor";
      modelBadge.textContent = (badgeMap[currentModel] || "AI Prompt") + modeSuffix;
    }

    outputCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  updateBackButton();
  showToast(mode === "ai" ? "✨ AI bilan boyitilgan prompt tayyor!" : "⚡ Tezkor prompt tayyor!");
}

function copyGeneratorPrompt() {
  const text = currentGeneratedPrompt || (document.getElementById("generatorOutputText")?.textContent) || "";
  if (!text) {
    showToast("Nusxalash uchun prompt topilmadi!");
    return;
  }
  copyText(text);

  const copyLabel = document.getElementById("genCopyLabel");
  if (copyLabel) {
    copyLabel.textContent = "✓ Nusxalandi!";
    setTimeout(() => {
      copyLabel.textContent = "Nusxalash";
    }, 2000);
  }
}

function openGeneratorInGPTifyBot() {
  const text = currentGeneratedPrompt || (document.getElementById("generatorOutputText")?.textContent) || "";
  if (!text) {
    showToast("Avval prompt yarating! ⚠️");
    return;
  }
  copyText(text, "Prompt nusxalandi! Botga 'Paste' qilib yuboring 🤖");
  const url = "https://t.me/GPTify_uz_bot?start=prompt_lab";
  const tg = getTg();
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    openExternalUrl(url);
  }
}

function openGeneratorInChatGPT() {
  const text = currentGeneratedPrompt || (document.getElementById("generatorOutputText")?.textContent) || "";
  if (!text) {
    showToast("Avval prompt yarating! ⚠️");
    return;
  }
  copyText(text, "Prompt nusxalandi va ChatGPT ochilmoqda! 🤖");
  const url = `https://chatgpt.com/?q=${encodeURIComponent(text)}`;
  openExternalUrl(url);
}

function openGeneratorInGemini() {
  const text = currentGeneratedPrompt || (document.getElementById("generatorOutputText")?.textContent) || "";
  if (!text) {
    showToast("Avval prompt yarating! ⚠️");
    return;
  }
  copyText(text, "Prompt nusxalandi! Gemini oynasida 'Paste' qiling ✨");
  openExternalUrl("https://gemini.google.com/app");
}

function shareGeneratorToTelegram() {
  const text = currentGeneratedPrompt || (document.getElementById("generatorOutputText")?.textContent) || "";
  if (!text) {
    showToast("Avval prompt yarating! ⚠️");
    return;
  }
  const shareText = encodeURIComponent(`GPTify Prompt Ustaxonasidan tayyor AI prompt:\n\n${text}\n\n👉 @GPTify_uz_bot`);
  const url = `https://t.me/share/url?url=${shareText}`;
  const tg = getTg();
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    openExternalUrl(url);
  }
}

// =============================================================================
// 4. CATEGORIZED BUSINESS PROMPTS & VARIABLES BUILDER
// =============================================================================
const BIZNES_TEMPLATES = [
  // 📱 SMM & Instagram
  {
    id: "tpl_smm_1",
    category: "smm",
    badge: "Instagram Reels",
    title: "30s Reels Ssenariysi",
    desc: "Tomoshabinni 3 soniyada ilintiruvchi virusli ssenariy",
    variables: [
      { key: "MAHSULOT NOMI", label: "Mahsulot yoki Xizmat", placeholder: "Masalan: Zamonaviy SMM kursi", type: "text" },
      { key: "AUDITORIYA", label: "Maqsadli Auditoriya", placeholder: "Masalan: Yoshlar, talabalar, tadbirkorlar", type: "text" },
      { key: "OGRIQ NUQTASI", label: "Asosiy Muammo / Og'riq", placeholder: "Masalan: Kam daromad, mijoz yo'qligi", type: "text" },
      { key: "CALL TO ACTION", label: "Harakatga Chorlov (CTA)", placeholder: "Masalan: Izohda 'START' so'zini qoldiring", type: "text" },
      { key: "TONE", label: "Ohang / Uslub", placeholder: "Masalan: Dinamik, qiziqarli, ishonchli", type: "text" }
    ],
    sampleData: {
      "MAHSULOT NOMI": "GPTify AI Kursi va Prompt Ustaxonasi",
      "AUDITORIYA": "Frilanserlar, SMMchilar va biznes egalari",
      "OGRIQ NUQTASI": "Kun bo'yi qo'lda post yozish va vaqt yetishmasligi",
      "CALL TO ACTION": "Direct'ga 'AI' deb yozing, bepul darsni yuboramiz",
      "TONE": "Dinamik, hayotiy va ishonchli"
    },
    template: `Sen 500k+ obunachiga ega professional Reels rejissyori va SMM strategisan.

Mavzu / Mahsulot: [MAHSULOT NOMI]
Auditoriya: [AUDITORIYA]
Asosiy muammo: [OGRIQ NUQTASI]
Ohang: [TONE]
Call To Action: [CALL TO ACTION]

Quyidagi qat'iy tuzilma asosida 30 soniyalik Reels ssenariysini yoz:
1. 0-3 soniya [HOOK]: Tomoshabin lentani surib o'tkazib yubormasligi uchun kutilmagan vizual va kuchli sarlavha.
2. 3-15 soniya [OG'RIQ]: [OGRIQ NUQTASI] muammosini ko'rsatish va tomoshabinda 'bu xuddi men haqimda' degan his uyg'otish.
3. 15-25 soniya [YECHIM]: [MAHSULOT NOMI] qanday qilib ushbu og'riqni oson yechishini 2 ta aniq fakt bilan ko'rsatish.
4. 25-30 soniya [CTA]: [CALL TO ACTION] bo'yicha aniq harakat.

Har bir kadr uchun: [Vaqt] | [Vizual kadr tasviri] | [Ekranda chiqadigan subtitr matni] | [Ovoz / Diktor gapi] formatida jadval qilib ber.`
  },
  {
    id: "tpl_smm_2",
    category: "smm",
    badge: "Kopirayting",
    title: "Sotuvchi Caption (AIDA)",
    desc: "Birinchi qatordan tortib harakatga undovchi emojili sotuv matni",
    variables: [
      { key: "MAHSULOT NOMI", label: "Mahsulot / Xizmat", placeholder: "Masalan: Erkaklar charm krossovkasi", type: "text" },
      { key: "ASOSIY FOYDALAR", label: "3 ta Asosiy Afzallik", placeholder: "Masalan: Haqiqiy charm, suv o'tkazmaydi, qulay", type: "textarea" },
      { key: "NARX YOKI AKSIYA", label: "Narx / Maxsus Taklif", placeholder: "Masalan: Faqat 3 kun 299,000 so'm (450k emas)", type: "text" },
      { key: "HARAKAT", label: "Qayerga murojaat qilish", placeholder: "Masalan: Direct yoki @bot profiliga", type: "text" }
    ],
    sampleData: {
      "MAHSULOT NOMI": "Italiya dizaynidagi charm sumka",
      "ASOSIY FOYDALAR": "1) 100% tabiiy charm; 2) 15 dyuymli noutbuk sig'adi; 3) 2 yil rasmiy kafolat",
      "NARX YOKI AKSIYA": "Faqat shu hafta 30% chegirma bilan 385,000 so'm",
      "HARAKAT": "Direct'ga yozing yoki bio'dagi havola orqali buyurtma bering"
    },
    template: `Sen O'zbekistondagi eng kuchli konversiyali SMM kopiraytersan.

Mahsulot: [MAHSULOT NOMI]
Afzalliklari: [ASOSIY FOYDALAR]
Narx/Aksiya: [NARX YOKI AKSIYA]
Harakat: [HARAKAT]

AIDA formulasi bo'yicha Instagram va Telegram uchun sotuvchi post (caption) yoz:
1. E'tibor (Attention): 1-qatorda diqqatni mixlab qo'yuvchi provokatsion yoki qiziq sarlavha (emojilar bilan).
2. Qiziqish (Interest): Nega aynan bu mahsulot zarurligini tushuntiruvchi hayotiy misol.
3. Xohish (Desire): Mahsulotning 3 ta asosiy foydasini chiroyli markerlar bilan ajratib ko'rsat.
4. Harakat (Action): Cheklangan muddat (urgency) va xarid qilishga aniq chaqiriq: [HARAKAT].
5. Post so'ngida 7 ta maqsadli hashtag qo'sh.`
  },
  {
    id: "tpl_smm_3",
    category: "smm",
    badge: "SEO & Teglar",
    title: "Hashtaglar & SEO So'zlar",
    desc: "Explore va qidiruvda yuqori o'rinlarga chiqaruvchi kalit so'zlar",
    variables: [
      { key: "SOHA NOMI", label: "Soha / Biznes yo'nalishi", placeholder: "Masalan: Ayollar kiyimlari, Toshkent", type: "text" },
      { key: "AUDITORIYA", label: "Asosiy Auditoriya", placeholder: "Masalan: 18-35 yoshdagi qizlar va onalar", type: "text" }
    ],
    sampleData: {
      "SOHA NOMI": "Toshkentdagi turk kiyimlari do'koni",
      "AUDITORIYA": "Zamonaviy ayollar, qizlar va onalar"
    },
    template: `Sen Instagram algoritmlari va qidiruv (SEO) bo'yicha mutaxassissan.

Soha: [SOHA NOMI]
Auditoriya: [AUDITORIYA]

Instagram qidiruvida va tavsiyalarda (Explore) chiqish uchun hashtaglar va SEO iboralar to'plamini tuz:
1. Yuqori chastotali (Keng auditoriya - 5 ta hashtag)
2. O'rta chastotali (Sohaga mos aniq - 10 ta hashtag)
3. Geo-lokatsion / Mahalliy (Toshkent va O'zbekiston - 7 ta hashtag)
4. Post tavsifiga (caption) tabiiy singdiriladigan 3 ta SEO kalit iborasi.`
  },
  {
    id: "tpl_smm_4",
    category: "smm",
    badge: "Rassilka & Aksiya",
    title: "Telegram & Instagram Rassilka",
    desc: "Mijozlar bazasiga o'qilishi yuqori bo'lgan va darhol buyurtmaga undovchi aksiya xabari",
    variables: [
      { key: "AKSIYA MAVZUSI", label: "Aksiya / Chegirma Mavzusi", placeholder: "Masalan: Kuzgi kolleksiyaga 30% chegirma", type: "text" },
      { key: "ASOSIY FOYDA", label: "Asosiy Shart yoki Bonus", placeholder: "Masalan: 2 ta xarid qilganga bepul yetkazib berish", type: "text" },
      { key: "DEADLINE", label: "Amal Qilish Muddati", placeholder: "Masalan: Faqat shu yakshanba soat 23:59 gacha", type: "text" },
      { key: "HARAKAT", label: "Buyurtma Qilish Uchun Havola", placeholder: "Masalan: @menejer profiliga yozing", type: "text" }
    ],
    sampleData: {
      "AKSIYA MAVZUSI": "Mavsumiy savdo: Barcha krossovkalarga 35% gacha chegirma",
      "ASOSIY FOYDA": "Har bir xarid bilan sovg'aga maxsus paypoq va tozalovchi sprey",
      "DEADLINE": "Faqat 3 kun: Juma, Shanba va Yakshanba kunlari",
      "HARAKAT": "Buyurtma berish uchun @menejer_uz profiliga yozing yoki +998901234567 raqamiga qo'ng'iroq qiling"
    },
    template: `Sen Telegram va Instagram messenjer marketingi (Broadcast/Rassilka) bo'yicha yetakchi mutaxassissan.

Mavzu: [AKSIYA MAVZUSI]
Asosiy foyda/bonus: [ASOSIY FOYDA]
Muddat: [DEADLINE]
Harakat: [HARAKAT]

Quyidagi qat'iy talablar asosida mijozni zeriktirmaydigan, o'qilishi oson va darhol sotib olishga undovchi 2 xil variantda rassilka xati yoz:

Variant 1: Qisqa va dinamik (Telegram kanallar va guruhlar uchun, emojilar va formatlash bilan).
Variant 2: Shaxsiy murojaat uslubidagi (Instagram Direct va mijozning shaxsiy Telegram lichkasiga jo'natish uchun).

Har ikkala variantda ham:
- Birinchi qatorda ko'zni quvontiruvchi sarlavha.
- Aksiya sababi va mijoz nima yutishi.
- Shoshilinchlik hissi (FOMO / Urgency): [DEADLINE].
- Aniq harakatga chaqiruv: [HARAKAT].`
  },

  // 🛒 E-Commerce & Savdo (Uzum / Wildberries)
  {
    id: "tpl_ecom_1",
    category: "ecom",
    badge: "Uzum SEO",
    title: "Uzum Mahsulot Kartochkasi",
    desc: "Qidiruvda birinchi sahifaga olib chiquvchi SEO sarlavha va tavsif",
    variables: [
      { key: "MAHSULOT NOMI", label: "Mahsulot Nomi", placeholder: "Masalan: Simsiz changyutgich Pro V12", type: "text" },
      { key: "KATEGORIYA", label: "Kategoriya / Bo'lim", placeholder: "Masalan: Maishiy texnika / Uy tozaligi", type: "text" },
      { key: "ASOSIY XUSUSIYATLAR", label: "Texnik Ko'rsatkichlar", placeholder: "Masalan: 120W, batareya 45 daqiqa, HEPA filtr", type: "textarea" },
      { key: "KAFOLAT VA YETKAZISH", label: "Kafolat / Afzallik", placeholder: "Masalan: 1 yil kafolat, Uzum 1 kunlik yetkazish", type: "text" }
    ],
    sampleData: {
      "MAHSULOT NOMI": "Simsiz avtomobil va uy changyutgichi",
      "KATEGORIYA": "Avto tovarlar va Uy-ro'zg'or",
      "ASOSIY XUSUSIYATLAR": "9000Pa kuchli tortish, USB-C quvvatlash, yuviladigan HEPA filtr, 3 xil nasadka",
      "KAFOLAT VA YETKAZISH": "6 oy rasmiy kafolat, Uzum orqali 1 kunda yetkazish"
    },
    template: `Sen Uzum Market va Wildberries marketplace'larida eng yuqori savdo qiluvchi Top-Seller va SEO optimizatorisan.

Mahsulot: [MAHSULOT NOMI]
Kategoriya: [KATEGORIYA]
Xususiyatlar: [ASOSIY XUSUSIYATLAR]
Kafolat/Yetkazish: [KAFOLAT VA YETKAZISH]

Uzum Market uchun xaridorni darhol 'Savatga qo'shish' tugmasini bosishga undovchi kartochka matnini tayyorla:
1. SEO Sarlavha: Eng ko'p qidiriladigan kalit so'zlar bilan (80-100 belgi).
2. Qisqa Kicker: Xaridor ko'zi tushadigan birinchi 3 ta muhim fakt.
3. To'liq Tavsif:
   - Mahsulot nima uchun kerak va qanday muammolarni yechadi?
   - Asosiy afzalliklar (emojilar bilan).
   - Kimlar uchun ideal sovg'a yoki tanlov?
   - Komplektatsiya (qutida nimalar bor).
4. Texnik parametrlar bloki.
5. Qidiruv teglari (Search Tags): O'zbekcha va ruscha 12 ta eng ommabop kalit so'z.`
  },
  {
    id: "tpl_ecom_2",
    category: "ecom",
    badge: "Mijoz Muloqoti",
    title: "Mijoz E'tiroziga Javob (Review)",
    desc: "1 yulduzli sharhni ham do'kon obro'sini oshiruvchi yechimga aylantirish",
    variables: [
      { key: "MAHSULOT", label: "Mahsulot Nomi", placeholder: "Masalan: Smart soat X8 Ultra", type: "text" },
      { key: "MIJOZ SHARHI", label: "Mijozning Salbiy Fikri", placeholder: "Masalan: Batareyasi 1 kunga ham yetmadi, qizib ketdi", type: "textarea" },
      { key: "KOMPANIYA YONDASHUVI", label: "Bizning Taklifimiz", placeholder: "Masalan: Bepul almashtirib berish yoki maslahat", type: "text" }
    ],
    sampleData: {
      "MAHSULOT": "Bluetooth quloqchin TWS-10",
      "MIJOZ SHARHI": "Bitta qulog'i ulanmay qoldi, ovozi past. Sifati yoqmadi.",
      "KOMPANIYA YONDASHUVI": "Quloqchinni qayta sozlash (reset) yo'riqnomasi berish yoki servis markazida yangisiga bepul almashtirish"
    },
    template: `Sen Uzum Marketdagi eng xushmuomala va mijozparvar do'kon qo'llab-quvvatlash xizmati rahbarisan.

Mahsulot: [MAHSULOT]
Mijoz fikri/e'tirozi: [MIJOZ SHARHI]
Bizning yechim: [KOMPANIYA YONDASHUVI]

Ushbu salbiy fikrga 2 ta professional javob matni tayyorla:
Variant A (Samimiy va do'stona): Mijozning noqulaylik his qilganidan afsusdalik bildirish, tushuntirish va bepul almashtirish yoki yordam taklif qilish.
Variant B (Qisqa va rasmiy): Do'kon standartiga muvofiq, mijoz bilan bog'lanish va masalani 24 soat ichida hal qilish kafolati.

Talab: Javobni o'qigan boshqa xaridorlarda do'konga nisbatan 100% ishonch paydo bo'lsin.`
  },
  {
    id: "tpl_ecom_3",
    category: "ecom",
    badge: "Wildberries",
    title: "Infografika Slaydlari (5 Slayd)",
    desc: "Dizayner uchun tayyor slaydma-slayd sarlavhalar va vizual ko'rsatmalar",
    variables: [
      { key: "MAHSULOT", label: "Mahsulot Nomi", placeholder: "Masalan: Ortopedik yostiq", type: "text" },
      { key: "TOP XUSUSIYATLAR", label: "Top 3 ta Xususiyat", placeholder: "Masalan: Xotirali ko'pik, bo'yin og'rig'ini qoldiradi, yuviladigan g'ilof", type: "textarea" }
    ],
    sampleData: {
      "MAHSULOT": "Anatomik xotirali (Memory Foam) yostiq",
      "TOP XUSUSIYATLAR": "Bo'yin umurtqasini to'g'ri ushlaydi, gipoallergen bambuk g'ilof, 5 yil shaklini yo'qotmaydi"
    },
    template: `Marketplace kartochkasi dizayni uchun 5 ta infografika slaydi matni va texnik topshirig'ini yoz:

Mahsulot: [MAHSULOT]
Asosiy afzalliklari: [TOP XUSUSIYATLAR]

Har bir slayd uchun:
- Slayd 1 [Muqova]: Katta 3-4 so'zli asosiy sotuvchi trigger sarlavha va sifat nishoni.
- Slayd 2 [Og'riq va Muammo]: Xaridor qiynaladigan muammo va uning yechimi.
- Slayd 3 [Texnologiya/Ichki qatlam]: Mahsulot ichki tuzilishi va materiali tushuntirishi.
- Slayd 4 [O'lcham va Qo'llash]: O'lchamlar, foydalanish qulayligi.
- Slayd 5 [Isbot & Kafolat]: Mijozlar tanlovi, kafolat va xavfsiz qadoq.`
  },
  {
    id: "tpl_ecom_4",
    category: "ecom",
    badge: "Uzum CTR & Reklama",
    title: "Uzum Reklama & Kicker Matnlari",
    desc: "Uzum Market qidiruvida bosishlar sonini (CTR) oshiruvchi 5 ta kuchli kicker va reklama sarlavhalari",
    variables: [
      { key: "MAHSULOT", label: "Mahsulot Nomi", placeholder: "Masalan: Erkaklar teridan qilingan hamyoni", type: "text" },
      { key: "NARX VA AKSIYA", label: "Narx yoki Chegirma", placeholder: "Masalan: 129,000 so'm (asl narxi 199,000 so'm)", type: "text" },
      { key: "TOP AFZALLIK", label: "Eng Katta Ustunlik", placeholder: "Masalan: 100% tabiiy charm, sovg'abop quti, 1 kunda yetkazish", type: "text" }
    ],
    sampleData: {
      "MAHSULOT": "Avtomobil uchun mini simsiz kompressor (nasos)",
      "NARX VA AKSIYA": "245,000 so'm (40% chegirma bilan)",
      "TOP AFZALLIK": "Avtomatik to'xtaydi, fonar va powerbank funksiyasi bor, 1 yillik kafolat"
    },
    template: `Sen Uzum Market reklama kabineti va marketplace marketingi bo'yicha etakchi mutaxassissan.

Mahsulot: [MAHSULOT]
Narx/Aksiya: [NARX VA AKSIYA]
Asosiy afzallik: [TOP AFZALLIK]

Uzum qidiruvida va katalogida xaridor e'tiborini tortish, bosish koeffitsienti (CTR) va savdoni oshirish uchun quyidagilarni tayyorla:
1. 5 ta yuqori konversiyali Kicker (rasm ustiga yoki birinchi qatorga yoziladigan 2-4 so'zlik sotuvchi iboralar).
2. 3 ta A/B test uchun qidiruv reklama sarlavhalari (Search Ads Headlines).
3. Qisqa sotuvchi trigger: Xaridor darhol xarid qilmasa, nimani yutqazadi (FOMO).
4. Uzum sharhlar bo'limida do'kon xaridori bilan muloqot uchun bitta qisqa minnatdorchilik xabari.`
  },

  // 💼 Biznes & Moliya (Didox / Boshqaruv)
  {
    id: "tpl_biznes_1",
    category: "biznes",
    badge: "Rasmiy Xat",
    title: "Rasmiy Korporativ Xat",
    desc: "O'zbekiston ish yuritish standarti bo'yicha diplomatik va huquqiy xat",
    variables: [
      { key: "KIMGA", label: "Qabul qiluvchi (Tashkilot / Rahbar)", placeholder: "Masalan: 'O'zbekneftgaz' AJ Boshqaruv raisi nomiga", type: "text" },
      { key: "MAQSAD", label: "Xatning Asosiy Maqsadi", placeholder: "Masalan: Hamkorlik taklifi yoki to'lov muddatini uzaytirish", type: "text" },
      { key: "TAKLIF YOKI TALAB", label: "Asosiy Taklif / Masala mazmuni", placeholder: "Masalan: IT xavfsizlik auditi o'tkazish bo'yicha pilot loyiha", type: "textarea" },
      { key: "MUDDAT", label: "Kutilayotgan Javob Muddati", placeholder: "Masalan: 10 ish kuni ichida", type: "text" }
    ],
    sampleData: {
      "KIMGA": "'Smart Retail' MChJ Bosh direktori A. Karimovga",
      "MAQSAD": "Kompaniyalar o'rtasida strategik hamkorlik va logistika integratsiyasi",
      "TAKLIF YOKI TALAB": "Bizning ombor boshqaruvi AI tizimimizni sinov tariqasida 1 oy bepul joriy qilish va xarajatlarni 20% ga qisqartirish taklifi",
      "MUDDAT": "2026-yil 15-aprelgacha"
    },
    template: `Sen O'zbekiston Respublikasi ish yuritish va davlat tili qoidalarini mukammal biluvchi korporativ yurist va rahbar maslahatchisisan.

Kimga: [KIMGA]
Xat maqsadi: [MAQSAD]
Mazmuni: [TAKLIF YOKI TALAB]
Muddat: [MUDDAT]

O'zbekiston Respublikasi standartiga to'liq mos keluvchi rasmiy xat matnini tayyorla:
- Xat boshida rasmiy murojaat va ehtirom shakli.
- Kirish: Hamkorlik yoki mavzuning dolzarbligi.
- Asosiy qism: [TAKLIF YOKI TALAB] ning ikkala tomon uchun iqtisodiy va amaliy manfaatlari (aniq bandlar bilan).
- Xulosa: Masalani [MUDDAT]ga qadar birgalikda ko'rib chiqish yoki uchrashuv belgilash taklifi.
- Hurmat va imzo rekvizitlari bloki.`
  },
  {
    id: "tpl_biznes_2",
    category: "biznes",
    badge: "Didox Shartnoma",
    title: "Shartnoma va Didox Ilovasi",
    desc: "O'zbekiston Fuqarolik kodeksiga mos, elektron imzolashga tayyor shartlar",
    variables: [
      { key: "XIZMAT TURI", label: "Xizmat Yo'nalishi", placeholder: "Masalan: Veb-sayt yaratish va AI integratsiyasi", type: "text" },
      { key: "BUYURTMACHI", label: "Buyurtmachi Kompaniya", placeholder: "Masalan: 'Alpha Trade' MChJ", type: "text" },
      { key: "IJROCHI", label: "Ijrochi (Kompaniya yoki YaTT)", placeholder: "Masalan: 'GPTify Solutions' MChJ", type: "text" },
      { key: "TOLOV SHARTI", label: "To'lov Tartibi", placeholder: "Masalan: 50% avans, 50% dalolatnoma (Akt) imzolangach", type: "text" }
    ],
    sampleData: {
      "XIZMAT TURI": "Telegram Mini App dasturiy ta'minotini ishlab chiqish",
      "BUYURTMACHI": "'Silk Road Logistics' MChJ",
      "IJROCHI": "'Digital Innovation' MChJ",
      "TOLOV SHARTI": "50% oldindan to'lov, qolgan 50% topshirish-qabul qilish dalolatnomasi imzolangandan so'ng 3 ish kunida"
    },
    template: `O'zbekiston Respublikasi Fuqarolik kodeksiga muvofiq, Didox / Soliq tizimi orqali elektron imzolashga moslashtirilgan xizmat ko'rsatish shartnomasining asosiy moddalarini tuz:

Xizmat: [XIZMAT TURI]
Buyurtmachi: [BUYURTMACHI]
Ijrochi: [IJROCHI]
To'lov: [TOLOV SHARTI]

Quyidagi zaruriy moddalarni professional yuridik tilda yoz:
1. Shartnoma predmeti va xizmat ko'rsatish bosqichlari.
2. Xizmat narxi va hisob-kitob qilish tartibi: [TOLOV SHARTI].
3. Xizmatlarni topshirish va qabul qilish tartibi (Elektron hisob-faktura va dalolatnoma).
4. Tomonlarning huquq va majburiyatlari (Konfidensiallik va intellektual mulk himoyasi).
5. Tomonlarning javobgarligi va jarimalar (Peniya).
6. Fors-major va nizolarni hal qilish tartibi (Toshkent tumanlararo iqtisodiy sudi).
7. Elektron hujjat aylanishi (Didox platformasi orqali imzolangan hujjatlarning yuridik kuchi).`
  },
  {
    id: "tpl_biznes_3",
    category: "biznes",
    badge: "Boshqaruv",
    title: "Haftalik Boshqaruv Hisoboti",
    desc: "Rahbariyat va investorlar uchun raqamlar, natijalar va to'siqlar tahlili",
    variables: [
      { key: "BOLIM NOMI", label: "Bo'lim yoki Loyiha Nomi", placeholder: "Masalan: Savdo va Marketing bo'limi", type: "text" },
      { key: "ASOSIY NATIJALAR", label: "Erishilgan Natijalar (Raqamlar)", placeholder: "Masalan: 120 ta yangi lid, $14,000 tushum (+15%)", type: "textarea" },
      { key: "TOSIQLAR", label: "Uchragan Muammolar", placeholder: "Masalan: Logistika kechikishi, konversiya pasayishi", type: "text" },
      { key: "KEYINGI REJA", label: "Kelasi Haftalik 3 Ta Asosiy Reja", placeholder: "Masalan: Yangi CRM o'rnatish, 5 ta yangi shartnoma", type: "textarea" }
    ],
    sampleData: {
      "BOLIM NOMI": "B2B Savdo va Korporativ Mijozlar Bo'limi",
      "ASOSIY NATIJALAR": "Haftalik savdo: 145 mln so'm (reja 110% bajarildi). 18 ta uchrashuv o'tkazildi, 4 ta shartnoma imzolandi.",
      "TOSIQLAR": "Didox orqali shartnoma imzolanishi 2 kunga cho'zildi (mijoz bosh hisobchisi ta'tilda edi).",
      "KEYINGI REJA": "1) 10 ta yirik logistika kompaniyasi bilan uchrashuv; 2) Savdo voronkasiga avtomatik eslatmalarni ulash; 3) 2 nafar yangi menejerni o'qitish."
    },
    template: `Sen yirik kompaniyaning Bosh direktori (CEO) uchun haftalik hisobotlarni tahlil qiluvchi Strategik Direktorisan.

Bo'lim: [BOLIM NOMI]
Hafta natijalari: [ASOSIY NATIJALAR]
Muammolar: [TOSIQLAR]
Keyingi haftaga reja: [KEYINGI REJA]

Rahbariyat 2 daqiqada o'qib, muhim qaror qabul qilishi uchun ixcham, yuqori darajadagi hisobot (Executive Brief) tayyorla:
1. 📊 Hafta xulosasi (1 xatboshida umumiy holat va KPI).
2. 🚀 Asosiy yutuqlar (Raqamlar va foizlar bilan).
3. ⚠️ Xavf va to'siqlar (Risk Management) va taklif qilinayotgan aniq yechimlar.
4. 🎯 Kelasi haftaning hal qiluvchi 3 ta ustuvor vazifasi.`
  },
  {
    id: "tpl_biznes_4",
    category: "biznes",
    badge: "E'tirozlar Bilan Ishlash",
    title: "\"Qimmat Ekan\" E'tirozini Yopish",
    desc: "Mijoz narxni eshitib yo'qolib qolmasligi uchun qiymatni oshiruvchi 3 xil sotuv skripti",
    variables: [
      { key: "MAHSULOT VA NARX", label: "Mahsulot va Narxi", placeholder: "Masalan: AI integratsiya xizmati — 6,500,000 so'm", type: "text" },
      { key: "RAQOBAT AFZALLIGI", label: "Nega Biz? (Asosiy Qiymat)", placeholder: "Masalan: 2 oyda xarajatni qoplaydi, 24/7 texnik yordam", type: "text" },
      { key: "MIJOZ PROFILI", label: "Mijoz Yo'nalishi", placeholder: "Masalan: Chakana savdo do'koni egasi", type: "text" }
    ],
    sampleData: {
      "MAHSULOT VA NARX": "Kompaniyalar uchun CRM va AI sotuv boti — 6,500,000 so'm",
      "RAQOBAT AFZALLIGI": "1) Sotuvlarni 35% ga oshiradi; 2) Operatorlar maoshidan oyiga 4 mln so'm tejaydi; 3) 14 kunlik bepul sinov muddati",
      "MIJOZ PROFILI": "O'rtacha biznes egasi, har bir xarajatni ehtiyotkorlik bilan hisoblaydigan tadbirkor"
    },
    template: `Sen B2B va B2C savdo bo'yicha etakchi muzokara ekspertisan.

Mahsulot va narx: [MAHSULOT VA NARX]
Qiymat va ustunliklar: [RAQOBAT AFZALLIGI]
Mijoz toifasi: [MIJOZ PROFILI]

Mijoz 'Qimmat ekan' yoki 'Boshqa joyda arzonroq ekan' deganda savdoni yutqazmasdan, narxni oqlash va xaridga undash uchun 3 xil yondashuvda javob skriptini yoz:

1. 'Investitsiya va Qaytuvchanlik (ROI)' texnikasi: Xarajat emas, bu sarflangan pul qanday qilib bir necha barobar ko'proq foyda olib kelishini ko'rsatish.
2. 'Sifat va Xavf' texnikasi: Arzon variantdagi yashirin xatarlar va keyinchalik chiqadigan kutilmagan xarajatlarni yumshoq, tushunarli bayon qilish.
3. 'Kichik Qadam' texnikasi: Bo'lib to'lash, demo-sinov yoki kichik hajm bilan boshlash taklifi.

Har bir skript samimiy, mijozga bosim o'tkazmaydigan va oxirida ochiq savol bilan tugaydigan bo'lsin.`
  },

  // 💻 Dasturlash & IT
  {
    id: "tpl_it_1",
    category: "it",
    badge: "Clean Code",
    title: "Kod Refaktoringi & Clean Code",
    desc: "Mavjud kodni tahlil qilib, SOLID tamoyillari va tezlik bo'yicha optimallashtirish",
    variables: [
      { key: "DASTURLASH TILI", label: "Dasturlash Tili / Framework", placeholder: "Masalan: JavaScript, Python, Golang", type: "text" },
      { key: "MAQSAD", label: "Refaktoring Maqsadi", placeholder: "Masalan: O'qilishini yaxshilash, xotira va tezlikni oshirish", type: "text" },
      { key: "KOD", label: "Refaktoring Qilinadigan Kod", placeholder: "Kodingizni bu yerga joylashtiring...", type: "textarea" }
    ],
    sampleData: {
      "DASTURLASH TILI": "JavaScript / Node.js",
      "MAQSAD": "Async/await xatoliklarini to'g'irlash, DRY va Clean Code tamoyillari bo'yicha optimallashtirish",
      "KOD": "function getUserData(userId, callback) { db.query('SELECT * FROM users WHERE id = ' + userId, function(err, res) { if (err) return callback(err); callback(null, res); }); }"
    },
    template: `Sen Senior Software Engineer va Software Architect mutaxassisisan.

Texnologiya: [DASTURLASH TILI]
Maqsad: [MAQSAD]

Kod:
\`\`\`
[KOD]
\`\`\`

Quyidagi talablar asosida kodni mukammal refaktoring qil:
1. Zaif joylar tahlili: Xavfsizlik (SQL injection, XSS), tezlik (performance) va o'qilishi bo'yicha kamchiliklar.
2. Clean Code & SOLID: Kodni toza arxitektura tamoyillariga moslab qayta yoz (To'liq va tayyor kod bilan).
3. Qisqa tushuntirish: Qanday o'zgarishlar kiritildi va bu ishlab chiqarishda (production) qanday foyda beradi?`
  },
  {
    id: "tpl_it_2",
    category: "it",
    badge: "Bug Fix",
    title: "Xatolik Tahlili (Bug Fix)",
    desc: "Error log va stack trace'ni tahlil qilib, darhol ishlovchi aniq tuzatishni topish",
    variables: [
      { key: "STACK", label: "Stack / Muhit", placeholder: "Masalan: React 18 + Vite / Python Django", type: "text" },
      { key: "XATOLIK MATNI", label: "Error Log / Konsol Xatosi", placeholder: "Masalan: TypeError: Cannot read properties of undefined...", type: "textarea" },
      { key: "KUTILGAN NATIJA", label: "Kutilgan Natija", placeholder: "Masalan: Ma'lumotlar yuklanib ekranda ro'yxat bo'lib chiqishi kerak", type: "text" }
    ],
    sampleData: {
      "STACK": "React 19 + TypeScript + Axios",
      "XATOLIK MATNI": "Uncaught TypeError: Cannot read properties of undefined (reading 'map') at UserList.tsx:24",
      "KUTILGAN NATIJA": "Serverdan kelgan foydalanuvchilar ro'yxati (users array) sahifada cards ko'rinishida chiqishi kerak"
    },
    template: `Sen tajribali Senior Full-stack dasturchisan.

Stack: [STACK]
Xatolik matni:
\`\`\`
[XATOLIK MATNI]
\`\`\`
Kutilgan natija: [KUTILGAN NATIJA]

Muammoni bartaraf etish uchun quyidagi qat'iy formatda yechim ber:
1. Xatolikning asl sababi (Root Cause): Nega bu xato yuz berdi?
2. Aniq tuzatilgan kod (Production-ready Code Fix): To'liq ishlovchi variant.
3. Kelgusida xatoni oldini olish (Best Practice): Defensive programming va TypeScript type checking bo'yicha tavsiya.`
  },

  // 🎨 Vizual & AI Media
  {
    id: "tpl_vis_1",
    category: "visual",
    badge: "Midjourney 8K",
    title: "Mahsulot Studiya Fotosessiyasi",
    desc: "Minimalistik fon, yumshoq yorug'lik va 8K fotorealistik reklama tasviri",
    variables: [
      { key: "MAHSULOT TAVSIFI", label: "Mahsulot Tafsilotlari", placeholder: "Masalan: Oq keramik chashka va yog'och taglik", type: "text" },
      { key: "FON VA MUHIT", label: "Fon va Stol Muhiti", placeholder: "Masalan: Skandinaviya uslubidagi marmar stol, kofe donalari", type: "text" },
      { key: "YORUGLIK", label: "Yorug'lik Uslubi", placeholder: "Masalan: Ertalabki tabiiy quyosh nurlari, yumshoq soylar", type: "text" }
    ],
    sampleData: {
      "MAHSULOT TAVSIFI": "Luxury qora shisha flakondagi erkaklar atiri (parfyum)",
      "FON VA MUHIT": "Minimalistik qora bazalt toshi ustida, nozik suv tomchilari bilan",
      "YORUGLIK": "Kinemotografik dramatik yon yorug'lik (studio rim light), oltin rangdagi akslar"
    },
    template: `/imagine prompt: Commercial studio product photography of [MAHSULOT TAVSIFI], set on [FON VA MUHIT], [YORUGLIK], shot on Hasselblad H6D-100c, 85mm lens, f/2.8, hyper-detailed glass textures, sharp reflections, clean composition, high-end advertising aesthetic, 8k resolution, photorealistic, Unreal Engine 5 render finish --ar 16:9 --v 6.0 --style raw`
  },
  {
    id: "tpl_vis_2",
    category: "visual",
    badge: "Kling Video",
    title: "30s Kinemotografik Rolik",
    desc: "Kling va Runway uchun kamera harakati va kadrlar ketma-ketligi",
    variables: [
      { key: "SAHNA TASVIRI", label: "Asosiy Sahna va Harakat", placeholder: "Masalan: Toshkent City uzra tunda uchayotgan futuristik dron", type: "text" },
      { key: "KAMERA HARAKATI", label: "Kamera Dinamikasi", placeholder: "Masalan: Smooth forward dolly zoom, 360 orbit", type: "text" }
    ],
    sampleData: {
      "SAHNA TASVIRI": "Toshkent ko'chalari bo'ylab yomg'irda harakatlanayotgan qora elektromobil, neon chiroqlari shahar ko'zgularida aks etmoqda",
      "KAMERA HARAKATI": "Dynamic low-angle tracking shot moving parallel to the car, seamless speed ramp"
    },
    template: `Cinematic video generation prompt:

Scene Description: [SAHNA TASVIRI]
Camera Movement: [KAMERA HARAKATI]
Lighting & Atmosphere: Moody cyberpunk neon backlight, wet asphalt reflections, ultra-sharp focus, cinematic film grain, 4k 60fps, anamorphic lens flare.`
  }
];

let currentCategory = "smm";
let selectedTemplateId = "tpl_smm_1";
let templateValuesState = {};

function selectCategory(catKey, btnEl) {
  triggerHaptic("light");
  currentCategory = catKey;

  document.querySelectorAll(".categories-filter-bar .cat-filter-btn").forEach(btn => btn.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  renderTemplateCards(catKey);
}

function renderTemplateCards(catKey = currentCategory) {
  const slider = document.getElementById("templatesSlider");
  if (!slider) return;
  slider.innerHTML = "";

  const templates = BIZNES_TEMPLATES.filter(t => t.category === catKey);
  if (templates.length === 0) return;

  const isCurrentInCat = templates.some(t => t.id === selectedTemplateId);
  if (!isCurrentInCat) {
    selectedTemplateId = templates[0].id;
    templateValuesState = { ...templates[0].sampleData };
  }

  templates.forEach(t => {
    const isSelected = (t.id === selectedTemplateId);
    const card = document.createElement("div");
    card.className = "template-card-item" + (isSelected ? " selected" : "");
    card.onclick = () => selectTemplate(t.id);
    card.innerHTML = `
      <span class="template-badge">${t.badge}</span>
      <div class="template-title">${t.title}</div>
      <div class="template-desc">${t.desc}</div>
    `;
    slider.appendChild(card);
  });

  renderVariablesBuilder();
}

function selectTemplate(templateId) {
  triggerHaptic("selection");
  selectedTemplateId = templateId;

  document.querySelectorAll(".template-card-item").forEach(c => c.classList.remove("selected"));
  const targetTpl = BIZNES_TEMPLATES.find(t => t.id === templateId);

  if (targetTpl) {
    const sliderCards = document.querySelectorAll(".template-card-item");
    const templates = BIZNES_TEMPLATES.filter(t => t.category === targetTpl.category);
    const idx = templates.findIndex(t => t.id === templateId);
    if (idx > -1 && sliderCards[idx]) {
      sliderCards[idx].classList.add("selected");
    }
    templateValuesState = { ...targetTpl.sampleData };
    renderVariablesBuilder();
  }
}

function buildPromptFromVariables() {
  const tpl = BIZNES_TEMPLATES.find(t => t.id === selectedTemplateId);
  if (!tpl) return "";

  let res = tpl.template;
  tpl.variables.forEach(v => {
    const val = (templateValuesState[v.key] !== undefined && templateValuesState[v.key] !== "")
      ? templateValuesState[v.key]
      : (tpl.sampleData[v.key] || `[${v.key}]`);
    res = res.split(`[${v.key}]`).join(val);
  });
  return res;
}

function renderVariablesBuilder() {
  const box = document.getElementById("variablesBuilderBox");
  const tpl = BIZNES_TEMPLATES.find(t => t.id === selectedTemplateId);
  if (!box || !tpl) return;

  const inputsHtml = tpl.variables.map(v => {
    const val = templateValuesState[v.key] !== undefined ? templateValuesState[v.key] : (tpl.sampleData[v.key] || "");
    if (v.type === "textarea") {
      return `
        <div class="vb-input-group">
          <label class="vb-label">${v.label}</label>
          <textarea class="vb-textarea-input" placeholder="${v.placeholder}" oninput="onVariableChange('${v.key}', this.value)">${val}</textarea>
        </div>
      `;
    } else {
      return `
        <div class="vb-input-group">
          <label class="vb-label">${v.label}</label>
          <input type="text" class="vb-text-input" value="${val.replace(/"/g, '&quot;')}" placeholder="${v.placeholder}" oninput="onVariableChange('${v.key}', this.value)">
        </div>
      `;
    }
  }).join("");

  const liveText = buildPromptFromVariables();

  box.innerHTML = `
    <div class="vb-top-nav-bar">
      <button class="vb-back-home-chip" onclick="switchSubnav('generator')">
        <span>🏠</span> <span>Asosiy Menyu</span>
      </button>
      <button class="vb-autofill-btn" onclick="fillTemplateSample()">
        💡 Namunani to'ldirish
      </button>
    </div>

    <div class="vb-head">
      <div>
        <div class="vb-title">
          <span>⚙️</span> <span>${tpl.title}</span>
        </div>
        <div class="vb-subtitle">${tpl.desc}</div>
      </div>
    </div>

    <div class="vb-inputs-list">
      ${inputsHtml}
    </div>

    <div class="vb-live-box">
      <div class="vb-live-label">
        <span>⚡ Tayyor Canli Prompt:</span>
        <span style="font-size:10px; color:#94a3b8; font-weight:600;">O'zgaruvchilar bilan real-time yangilanadi</span>
      </div>
      <div class="vb-live-preview" id="vbLivePreviewText">${liveText}</div>
    </div>

    <!-- Primary In-App Action -->
    <button class="hero-action-copy-btn" id="vbCopyBtn" onclick="copyTemplatePrompt(this)">
      <span>📋</span> <span>Promptni Nusxalash</span>
    </button>

    <!-- Telegram Bot Direct Action -->
    <button class="bot-launch-action-btn" onclick="openTemplateInGPTifyBot()">
      <span>🤖</span> <span>Botda Darhol Natija Olish (@GPTify_uz_bot)</span>
    </button>

    <button class="reset-back-btn" onclick="switchSubnav('generator')">
      <span>🏠</span> <span>Asosiy Menyu (Generator)ga Qaytish</span>
    </button>

    <!-- Optional External AI destinations -->
    <div class="external-actions-block">
      <div class="external-actions-label">
        <span>↗️</span> <span>Tashqi ilovada ochish (ixtiyoriy):</span>
      </div>
      <div class="output-actions-grid">
        <button class="action-btn chatgpt" onclick="openTemplateInChatGPT()">
          <span>🤖</span> <span>ChatGPT</span>
        </button>
        <button class="action-btn gemini" onclick="openTemplateInGemini()">
          <span>✨</span> <span>Gemini</span>
        </button>
        <button class="action-btn tg" onclick="shareTemplateToTelegram()">
          <span>✈️</span> <span>Do'stlarga</span>
        </button>
      </div>
    </div>
  `;
}

function onVariableChange(key, value) {
  templateValuesState[key] = value;
  const liveEl = document.getElementById("vbLivePreviewText");
  if (liveEl) {
    liveEl.textContent = buildPromptFromVariables();
  }
}

function fillTemplateSample() {
  triggerHaptic("selection");
  const tpl = BIZNES_TEMPLATES.find(t => t.id === selectedTemplateId);
  if (!tpl) return;

  templateValuesState = { ...tpl.sampleData };
  renderVariablesBuilder();
  showToast("Namunaviy ma'lumotlar to'ldirildi! 💡");
}

function copyTemplatePrompt(btn) {
  const text = buildPromptFromVariables();
  if (!text) {
    showToast("Nusxalash uchun prompt topilmadi!");
    return;
  }
  copyText(text);

  const targetBtn = btn || document.getElementById("vbCopyBtn");
  if (targetBtn) {
    const origHtml = targetBtn.innerHTML;
    targetBtn.innerHTML = "<span>✓</span> <span>Nusxalandi!</span>";
    targetBtn.style.background = "#059669";
    targetBtn.style.color = "#ffffff";
    setTimeout(() => {
      targetBtn.innerHTML = origHtml;
      targetBtn.style.background = "";
      targetBtn.style.color = "";
    }, 2000);
  }
}

function openTemplateInGPTifyBot() {
  const text = buildPromptFromVariables();
  if (!text) {
    showToast("Avval qolipni to'ldiring! ⚠️");
    return;
  }
  copyText(text, "Prompt nusxalandi! Botga 'Paste' qilib yuboring 🤖");
  const url = "https://t.me/GPTify_uz_bot?start=prompt_lab";
  const tg = getTg();
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    openExternalUrl(url);
  }
}

function openTemplateInChatGPT() {
  const text = buildPromptFromVariables();
  if (!text) {
    showToast("Avval qolipni to'ldiring! ⚠️");
    return;
  }
  copyText(text, "Prompt nusxalandi va ChatGPT ochilmoqda! 🤖");
  const url = `https://chatgpt.com/?q=${encodeURIComponent(text)}`;
  openExternalUrl(url);
}

function openTemplateInGemini() {
  const text = buildPromptFromVariables();
  if (!text) {
    showToast("Avval qolipni to'ldiring! ⚠️");
    return;
  }
  copyText(text, "Prompt nusxalandi! Gemini oynasida 'Paste' qiling ✨");
  openExternalUrl("https://gemini.google.com/app");
}

function shareTemplateToTelegram() {
  const text = buildPromptFromVariables();
  if (!text) {
    showToast("Avval qolipni to'ldiring! ⚠️");
    return;
  }
  const shareText = encodeURIComponent(`GPTify Prompt Ustaxonasidan professional prompt:\n\n${text}\n\n👉 @GPTify_uz_bot`);
  const url = `https://t.me/share/url?url=${shareText}`;
  const tg = getTg();
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    openExternalUrl(url);
  }
}

// =============================================================================
// 5. CURATED PROMPTS LIBRARY (SEARCHABLE CATALOGUE)
// =============================================================================
const CURATED_LIBRARY_PROMPTS = [
  {
    "id": "smm_1",
    "category": "smm",
    "title": "Reels uchun 3 Soniyalik Virusli Ilgak (Hook)",
    "tags": [
      "Reels",
      "Hook",
      "SMM"
    ],
    "prompt": "Sen Instagram algoritmlarini chuqur biluvchi Reels rejissyori va kopiraytersan. [MAHSULOT/MAVZU] bo'yicha tomoshabin lentani surib yubormasligi uchun birinchi 3 soniyada diqqatni mixlab qo'yuvchi 5 ta kuchli provokatsion, kutilmagan va emotsional Hook (kirish sarlavhasi) yoz."
  },
  {
    "id": "smm_2",
    "category": "smm",
    "title": "AIDA Formulali Sotuvchi Caption (Post)",
    "tags": [
      "AIDA",
      "Kopirayting",
      "Savdo"
    ],
    "prompt": "AIDA (Attention, Interest, Desire, Action) formulasi asosida [MAHSULOT] sotuvi uchun Instagram va Telegram post matnini yoz. E'tiborni tortuvchi sarlavha, mijozning og'riqli nuqtasi, mahsulotning 3 ta asosiy foydasi va aniq Call-to-Action (CTA) bo'lsin."
  },
  {
    "id": "smm_3",
    "category": "smm",
    "title": "Ekspert Obro'sini Oshiruvchi Foydali Post",
    "tags": [
      "Ekspert",
      "ShaxsiyBrend",
      "Kontent"
    ],
    "prompt": "[SOHA/KASB] sohasida obunachilarning ishonchini qozonish va ekspert maqomini shakllantirish uchun 'Ko'pchilik bilmaydigan 3 ta nozik sir' mavzusida amaliy, faktlarga boy va oson tushuniladigan post matnini tuz."
  },
  {
    "id": "smm_4",
    "category": "smm",
    "title": "Instagram Karusel (Carousel) Slaydlar Matni",
    "tags": [
      "Karusel",
      "Ta'lim",
      "Instagram"
    ],
    "prompt": "Instagramda saqlab olishlar (saves) sonini 3 barobar oshiruvchi 7 ta slayddan iborat karusel posti matnini yoz. Har bir slayd uchun: 1) Slayd sarlavhasi; 2) Qisqa lo'nda 2-3 qatorlik foydali maslahat; 3) Slayd dizayni uchun vizual ko'rsatma."
  },
  {
    "id": "smm_5",
    "category": "smm",
    "title": "1 Haftalik To'liq SMM Kontent Rejasi",
    "tags": [
      "Plan",
      "Reja",
      "SMM"
    ],
    "prompt": "[BIZNES NOMI] uchun dushanbadan yakshanbagacha bo'lgan 7 kunlik kontent rejasini jadval shaklida tuz: Kun | Format (Reels/Post/Stories) | Post mavzusi | Maqsad (Jalb qilish/Sotuv/Ekspertiza) | Asosiy g'oya."
  },
  {
    "id": "smm_6",
    "category": "smm",
    "title": "Instagram Stories Interaktiv O'yinlar Ssenariysi",
    "tags": [
      "Stories",
      "Interaktiv",
      "Engajment"
    ],
    "prompt": "Obunachilarning Stories ko'rishlar sonini va qamrovini oshirish uchun bir kunda 5 ta ketma-ket joylanadigan interaktiv Stories ssenariysi yoz: So'rovnoma (Poll), Savol-javob oynasi, Viktorina va reaksiyalar stikeri bilan."
  },
  {
    "id": "smm_7",
    "category": "smm",
    "title": "Telegram Kanal Uchun Qiziqarli So'rovnoma & Munozara",
    "tags": [
      "Telegram",
      "So'rovnoma",
      "Post"
    ],
    "prompt": "Telegram kanalda obunachilarni faol muhokama qilishga undovchi so'rovnoma va unga kirish posti yoz. Mavzu: [MAVZU]. Post samimiy, munozarali va har kim o'z fikrini izohlarda qoldirishi oson bo'lsin."
  },
  {
    "id": "smm_8",
    "category": "smm",
    "title": "Influencer / Bloggerga Hamkorlik Taklifi (DM)",
    "tags": [
      "Blogger",
      "Hamkorlik",
      "Outreach"
    ],
    "prompt": "Instagramda [AUDITORIYA] obunachilariga ega bloggerga brendimiz bilan hamkorlik qilish taklifi bo'yicha qisqa, diplomatik va qiziqtiruvchi Direct xabari yoz. Xatda: qadrlash, hamkorlik shartlari (barter yoki to'lov) va keyingi qadam bo'lsin."
  },
  {
    "id": "smm_9",
    "category": "smm",
    "title": "Mijoz Keysi (Case Study): Muammo -> Natija",
    "tags": [
      "CaseStudy",
      "Keys",
      "Isbot"
    ],
    "prompt": "Mijozimiz [MIJOZ NOMI] erishgan yutuq haqida sotuvchi keys posti yoz: 1) Kelishdan oldingi qiyinchilik va og'riq; 2) Biz taklif qilgan aniq yechim; 3) Olingan aniq raqamli natija; 4) O'xshash muammosi borlar uchun harakatga chorlov."
  },
  {
    "id": "smm_10",
    "category": "smm",
    "title": "Sotuv Haftaligi (Flash Sale) E'lon Posti",
    "tags": [
      "Aksiya",
      "Chegirma",
      "FOMO"
    ],
    "prompt": "Faqat 3 kun davom etadigan 30% lik maxsus taklif bo'yicha FOMO (imkoniyatni qo'ldan boy berish qo'rquvi) hissini uyg'otuvchi dinamik sotuv posti yoz. Shoshilinchlik (urgency) va zudlik bilan buyurtma berish usuli aniq ko'rsatilsin."
  },
  {
    "id": "smm_11",
    "category": "smm",
    "title": "TikTok Uchun 15 Soniyalik Trend Format Ssenariysi",
    "tags": [
      "TikTok",
      "Trend",
      "Video"
    ],
    "prompt": "TikTok algoritmlarida tez trendga chiqadigan dinamik 15 soniyalik video ssenariysi tuz: 'Men buni bilishimdan oldin va keyin' formati. Kamera harakati, matnlar va ovozli audio moslashuvini jadval qilib ber."
  },
  {
    "id": "smm_12",
    "category": "smm",
    "title": "Mijozlar Ko'p Beradigan Savollarga (FAQ) Post",
    "tags": [
      "FAQ",
      "Savollar",
      "Ishonch"
    ],
    "prompt": "[MAHSULOT/XIZMAT] bo'yicha mijozlar eng ko'p ikkilanadigan 5 ta savolga (masalan: yetkazib berish, kafolat, narx, to'lov) samimiy, ishonch uyg'otuvchi va e'tirozlarni yo'q qiluvchi javoblar posti tayyorla."
  },
  {
    "id": "smm_13",
    "category": "smm",
    "title": "Shaxsiy Brend: 'Nega Aynan Shu Ishni Boshlaganman'",
    "tags": [
      "Storytelling",
      "Brend",
      "Samimiylik"
    ],
    "prompt": "Auditoriya bilan chuqur emotsional bog'lanish yaratuvchi samimiy hikoya (storytelling) posti yoz: Noldan boshlagan qiyinchiliklar, birinchi muvaffaqiyatsizlik va bugungi maqsadlar haqida ilhomlantiruvchi post."
  },
  {
    "id": "smm_14",
    "category": "smm",
    "title": "Sohadagi Keng Tarqalgan 5 ta Afsona (Mif) Tahlili",
    "tags": [
      "Miflar",
      "Faktlar",
      "Ta'lim"
    ],
    "prompt": "[SOHA NOMI] haqida odamlar ishonadigan 5 ta noto'g'ri tushunchani (mifni) professional faktlar va amaliy misollar bilan inkor qiluvchi, tomoshabinni hayratda qoldiradigan post yoz."
  },
  {
    "id": "smm_15",
    "category": "smm",
    "title": "Giveaway / Tanlov O'tkazishning Aniq Qoidalari",
    "tags": [
      "Giveaway",
      "Konkurs",
      "Obunachilar"
    ],
    "prompt": "Instagram sahifamiz uchun qonuniy, tushunarli va maksimal darajada yangi auditoriya jalb qiluvchi tanlov (giveaway) shartlari postini yoz. Qoidalar oddiy, shaffof va g'olibni aniqlash muddati aniq belgilansin."
  },
  {
    "id": "smm_16",
    "category": "smm",
    "title": "Direct'da Mijozni Xaridga Yetaklovchi Skript",
    "tags": [
      "Direct",
      "Skript",
      "Savdo"
    ],
    "prompt": "Instagram Direct'ga 'Narxi qancha?' deb yozgan potensial mijozga darhol narxni aytib qochirib yubormasdan, uning ehtiyojini aniqlab, 3 ta xabarda xaridga undovchi do'stona savdo skripti yoz."
  },
  {
    "id": "smm_17",
    "category": "smm",
    "title": "Podkast / Jonli Efir Uchun 10 ta Chuqur Savol",
    "tags": [
      "Podkast",
      "Efir",
      "Intervyu"
    ],
    "prompt": "[SOHA MUTAXASSISI] bilan o'tkaziladigan 45 daqiqalik jonli efir yoki podkast uchun standart bo'lmagan, tinglovchini zeriktirmaydigan va ekspertning eng qimmatli tajribalarini ochib beradigan 10 ta qiziq savol tuz."
  },
  {
    "id": "smm_18",
    "category": "smm",
    "title": "Bepul Lead-Magnet (Qo'llanma) Tarqatish Posti",
    "tags": [
      "LeadMagnet",
      "Obunachi",
      "Bonus"
    ],
    "prompt": "Obunachilarga bepul 'Foydali PDF qo'llanma' ulashish orqali Direct'da yoki Telegram botda yangi lidlar to'plash uchun qiziqtiruvchi post yoz: 'Izohda [SOZ] deb qoldiring va avtomatik yuboramiz'."
  },
  {
    "id": "smm_19",
    "category": "smm",
    "title": "Mahsulotni Qutidan Chiqarish (Unboxing) Ssenariysi",
    "tags": [
      "Unboxing",
      "Reels",
      "Vizual"
    ],
    "prompt": "[MAHSULOT] ning estetik, ASMR va qiziqarli unboxing (qutidan ochish) videosi uchun 20 soniyalik ssenariy tuz: Tovushlar, kadr yaqinlashuvlari, birinchi taassurot va mahsulotning nafis detallari."
  },
  {
    "id": "smm_20",
    "category": "smm",
    "title": "Mavsumiy Ob-Havo / Bayramga Moslashgan Post",
    "tags": [
      "Bayram",
      "Situatsion",
      "SMM"
    ],
    "prompt": "O'zbekistondagi yaqinlashib kelayotgan [BAYRAM/FASL] munosabati bilan samimiy tabrik va shu bilan birga mahsulotimiz ushbu kunlarda qanday eng yaxshi sovg'a yoki yechim bo'lishini nozik bog'lovchi post yoz."
  },
  {
    "id": "ecom_1",
    "category": "ecom",
    "title": "Uzum Market SEO Sarlavha & Kalit So'zlar",
    "tags": [
      "Uzum",
      "SEO",
      "Kartochka"
    ],
    "prompt": "Uzum Market qidiruv tizimida eng birinchi o'rinda chiqish uchun [MAHSULOT] nomiga eng ko'p qidiriladigan o'zbekcha va ruscha kalit so'zlardan iborat 90 belgilik SEO sarlavha va 15 ta search teglar tuz."
  },
  {
    "id": "ecom_2",
    "category": "ecom",
    "title": "Uzum / WB Mahsulotning To'liq Sotuvchi Tavsifi",
    "tags": [
      "Uzum",
      "WB",
      "Tavsif"
    ],
    "prompt": "[MAHSULOT] kartochkasi uchun to'liq tavsif matni tayyorla: 1) Kicker (3 ta muhim fakt); 2) Nima uchun kerak va qanday muammoni yechadi; 3) Emojilar bilan boyitilgan texnik parametrlar; 4) Komplektatsiya; 5) Kimlar uchun ideal."
  },
  {
    "id": "ecom_3",
    "category": "ecom",
    "title": "1 Yulduzli Salbiy Sharhga Professional Javob",
    "tags": [
      "Sharh",
      "Mijoz",
      "E'tiroz"
    ],
    "prompt": "Marketplace'da xaridor '[SALBIY FIKR]' deb 1 yulduz qoldirgan. Do'kon nomidan boshqa xaridorlar ko'zida do'kon obro'sini yanada oshiradigan, muammoni hal qilishga tayyor, o'ta xushmuomala javob yoz."
  },
  {
    "id": "ecom_4",
    "category": "ecom",
    "title": "Ijobiy Sharh Qoldirgan Xaridorga Minnatdorchilik",
    "tags": [
      "Sharh",
      "Loyallik",
      "Savdo"
    ],
    "prompt": "5 yulduzli ajoyib sharh qoldirgan xaridorga samimiy minnatdorchilik bildirish va do'kondan keyingi xarid uchun do'stona taklif bilan yakunlanuvchi iliq javob matni yoz."
  },
  {
    "id": "ecom_5",
    "category": "ecom",
    "title": "Wildberries 5 Slaydli Infografika Texnik Topshirig'i",
    "tags": [
      "Infografika",
      "Dizayn",
      "Wildberries"
    ],
    "prompt": "[MAHSULOT] uchun dizaynerga beriladigan 5 ta infografika slaydi matnlari: 1-slayd (Muqova triggeri), 2-slayd (Asosiy muammo va afzallik), 3-slayd (Ichki material/sifat), 4-slayd (O'lcham va qulaylik), 5-slayd (Kafolat va qadoq)."
  },
  {
    "id": "ecom_6",
    "category": "ecom",
    "title": "'Boshqa Joyda Arzonroq' E'tirozini Yopish",
    "tags": [
      "Savdo",
      "Narx",
      "E'tiroz"
    ],
    "prompt": "Mijoz 'Ushbu tovar boshqa do'konda arzonroq ekan' deb yozganda, narxni tushirmasdan, mahsulotning original sifati, rasmiy kafolati, tezkor bepul yetkazilishi va xavfsiz qadog'i hisobiga mijozni ishontiruvchi javob skripti yoz."
  },
  {
    "id": "ecom_7",
    "category": "ecom",
    "title": "Savatda Qolib Ketgan Mahsulot Eslatmasi (Push/SMS)",
    "tags": [
      "Savat",
      "SMS",
      "Konversiya"
    ],
    "prompt": "Saytda yoki botda mahsulotni savatga solib, lekin xaridni tugatmagan foydalanuvchiga yuboriladigan qisqa, do'stona va rad etib bo'lmas 10% chegirmali eslatma xabari tayyorla."
  },
  {
    "id": "ecom_8",
    "category": "ecom",
    "title": "Qo'shimcha Mahsulot Sotish (Cross-Sell / Up-Sell)",
    "tags": [
      "Upsell",
      "CrossSell",
      "Chek"
    ],
    "prompt": "[ASOSIY MAHSULOT] sotib olayotgan mijozga o'rtacha chekni 30% ga oshirish uchun mos keluvchi aksessuar yoki qo'shimcha tovar taklif qilish skripti va do'stona xabari yoz."
  },
  {
    "id": "ecom_9",
    "category": "ecom",
    "title": "Mijoz Uchun Aniq O'lcham Jadvali (Size Chart) Tavsifi",
    "tags": [
      "Kiyim",
      "O'lcham",
      "Qaytuv"
    ],
    "prompt": "Kiyim yoki poyabzal savdosida noto'g'ri o'lcham tufayli tovar qaytib kelishini (returns) kamaytirish uchun tushunarli, aniq o'lchash bo'yicha ko'rsatma va o'lchamlar jadvali matnini tuz."
  },
  {
    "id": "ecom_10",
    "category": "ecom",
    "title": "Mahsulotni Qaytarish (Refund/Return) Xushmuomala Yo'riqnomasi",
    "tags": [
      "Qaytarish",
      "Servis",
      "Xushmuomala"
    ],
    "prompt": "Xaridor tovarni qaytarmoqchi bo'lganida nizo keltirib chiqarmasdan, qonuniy va xushmuomala tartibda qanday qaytarish yoki almashtirib olish mumkinligini tushuntiruvchi tinchlantiruvchi xabar yoz."
  },
  {
    "id": "ecom_11",
    "category": "ecom",
    "title": "Yetkazib Berish Kechikkanida Mijozdan Uzr So'rash Xabari",
    "tags": [
      "Logistika",
      "Kechikish",
      "Uzr"
    ],
    "prompt": "Kuryerlik xizmati yoki ob-havo sababli tovar kechikkanida, mijoz g'azablanmasdan oldin unga yuboriladigan samimiy uzr so'rash va kichik kompensatsiya (bonus/kupon) taqdim etish xati yoz."
  },
  {
    "id": "ecom_12",
    "category": "ecom",
    "title": "Kam Qolgan Tovar Bo'yicha Shoshilinch Xabar (Stock Alert)",
    "tags": [
      "Shoshilinch",
      "Savdo",
      "FOMO"
    ],
    "prompt": "'Omborda oxirgi 7 dona qoldi' mavzusida obunachilarni tezkor buyurtma berishga undovchi dinamik, emojilar bilan bezatilgan e'lon matni tuz."
  },
  {
    "id": "ecom_13",
    "category": "ecom",
    "title": "Qalbaki (Poddelka) Tovarlardan Himoya Ko'rsatmasi",
    "tags": [
      "Original",
      "Sifat",
      "Ishonch"
    ],
    "prompt": "Bozorda ko'paygan arzon qalbaki nusxalardan xaridorni ogohlantiruvchi va original mahsulotimizni qanday ajratib olish mumkinligini ko'rsatuvchi 4 ta tekshirish nuqtasi haqida post matni yoz."
  },
  {
    "id": "ecom_14",
    "category": "ecom",
    "title": "Katta Xarid Qilgan Doimiy Mijozga VIP Rahmat Xati",
    "tags": [
      "VIP",
      "Loyallik",
      "Mijoz"
    ],
    "prompt": "Do'konimizdan muntazam ravishda xarid qilayotgan doimiy mijozga uning qadrli ekanligini his qildiruvchi shaxsiy minnatdorchilik xati va unga biriktirilgan doimiy VIP chegirma e'loni yoz."
  },
  {
    "id": "ecom_15",
    "category": "ecom",
    "title": "To'plam (Bundle) Sifatida Sotish Taklifi",
    "tags": [
      "To'plam",
      "Set",
      "Aksiya"
    ],
    "prompt": "Ikkita yoki uchta bog'liq mahsulotni bitta to'plam (set) qilib, alohida sotib olgandan ko'ra 20% arzonroq narxda taqdim etuvchi kuchli sotuv taklifi matnini yoz."
  },
  {
    "id": "ecom_16",
    "category": "ecom",
    "title": "Yangi Tovar Kelishi (Premyera) Anons Posti",
    "tags": [
      "Premyera",
      "Yangi",
      "Kutilayotgan"
    ],
    "prompt": "Tez kunda sotuvga chiqadigan yangi eksklyuziv mahsulot uchun kutish hissini (hype) uyg'otuvchi, 'Birinchilardan bo'lib bron qiling' chaqirig'iga ega premyera posti tayyorla."
  },
  {
    "id": "ecom_17",
    "category": "ecom",
    "title": "Mavsumiy Ombor Tozalash Savdosi (Clearance Sale)",
    "tags": [
      "Sale",
      "Likvidatsiya",
      "Arzon"
    ],
    "prompt": "Mavsum tugashi munosabati bilan ombordagi qolgan tovarlarni eng arzon ulgurji narxlarda tugatish (likvidatsiya) e'loni matnini yoz."
  },
  {
    "id": "ecom_18",
    "category": "ecom",
    "title": "Fotoli Sharh Qoldirgan Xaridorga Sovg'a E'loni",
    "tags": [
      "Review",
      "Sovg'a",
      "Rasm"
    ],
    "prompt": "Xaridorlarni marketplace kartochkasiga fotoli yoki videoli samimiy sharh qoldirishga rag'batlantiruvchi va evaziga keyingi xaridga 20,000 so'm bonus beruvchi taklif matnini tuz."
  },
  {
    "id": "ecom_19",
    "category": "ecom",
    "title": "Rasmiy Kafolat Shartlari va Servis Ko'rsatmasi",
    "tags": [
      "Kafolat",
      "Servis",
      "Xavfsizlik"
    ],
    "prompt": "Elektronika yoki texnika xaridori uchun 1 yillik rasmiy kafolat qanday ishlashi, nosozlik bo'lsa qayerga murojaat qilish kerakligini aniq va xotirjamlik bag'ishlovchi ohangda tushuntir."
  },
  {
    "id": "ecom_20",
    "category": "ecom",
    "title": "Do'kon Chat Boti Uchun 5 ta Tezkor Javob (Quick Reply)",
    "tags": [
      "Chatbot",
      "Tezkor",
      "Mijoz"
    ],
    "prompt": "Mijoz xabar yozganda operator kutdirmasligi uchun 5 ta eng ko'p beriladigan savolga tayyor avtomatik shablon matnlari yoz: Salomlashish, To'lov turlari, Yetkazish muddati, Joylashuv, Konsultatsiya."
  },
  {
    "id": "biz_1",
    "category": "biznes",
    "title": "B2B Rad Etib Bo'lmas Tijorat Taklifi (KP)",
    "tags": [
      "B2B",
      "KP",
      "Tijorat"
    ],
    "prompt": "Korporativ mijoz [KOMPANIYA NOMI] uchun individual tijorat taklifi (KP) ssenariysini tuz. Taklifda mijozning vaqti va xarajatini kamaytirish, 3 oylik kutilayotgan ROI (daromadlilik) hisobi va demo uchrashuvga chaqiruv bo'lsin."
  },
  {
    "id": "biz_2",
    "category": "biznes",
    "title": "Didox Shartnoma Bandlarini Huquqiy Tekshirish",
    "tags": [
      "Shartnoma",
      "Didox",
      "Yurist"
    ],
    "prompt": "O'zbekiston Respublikasi Fuqarolik kodeksi va amaldagi qonunchilik talablari asosida ushbu shartnoma loyihasini xatarlar (risks), noaniq jarimalar va bir tomonlama majburiyatlar bo'yicha tahlil qil va tuzatishlar tavsiya et."
  },
  {
    "id": "biz_3",
    "category": "biznes",
    "title": "Hamkor Tashkilot Rahbariga Rasmiy Xat",
    "tags": [
      "Xat",
      "Diplomatiya",
      "Protokol"
    ],
    "prompt": "O'zbekiston ish yuritish va davlat tili qoidalariga muvofiq, vazirlik yoki yirik kompaniya rahbari nomiga strategik hamkorlik o'rnatish to'g'risida diplomatik, ehtiromli va aniq maqsadli rasmiy xat matnini tuz."
  },
  {
    "id": "biz_4",
    "category": "biznes",
    "title": "Xarajatlarni 15% ga Qisqartirish Rejasi",
    "tags": [
      "Moliya",
      "Xarajat",
      "Optimizatsiya"
    ],
    "prompt": "Kichik va o'rta biznes korxonasida ishlab chiqarish sifatiga ta'sir qilmagan holda operatsion xarajatlarni (OPEX) 15% ga optimallashtirish bo'yicha 5 ta amaliy yo'nalish va chora-tadbirlar rejasini tuzib ber."
  },
  {
    "id": "biz_5",
    "category": "biznes",
    "title": "Xodimlar Uchun Aniq KPI va Motivatsiya Tizimi",
    "tags": [
      "KPI",
      "HR",
      "Boshqaruv"
    ],
    "prompt": "[LAVOZIM NOMI] lavozimi uchun oylik shaffof KPI ko'rsatkichlari tizimini ishlab chiq: 3 ta o'lchanadigan miqdoriy ko'rsatkich, 2 ta sifat ko'rsatkichi, bonus hisoblash formulasi va bajarilmagan holdagi qoidalar."
  },
  {
    "id": "biz_6",
    "category": "biznes",
    "title": "Boshqaruv Uchun 1 Sahifalik Haftalik Hisobot",
    "tags": [
      "Hisobot",
      "Dashboard",
      "Rahbar"
    ],
    "prompt": "Kompaniya bosh direktori (CEO) uchun 1 sahifalik haftalik hisobot (Executive Summary) formatini tayyorla: Daromad/Xarajat, yangi mijozlar soni, hal qilingan asosiy vazifalar va kelgusi haftaning 3 ta bosh fokusi."
  },
  {
    "id": "biz_7",
    "category": "biznes",
    "title": "Qarzdorlikni Undirish Bo'yicha Ogohlantirish Xati (Pretenziya)",
    "tags": [
      "Qarzdorlik",
      "Pretenziya",
      "Moliya"
    ],
    "prompt": "To'lov muddatini 30 kundan ortiq kechiktirgan kontragentga sudgacha bo'lgan rasmiy talabnoma (pretenziya) xatini tuz. Diplomatik, ammo qat'iy huquqiy oqibatlar va jarimalar ko'rsatilgan bo'lsin."
  },
  {
    "id": "biz_8",
    "category": "biznes",
    "title": "Yangi Xodimni Ishga Olish Suhbati (Interview) Savollari",
    "tags": [
      "HR",
      "Interview",
      "Suhbat"
    ],
    "prompt": "[LAVOZIM] bo'yicha nomzodning nafaqat kasbiy bilimlarini (Hard skills), balki jamoada ishlash, mas'uliyat va stressga chidamliligini (Soft skills) aniqlash uchun 8 ta chuqur keys savollarini tuz."
  },
  {
    "id": "biz_9",
    "category": "biznes",
    "title": "Standart Ish Yuritish Yo'riqnomasi (SOP - Reglamet)",
    "tags": [
      "SOP",
      "Reglament",
      "Tizim"
    ],
    "prompt": "[JARAYON NOMI] jarayoni uchun har qanday yangi xodim darhol tushunib, xatosiz bajara oladigan bosqichma-bosqich Standart Operatsion Tartib (SOP) yo'riqnomasini jadval qilib yoz."
  },
  {
    "id": "biz_10",
    "category": "biznes",
    "title": "Investorlar Uchun 1 Daqiqalik Elevator Pitch",
    "tags": [
      "Pitch",
      "Startap",
      "Investitsiya"
    ],
    "prompt": "Biznes g'oyamizni investorga 60 soniyada taqdim etuvchi Elevator Pitch matnini yoz: Muammo nima, bizning unikal yechim, bozor hajmi, bugungi traksiyamiz va so'ralayotgan investitsiya miqdori."
  },
  {
    "id": "biz_11",
    "category": "biznes",
    "title": "SWOT Tahlili va Xavflarni Boshqarish (Risk Matrix)",
    "tags": [
      "SWOT",
      "Strategiya",
      "Xavflar"
    ],
    "prompt": "[BIZNES SOHASI] bo'yicha O'zbekiston bozoridagi Kuchli (Strengths), Zaif (Weaknesses) tomonlar, Imkoniyatlar (Opportunities) va Xatarlar (Threats) bo'yicha to'liq SWOT matritsasi va xavflarni yumshatish rejasini tuz."
  },
  {
    "id": "biz_12",
    "category": "biznes",
    "title": "Murakkab Excel XLOOKUP / INDEX-MATCH Formulalari",
    "tags": [
      "Excel",
      "Formula",
      "Moliya"
    ],
    "prompt": "Excelda 2 ta turli varaqdagi (sheets) ma'lumotlarni solishtirib, umumiy identifikator (ID) bo'yicha mos keluvchi qiymatlarni topib, xato chiqmasligi uchun IFERROR bilan himoyalangan murakkab formulani tuz va o'zbekcha izohla."
  },
  {
    "id": "biz_13",
    "category": "biznes",
    "title": "Yangi Mahsulotni Bozorga Chiqarish (Go-To-Market)",
    "tags": [
      "GTM",
      "Marketing",
      "Strategiya"
    ],
    "prompt": "[YANGI MAHSULOT] ni O'zbekiston bozoriga 30 kun ichida muvaffaqiyatli chiqarish (Go-To-Market) bo'yicha bosqichma-bosqich marketing va savdo yo'l xaritasini tuz."
  },
  {
    "id": "biz_14",
    "category": "biznes",
    "title": "To'lov Muddatini Uzaytirishni So'rash Xati",
    "tags": [
      "To'lov",
      "Muzokara",
      "Hamkorlik"
    ],
    "prompt": "Yetkazib beruvchi hamkorimizga vaqtinchalik aylanma mablag'lar yetishmovchiligi sababli to'lov muddatini 15 kunga uzaytirishni iltimos qiluvchi, o'zaro ishonchni saqlab qoluvchi professional xat yoz."
  },
  {
    "id": "biz_15",
    "category": "biznes",
    "title": "Mijozlar Ketib Qolishini (Churn Rate) Kamaytirish Rejasi",
    "tags": [
      "Loyallik",
      "Mijoz",
      "Churn"
    ],
    "prompt": "Xizmatimizdan foydalanishni to'xtatayotgan mijozlarni aniqlash, ularning sabablarini tahlil qilish va ularni qaytarish (retention) bo'yicha 4 bosqichli amaliy tizim ishlab chiq."
  },
  {
    "id": "biz_16",
    "category": "biznes",
    "title": "Kompaniya Bo'limlari O'rtasidagi RACI Matritsasi",
    "tags": [
      "RACI",
      "Boshqaruv",
      "Loyiha"
    ],
    "prompt": "[LOYIHA NOMI] loyihasini amalga oshirishda kim javobgar (Responsible), kim hisob beruvchi (Accountable), kim maslahatchi (Consulted) va kim xabardor (Informed) ekanligini belgilovchi RACI jadvalini tuz."
  },
  {
    "id": "biz_17",
    "category": "biznes",
    "title": "Muzokara va Uchrashuv Bayonnomasi (Meeting Minutes)",
    "tags": [
      "Protokol",
      "Uchrashuv",
      "Boshqaruv"
    ],
    "prompt": "Ikki kompaniya rahbarlari o'rtasida bo'lib o'tgan strategik uchrashuv natijalari bo'yicha qat'iy bayonnoma (Minutes of Meeting) shaklini tayyorla: Ko'rilgan masalalar, qabul qilingan qarorlar va mas'ullar."
  },
  {
    "id": "biz_18",
    "category": "biznes",
    "title": "Yillik Korxona Byudjeti Taqsimoti Modeli",
    "tags": [
      "Byudjet",
      "Moliya",
      "Reja"
    ],
    "prompt": "Yillik kutilayotgan daromadning 100% qismini Marketing, Ish haqi, R&D, Operatsion xarajatlar va Favqulodda zaxiraga foizlarda optimal taqsimlash modelini asoslab ber."
  },
  {
    "id": "biz_19",
    "category": "biznes",
    "title": "Kompaniya Axborot Xavfsizligi va NDA Yo'riqnomasi",
    "tags": [
      "NDA",
      "Xavfsizlik",
      "Yurist"
    ],
    "prompt": "Xodimlarning tijorat sirlarini, mijozlar bazasini va intellektual mulkni tashqariga chiqarmasligi uchun ichki korporativ xavfsizlik va NDA talablari to'g'risida eslatma hujjati tuz."
  },
  {
    "id": "biz_20",
    "category": "biznes",
    "title": "Mijozdan Mahsulot Narxini Oshirish Haqida Xat",
    "tags": [
      "Narx",
      "Xat",
      "Muzokara"
    ],
    "prompt": "Xomashyo va logistika qimmatlashgani sababli mavjud mijozlarimizga xizmat narxi 10% ga oshishini norozilik keltirib chiqarmasdan, sifatni saqlash nuqtai nazaridan asoslab beruvchi xat matnini yoz."
  },
  {
    "id": "it_1",
    "category": "it",
    "title": "Python / JS Kodini Xavfsizlik Auditi (Security Check)",
    "tags": [
      "Security",
      "Audit",
      "Kod"
    ],
    "prompt": "Ushbu kod parchasini xavfsizlik bo'yicha tahlil qil: SQL Injection, XSS, CSRF zaifliklari, ochiq qolgan API kalitlar va asinxron xotira sarfini tekshirib, xavfsiz holatga keltirilgan kodni yoz."
  },
  {
    "id": "it_2",
    "category": "it",
    "title": "React Komponentini Refaktoring va Tezlashtirish",
    "tags": [
      "React",
      "Refactor",
      "Frontend"
    ],
    "prompt": "Ushbu React komponentini tahlil qilib, ortiqcha re-renderlarni bartaraf etish (useMemo, useCallback), Clean Code va SOLID prinsiplariga moslab, toza va optimal holatga keltirib ber."
  },
  {
    "id": "it_3",
    "category": "it",
    "title": "Murakkab SQL So'rovi: JOIN, GROUP BY & Oyna Funksiyalari",
    "tags": [
      "SQL",
      "Database",
      "Backend"
    ],
    "prompt": "PostgreSQL bazasida 3 ta jadvaldan mijozlarning oylik xaridlari yig'indisi, ularning o'rtacha cheki va har bir toifadagi o'rnini (RANK/DENSE_RANK) hisoblovchi optimal SQL so'rovini yoz va indekslar bo'yicha maslahat ber."
  },
  {
    "id": "it_4",
    "category": "it",
    "title": "REST API Endpoint Arxitekturasi va Swagger Hujjati",
    "tags": [
      "API",
      "REST",
      "Swagger"
    ],
    "prompt": "[TIZIM NOMI] uchun mukammal RESTful API arxitekturasini loyihalashtir: URL tuzilishi, HTTP metodlar, Status kodlar, Request/Response JSON namunalari va xatoliklar qaytarish standarti."
  },
  {
    "id": "it_5",
    "category": "it",
    "title": "Error Stack Trace Tahlili va Aniq Bug Fix",
    "tags": [
      "BugFix",
      "Debug",
      "Xato"
    ],
    "prompt": "Ushbu server xatoligi logini (Stack Trace) tahlil qil: Xatoning tub sababi (Root cause) nima, qaysi qatorda yuz bergan va uni darhol tuzatuvchi to'liq kod blokini ko'rsat."
  },
  {
    "id": "it_6",
    "category": "it",
    "title": "Production Uchun Dockerfile va Docker Compose",
    "tags": [
      "Docker",
      "DevOps",
      "Deploy"
    ],
    "prompt": "[TEXNOLOGIYA, masalan: Node.js + PostgreSQL + Redis] uchun minimal o'lchamli (Multi-stage build), xavfsiz va tez yuklanuvchi production-ready Dockerfile va docker-compose.yml faylini yoz."
  },
  {
    "id": "it_7",
    "category": "it",
    "title": "Git Merge Konflikti va To'g'ri Rebase Yo'riqnomasi",
    "tags": [
      "Git",
      "GitHub",
      "VCS"
    ],
    "prompt": "Git'da ikkita branch to'qnashganda (merge conflict) kodni yo'qotmasdan, toza tarix bilan 'git rebase' qilish va konfliktlarni bosqichma-bosqich hal qilish bo'yicha terminal buyruqlarini tushuntir."
  },
  {
    "id": "it_8",
    "category": "it",
    "title": "Unit va Integratsion Testlar Yozish (Jest / PyTest)",
    "tags": [
      "Testing",
      "Jest",
      "PyTest"
    ],
    "prompt": "Ushbu funksiya uchun 100% test coverage ta'minlovchi unit testlar yoz: Ijobiy holat (Happy path), noto'g'ri kiritilgan ma'lumotlar (Edge cases) va xatolik tashlash holatlarini qamrab olsin."
  },
  {
    "id": "it_9",
    "category": "it",
    "title": "Sekin Ishlayotgan Ma'lumotlar Bazasini Tezlashtirish",
    "tags": [
      "Database",
      "Index",
      "Performance"
    ],
    "prompt": "10 million satrli jadvalda qidiruv sekinlashganida indekslar (B-Tree, GIN), EXPLAIN ANALYZE tahlili va so'rovni 10 barobar tezlashtirish bo'yicha amaliy qo'llanma va SQL tuz."
  },
  {
    "id": "it_10",
    "category": "it",
    "title": "Murakkab Regular Expression (Regex) Yaratish",
    "tags": [
      "Regex",
      "Validation",
      "Dasturlash"
    ],
    "prompt": "O'zbekiston telefon raqamlari (+998...), pasport seriyalari va murakkab parol talablariga javob beruvchi Regex ifodasini tuz va uning har bir belgisi nima qilishini tushuntirib ber."
  },
  {
    "id": "it_11",
    "category": "it",
    "title": "JWT Token Autentifikatsiyasi va Refresh Token Sxemasi",
    "tags": [
      "JWT",
      "Auth",
      "Security"
    ],
    "prompt": "Web va mobil ilovalar uchun xavfsiz Access Token (15 daqiqa) va Refresh Token (30 kun, HttpOnly cookie) mexanizmining to'liq ishlash arxitekturasi va kod shablonini yoz."
  },
  {
    "id": "it_12",
    "category": "it",
    "title": "Clean Code & SOLID Prinsiplari Bo'yicha Code Review",
    "tags": [
      "CleanCode",
      "SOLID",
      "Review"
    ],
    "prompt": "Ushbu kod parchasi bo'yicha professional Senior dasturchi sifatida Code Review o'tkaz: Kodni o'qilishi, nomlash standartlari, ortiqcha bog'liqliklar va yaxshilash kerak bo'lgan 3 ta asosiy joy."
  },
  {
    "id": "it_13",
    "category": "it",
    "title": "Linux Bash Skripti Bilan Avtomatik DB Backup",
    "tags": [
      "Linux",
      "Bash",
      "Backup"
    ],
    "prompt": "Har kuni tunda PostgreSQL bazasini dump qilib, arxivlab, eski 7 kundan ortiq zaxira nusxalarini avtomatik o'chiruvchi va jarayon natijasini Telegram botga yuboruvchi to'liq Bash skript yoz."
  },
  {
    "id": "it_14",
    "category": "it",
    "title": "Microservices Xabarlar Navbati (RabbitMQ / Kafka)",
    "tags": [
      "Microservices",
      "Kafka",
      "RabbitMQ"
    ],
    "prompt": "Buyurtma berilganda to'lov, ombor va bildirishnoma xizmatlarini uzluksiz bog'lovchi asinxron xabarlar navbati (Event-Driven Architecture) modelini loyihalashtir."
  },
  {
    "id": "it_15",
    "category": "it",
    "title": "Webhook Qabul Qilish va Xavfsiz Qayta Ishlash",
    "tags": [
      "Webhook",
      "Backend",
      "Payment"
    ],
    "prompt": "To'lov tizimidan (masalan: Payme, Click yoki Stripe) keladigan Webhook so'rovini qabul qiluvchi, uning imzosini (Signature) tekshiruvchi va takroriy so'rovlardan (Idempotency) himoyalangan kod yoz."
  },
  {
    "id": "it_16",
    "category": "it",
    "title": "CSS Flexbox & Grid Bilan Moslashuvchan (Responsive) Maket",
    "tags": [
      "CSS",
      "Frontend",
      "Responsive"
    ],
    "prompt": "Mobil telefonlardan tortib keng ekranli monitorlargacha mukammal moslashuvchi (responsive) 3 ustunli Dashboard kartochkalari uchun zamonaviy CSS Grid va Flexbox kodini yoz."
  },
  {
    "id": "it_17",
    "category": "it",
    "title": "Frontend State Management (Zustand / Redux Toolkit)",
    "tags": [
      "Zustand",
      "Redux",
      "Frontend"
    ],
    "prompt": "Foydalanuvchi savatchasi (Cart) ma'lumotlarini saqlovchi, localStorage bilan sinxronlashuvchi va tovar qo'shish/o'chirish/sonini o'zgartirish funksiyalariga ega toza Zustand store kodini yoz."
  },
  {
    "id": "it_18",
    "category": "it",
    "title": "API Rate Limiting va DoS Hujumlaridan Himoya",
    "tags": [
      "Security",
      "DDoS",
      "RateLimit"
    ],
    "prompt": "Serverga daqiqasiga 100 tadan ortiq so'rov yuborgan IP manzillarni vaqtinchalik cheklovchi Redis asosidagi Token Bucket yoki Sliding Window Rate Limiting middleware kodini yoz."
  },
  {
    "id": "it_19",
    "category": "it",
    "title": "Python Pandas Bilan Katta CSV Ma'lumotlarni Tahlil Qilish",
    "tags": [
      "Python",
      "Pandas",
      "Data"
    ],
    "prompt": "100,000 qatorli sotuvlar CSV faylini ochib, bo'sh qiymatlarni tozalovchi, eng ko'p daromad keltirgan top 10 ta mahsulot va oylik dinamikani hisoblovchi Python Pandas skriptini yoz."
  },
  {
    "id": "it_20",
    "category": "it",
    "title": "GitHub Actions Bilan To'liq CI/CD Avtomatlashtirish",
    "tags": [
      "CICD",
      "DevOps",
      "GitHubActions"
    ],
    "prompt": "Har safar 'main' branchga push bo'lganda avtomatik testlarni ishga tushiruvchi, loyihani build qiluvchi va SSH orqali Linux serverga yangi versiyani uzluksiz (Zero-Downtime) yuklovchi .github/workflows YAML faylini yoz."
  },
  {
    "id": "vis_1",
    "category": "visual",
    "title": "Uzum va Instagram Uchun Mahsulot Studiya Fotosessiyasi",
    "tags": [
      "Fotografiya",
      "Mahsulot",
      "Studiya"
    ],
    "prompt": "[MAHSULOT NOMI, masalan: charm sumka yoki asal idishi] uchun professional studiya fotosessiyasi vizual konsepsiyasini tuz: 1) Fon va kompozitsiya (minimalist, neytral ranglar); 2) Yoritish sxemasi (yumshoq diffuziya, mahsulot teksturasini ochib beruvchi yorug'lik); 3) Mahsulot joylashuvi va burchaklari (old, yon, 45 gradus makro); 4) Sotuvni oshiruvchi aksessuarlar va rekvizitlar."
  },
  {
    "id": "vis_2",
    "category": "visual",
    "title": "Instagram Stories Reklama Banneri Dizayn Konsepsiyasi",
    "tags": [
      "Banner",
      "Stories",
      "Dizayn"
    ],
    "prompt": "[MAHSULOT/XIZMAT] sotuvi uchun 9:16 vertikal formatdagi Instagram Stories reklama banneri dizaynini rejalashtir: 1) Yuqori qismdagi ko'zni qamashtiruvchi vizual ilgak (Hero element); 2) Ranglar gammasi (diqqatni tortuvchi kontrast juftlik); 3) Sarlavha va matn iyerarxiyasi (eng ko'pi bilan 3 ta qisqa qator); 4) Pastki qismdagi bosiladigan CTA tugmasining joylashuvi."
  },
  {
    "id": "vis_3",
    "category": "visual",
    "title": "Uzum Market Infografikasi Uchun Slaydlar Vizual Rejasi",
    "tags": [
      "Infografika",
      "Uzum",
      "Marketplace"
    ],
    "prompt": "[MAHSULOT] marketplace kartochkasi uchun 5 ta asosiy infografika slaydining vizual sxemasini tuz: 1-slayd: Bosh rasm (Mahsulot 3D ko'rinishi va 3 ta asosiy yutuq ikonkasi); 2-slayd: Aniq o'lchamlari va materiallar tarkibi; 3-slayd: Ishlatilish jarayoni (Lifestyle kadr); 4-slayd: Nega biz? (Kafolat va qadoq); 5-slayd: Mijozlar oladigan to'liq komplektatsiya."
  },
  {
    "id": "vis_4",
    "category": "visual",
    "title": "Telegram Kanal Posti Uchun Chiroyli Muqova (Cover)",
    "tags": [
      "Telegram",
      "Muqova",
      "Post"
    ],
    "prompt": "Telegram kanaldagi '[POST MAVZUSI]' nomli muhim tahliliy post uchun zamonaviy 16:9 formatdagi muqova (cover) tasviri g'oyasini ber: Fon rangi, markaziy ramziy 3D grafik element, sarlavha shrifti uslubi va GPTify / brend logotipi joylashuvi."
  },
  {
    "id": "vis_5",
    "category": "visual",
    "title": "3D Izometrik Biznes / Ilova Illyustratsiyasi G'oyasi",
    "tags": [
      "3D",
      "Izometriya",
      "Ilyustratsiya"
    ],
    "prompt": "[BIZNES YOKI ILOVA MAVZUSI, masalan: FinTech, yetkazib berish xizmati yoki CRM] mavzusida veb-sayt yoki taqdimot uchun 3D izometrik illyustratsiya kompozitsiyasini loyihalashtir: Fazoda muallaq turgan interaktiv elementlar, neon yashil va ko'k aksentlar, zamonaviy 'glossy' plastik va shisha teksturalar, va dinamik diagrammalar."
  },
  {
    "id": "vis_6",
    "category": "visual",
    "title": "Taqdimot (Pitch Deck) Uchun Professional Slayd Dizayni",
    "tags": [
      "Taqdimot",
      "PitchDeck",
      "Slayd"
    ],
    "prompt": "Investorlar oldida namoyish etiladigan '[LOYIHA MAVZUSI]' taqdimoti uchun zamonaviy korporativ slayd shablonini ishlab chiq: Minimalist to'q ko'k fon, kontrastli oq va zumrad rangli matnlar, asosiy raqamlarni (metrikalarni) katta hajmda ko'rsatish, va matn o'rniga intuitiv infografik bloklar tuzilishi."
  },
  {
    "id": "vis_7",
    "category": "visual",
    "title": "Kafolat, Sertifikat va Ishonch Belgilari (Trust Badges)",
    "tags": [
      "Belgilar",
      "Ishonch",
      "Konversiya"
    ],
    "prompt": "Mahsulot sahifasida va reklama bannerlarida xaridor ishonchini 2 barobarga oshiruvchi 4 ta vizual belgi (Trust Badge) g'oyasi: 1) '100% Asl mahsulot'; 2) 'Tezkor va bepul yetkazish'; 3) '14 kun ichida almashtirish kafolati'; 4) 'Xavfsiz to'lov (Payme/Click)'. Har birining vizual ramzi va ranglari."
  },
  {
    "id": "vis_8",
    "category": "visual",
    "title": "Kompaniya Brend Identikasi va Moodboard Tuzish",
    "tags": [
      "Brending",
      "Moodboard",
      "Ranglar"
    ],
    "prompt": "[SOHA/BIZNES NOMI] brendi uchun vizual uslub (Visual Identity) va Moodboard rejasini tuz: 1) Asosiy brend ranglari (Primary, Secondary, Accent) va ularning psixologik ma'nosi; 2) Tavsiya etiladigan shriftlar (Sarlavhalar va asosiy matn uchun); 3) Fotografiya uslubi (jonli, samimiy yoki korporativ); 4) Brendning grafik shakllari va vizual tili."
  },
  {
    "id": "vis_9",
    "category": "visual",
    "title": "Restoran / Kafe Taomlari Food-Styling Fotosessiyasi",
    "tags": [
      "FoodStyling",
      "Restoran",
      "Taom"
    ],
    "prompt": "[TAOM NOMI, masalan: milliy osh, pitsa yoki maxsus desert] uchun ishtahani ochuvchi professional food-photography ssenariysini yoz: 1) Issiq bug' va yangi uzilgan masalliqlar detali; 2) Fon (rustik yog'och yoki oq marmar); 3) Yoritish (yon tomondan tabiiy quyosh nuri); 4) Kompozitsiya burchagi (45 daraja yoki tepadan Flatlay)."
  },
  {
    "id": "vis_10",
    "category": "visual",
    "title": "LinkedIn / Rezyume Uchun Biznes Portret Kompozitsiyasi",
    "tags": [
      "Portret",
      "Biznes",
      "LinkedIn"
    ],
    "prompt": "Rahbar yoki ekspert uchun ishonchli va do'stona korporativ biznes portret (Headshot) olish bo'yicha fotografga yo'riqnoma: 1) Kiyim-kechak tavsiyasi (quyuq rangli zamonaviy pidjak, minimalizm); 2) Fon (zamonaviy shisha ofis yoki xiralashtirilgan interyer); 3) Nigoh va yuz ifodasi; 4) Rembrant uslubidagi professional studiya yoritgichi."
  },
  {
    "id": "vis_11",
    "category": "visual",
    "title": "DALL-E 3 / AI Bilan Fotorealistik Mahsulot Rasmi Olish",
    "tags": [
      "DALLE3",
      "AI",
      "Tasvir"
    ],
    "prompt": "DALL-E 3 va ChatGPT yordamida eng yuqori sifatli rasm olish uchun o'zbek tilidagi mukammal buyruq shabloni: '[BUYUM/OBYEKT] tasvirlansin. Uslub: Fotorealistik tijorat fotosurati. Fon: [FON TAVSIFI]. Yoritish: Yumshoq studiya yorug'ligi, har bir detal o'tkir va tiniq, hech qanday xira dog'larsiz. Ranglar: Tabiiy, to'yingan va yuqori sifatli.'"
  },
  {
    "id": "vis_12",
    "category": "visual",
    "title": "Kiyim-Kechak Modeli Uchun Lookbook Fotosessiyasi",
    "tags": [
      "Moda",
      "Kiyim",
      "Lookbook"
    ],
    "prompt": "[KIYIM TO'PLAMI, masalan: zamonaviy ayollar kostyumi yoki kundalik streetwear] uchun mavsumiy Lookbook fotosessiyasi vizual rejasini tuz: 1) Model tanlash va qaddi-qomat pozalari; 2) Lokatsiya (zamonaviy shahar arxitekturasi yoki minimalist oq siklorama); 3) Kiyim matosi va choklarini ko'rsatuvchi yaqin kadrlari; 4) Yoritish va rang korreksiyasi."
  },
  {
    "id": "vis_13",
    "category": "visual",
    "title": "Dinamik Sport Mahsuloti Reklama Kadri (Visual Hook)",
    "tags": [
      "Sport",
      "Reklama",
      "Dinamika"
    ],
    "prompt": "[SPORT MAHSULOTI, masalan: krossovka yoki trenajyor] reklamasida harakat va energiyani aks ettiruvchi vizual kadr rejasini tuz: Havoda muallaq turgan holat, sachrayotgan suv tomchilari yoki chang zarralari effekti, kontrastli orqa fon va mahsulot shaklini ajratib ko'rsatuvchi kontur yoritgich (Rim light)."
  },
  {
    "id": "vis_14",
    "category": "visual",
    "title": "Minimalistik Geometrik Logotip Kontseptsiyasi",
    "tags": [
      "Logotip",
      "Minimalizm",
      "Grafika"
    ],
    "prompt": "[KOMPANIYA NOMI VA FAOLIYATI] uchun esda qolarli, zamonaviy va sodda logotip g'oyasini loyihalashtir: 1) Asosiy ramz (kompaniya ma'nosini ochib beruvchi 1-2 ta geometrik shakl); 2) Ranglar juftligi (masalan: chuqur zumrad yashil va oltin sariq); 3) Qora va oq fonda birdek mukammal ko'rinishi; 4) Mobil ilova ikonkasi (favicon) sifatida qulayligi."
  },
  {
    "id": "vis_15",
    "category": "visual",
    "title": "Zamonaviy Milliy Koloritdagi Vizual San'at (Uzbek Modern)",
    "tags": [
      "Milliy",
      "Dizayn",
      "Art"
    ],
    "prompt": "O'zbekistonning boy madaniy merosi (atlas, adras, Samarqand va Buxoro koshin naqshlari) va zamonaviy minimalist dizaynni uyg'unlashtiruvchi vizual kompozitsiya g'oyasi: Zamonaviy geometrik chiziqlar ichiga nozik milliy ornamentlarni singdirish, iliq quyosh nuri va futuristik elementlar uyg'unligi."
  },
  {
    "id": "vis_16",
    "category": "visual",
    "title": "Mahsulotning 360 Darajali Video Ko'rinishi Ssenariysi",
    "tags": [
      "Video",
      "360",
      "Mahsulot"
    ],
    "prompt": "Katalog yoki qisqa video reklama uchun [MAHSULOT NOMI]ni 360 daraja barcha burchaklardan ko'rsatuvchi 15 soniyalik video rolik kadrlari: 1) Mahsulotning sekin aylanuvchi umumiy ko'rinishi; 2) Kamera yaqinlashib eng nozik detal va tugmalarni yirik planda ko'rsatishi; 3) O'lcham va material hissi; 4) Brend logotipida to'xtash."
  },
  {
    "id": "vis_17",
    "category": "visual",
    "title": "Bolalar Mahsulotlari Uchun Qiziqarli 3D Animatsion Uslub",
    "tags": [
      "Bolalar",
      "3D",
      "Animatsiya"
    ],
    "prompt": "[BOLALAR MAHSULOTI YOKI XIZMATI] uchun ota-onalar va bolalar mehrini qozonuvchi 3D animatsion vizual uslub tavsifi: Yumshoq burchaklar, iliq va yorqin pastel ranglar, yoqimli va tabassumli multfilm qahramoni, xavfsiz va shinam atmosfera."
  },
  {
    "id": "vis_18",
    "category": "visual",
    "title": "Veb-Sayt Hero Qismi Uchun Zamonaviy Bosh Rasm (Hero Banner)",
    "tags": [
      "VebSayt",
      "HeroBanner",
      "UI"
    ],
    "prompt": "[BIZNES TURI] veb-saytining birinchi ekrani (Hero Section) uchun yuqori konversiyali grafik rasm kompozitsiyasini ishlab chiq: Chap tomonda matn va CTA tugmasi uchun bo'sh joy (Negative space), o'ng tomonda asosiy mahsulot yoki xizmatning yuqori sifatli 3D/real tasviri, va brend rangidagi nozik fon gradienti."
  },
  {
    "id": "vis_19",
    "category": "visual",
    "title": "IT & Texnologik Startap Uchun Abstrakt Ma'lumotlar Vizuali",
    "tags": [
      "Texnologiya",
      "Startap",
      "Abstrakt"
    ],
    "prompt": "Sun'iy intellekt, katta ma'lumotlar (Big Data) yoki bulutli texnologiyalar mavzusidagi taqdimot va sayt uchun abstrakt vizual tasvir: Qorong'i fonda tarmoq kabi o'zaro bog'langan yorug'lik nuqtalari, shaffof shisha kublar, va kelajak dinamikasini aks ettiruvchi nafis neon to'lqinlar."
  },
  {
    "id": "vis_20",
    "category": "visual",
    "title": "Mijozga Mahsulotni Sovg'adek Taqdim Etuvchi Qadoq Vizuali",
    "tags": [
      "Qadoq",
      "Unboxing",
      "Sovg'a"
    ],
    "prompt": "[MAHSULOT] xaridorga yetib borganda estetik zavq beruvchi qadoq va unboxing fotosurati g'oyasi: Qattiq matli quti, brend logotipi tushirilgan tilla/kumush yozuv, ichidagi nozik ipak qog'oz (tishyu), minnatdorchilik kartochkasi va mahsulotning nafis joylashuvi."
  }
];

let currentLibraryCategory = "all";
let currentLibrarySearch = "";

function filterLibrary(catKey, btnEl) {
  triggerHaptic("light");
  if (btnEl) {
    document.querySelectorAll("#libCategoryChips .cat-filter-btn").forEach(b => b.classList.remove("active"));
    btnEl.classList.add("active");
  }
  currentLibraryCategory = catKey;
  applyLibraryFilters();
}

function handleLibrarySearch(query) {
  currentLibrarySearch = (query || "").trim().toLowerCase();
  applyLibraryFilters();
}

function applyLibraryFilters() {
  const container = document.getElementById("libraryCardsContainer");
  if (!container) return;
  container.innerHTML = "";

  const favs = getFavorites();
  let items = CURATED_LIBRARY_PROMPTS;

  if (currentLibraryCategory === "favorites") {
    items = items.filter(p => favs.includes(p.id));
  } else if (currentLibraryCategory !== "all") {
    items = items.filter(p => p.category === currentLibraryCategory);
  }

  if (currentLibrarySearch) {
    items = items.filter(p =>
      p.title.toLowerCase().includes(currentLibrarySearch) ||
      p.prompt.toLowerCase().includes(currentLibrarySearch) ||
      p.tags.some(t => t.toLowerCase().includes(currentLibrarySearch))
    );
  }

  if (items.length === 0) {
    if (currentLibraryCategory === "favorites") {
      container.innerHTML = `
        <div style="text-align:center; padding:36px 14px; color:#94a3b8;">
          <div style="font-size:36px; margin-bottom:8px;">⭐</div>
          <div style="font-weight:750; color:#fff; font-size:14px;">Hozircha saqlangan promptlar yo'q</div>
          <div style="font-size:12px; margin-top:4px; line-height:1.4;">Kutubxonadagi istalgan prompt yonidagi yulduzcha (⭐) belgisini bosing.</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
          <div style="font-size:32px; margin-bottom:6px;">🔍</div>
          <div style="font-weight:750; color:#fff;">Mos keluvchi prompt topilmadi</div>
          <div style="font-size:12px; margin-top:2px;">Boshqa so'z bilan qidirib ko'ring.</div>
        </div>
      `;
    }
    return;
  }

  items.forEach(p => {
    const card = document.createElement("div");
    card.className = "lib-prompt-card";
    const isFav = favs.includes(p.id);
    const tagSpans = p.tags.map(t => `<span style="font-size:9.5px; background:rgba(255,255,255,0.06); color:#94a3b8; padding:2px 6px; border-radius:4px;">#${t}</span>`).join(" ");

    card.innerHTML = `
      <div class="lib-prompt-header">
        <div>
          <div class="lib-prompt-title">${p.title}</div>
          <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">${tagSpans}</div>
        </div>
        <div class="lib-actions-row">
          <button class="lib-fav-btn ${isFav ? 'active' : ''}" title="Saqlash">
            ${isFav ? '★' : '☆'}
          </button>
          <button class="lib-copy-btn">
            📋 Nusxa
          </button>
        </div>
      </div>
      <div class="lib-prompt-body"></div>
    `;

    const bodyEl = card.querySelector(".lib-prompt-body");
    if (bodyEl) bodyEl.textContent = p.prompt;

    const favBtn = card.querySelector(".lib-fav-btn");
    if (favBtn) {
      favBtn.onclick = () => toggleFavorite(p.id, favBtn);
    }

    const copyBtn = card.querySelector(".lib-copy-btn");
    if (copyBtn) {
      copyBtn.onclick = () => copyLibraryPrompt(copyBtn, p.prompt);
    }

    container.appendChild(card);
  });
}

function copyLibraryPrompt(btn, text) {
  copyText(text, "Prompt nusxalandi! 📋");
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = "✓ Nusxalandi";
    btn.style.background = "#10b981";
    btn.style.color = "#ffffff";
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.background = "";
      btn.style.color = "";
    }, 2000);
  }
}

// =============================================================================
// 6. DOM READY INITIALIZATION
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTelegram();
  initDailyPrompt();
  renderTemplateCards("smm");
  applyLibraryFilters();
});
