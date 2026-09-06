/**
 * GPTify Uzbekistan — Standalone Prompt Ustaxonasi Telegram Mini App
 * Complete generator formulas, categorized business templates & variables builder
 */

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
    } catch (e) {
      console.warn("TG initialization note:", e);
    }
  }
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

  const viewGen = document.getElementById("generatorView");
  const viewTpl = document.getElementById("templatesView");
  const viewLib = document.getElementById("libraryView");

  if (btnGen) btnGen.classList.toggle("active", navKey === "generator");
  if (btnTpl) btnTpl.classList.toggle("active", navKey === "templates");
  if (btnLib) btnLib.classList.toggle("active", navKey === "library");

  if (viewGen) viewGen.style.display = (navKey === "generator" ? "flex" : "none");
  if (viewTpl) viewTpl.style.display = (navKey === "templates" ? "flex" : "none");
  if (viewLib) viewLib.style.display = (navKey === "library" ? "flex" : "none");

  if (navKey === "templates") {
    renderTemplateCards(currentCategory);
  } else if (navKey === "library") {
    applyLibraryFilters();
  }
}

// =============================================================================
// 3. AI PROMPT GENERATOR (MULTI-MODEL PLAYGROUND)
// =============================================================================
let currentModel = "chatgpt";
let currentGeneratedPrompt = "";

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

function generatePrompt() {
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

  if (currentModel === "chatgpt") {
    promptResult = "SEN: 12+ yillik tajribaga ega yetakchi AI va biznes maslahatchisisan.\n\n" +
      "VAZIFA: " + input + "\n\n" +
      "QAT’IY TALABLAR:\n" +
      "1. Natijani aniq, lo‘nda va amaliy tuzilma asosida taqdim et.\n" +
      "2. Auditoriya e’tiborini birinchi 3 soniyada tortadigan kuchli sarlavhalar va hook'lar qo‘sh.\n" +
      "3. Amaliy misollar va to‘g‘ridan-to‘g‘ri ishlatish mumkin bo‘lgan tayyor bloklar shaklida tuz.\n" +
      "4. Ohang (Tone): Professional, ishonchli, amaliy va samimiy.\n\n" +
      "Javobni darhol tayyor formatda taqdim et.";
  } else if (currentModel === "midjourney") {
    promptResult = "/imagine prompt: " + input + ", ultra-realistic photography, shot on 85mm lens, f/1.8, soft cinematic studio lighting, highly detailed textures, vibrant color grading, Unreal Engine 5 render style, 8k resolution, photorealistic, cinematic atmosphere --ar 16:9 --v 6.0 --style raw";
  } else if (currentModel === "kling") {
    promptResult = "Cinematic video generation prompt:\n\n" +
      "Scene Description: " + input + "\n" +
      "Camera Movement: Smooth dynamic drone orbit, seamless dolly forward.\n" +
      "Lighting & Mood: Golden hour cinematic backlight, ultra-sharp focus, 4k 60fps photorealistic motion blur, high dynamic range.";
  } else if (currentModel === "elevenlabs") {
    promptResult = "[Voice Style: Professional, warm, authoritative and engaging male/female voice with natural breathing pauses]\n\n" +
      "Voiceover Script: \"" + input + "\"";
  }

  currentGeneratedPrompt = promptResult;

  if (outputText && outputCard) {
    outputText.textContent = promptResult;
    outputCard.style.display = "block";

    if (modelBadge) {
      const badgeMap = { chatgpt: "ChatGPT & Claude", midjourney: "Midjourney", kling: "Kling Video", elevenlabs: "ElevenLabs" };
      modelBadge.textContent = badgeMap[currentModel] || "AI Prompt";
    }

    outputCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  showToast("✨ Professional prompt tayyor!");
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
    <div class="vb-head">
      <div>
        <div class="vb-title">
          <span>⚙️</span> <span>${tpl.title}</span>
        </div>
        <div class="vb-subtitle">${tpl.desc}</div>
      </div>
      <button class="vb-autofill-btn" onclick="fillTemplateSample()">
        💡 Namunani to'ldirish
      </button>
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

    <div class="output-actions-grid">
      <button class="action-btn copy" id="vbCopyBtn" onclick="copyTemplatePrompt(this)">
        <span>📋</span> <span>Nusxalash</span>
      </button>
      <button class="action-btn chatgpt" onclick="openTemplateInChatGPT()">
        <span>🤖</span> <span>ChatGPT'da ochish</span>
      </button>
      <button class="action-btn gemini" onclick="openTemplateInGemini()">
        <span>✨</span> <span>Gemini'da ochish</span>
      </button>
      <button class="action-btn tg" onclick="shareTemplateToTelegram()">
        <span>✈️</span> <span>Ulashish</span>
      </button>
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
    id: "lib_1",
    category: "biznes",
    title: "B2B Mijozga Tijorat Taklifi (KP)",
    tags: ["B2B", "Savdo", "KP"],
    prompt: "Sen O'zbekistondagi eng tajribali B2B savdo maslahatchisisan. Yangi korporativ mijoz uchun rad etib bo'lmas individual tijorat taklifi (KP) ssenariysini tuz. Unda: 1) Mijoz kompaniyasining bugungi muammolarini hal qilish; 2) Xarajat emas, 3 oy ichida o'zini oqlovchi investitsiya ekanligini raqamlar bilan asoslash; 3) Keyingi qadam (uchrashuv yoki demo) bo'yicha aniq harakatga chaqiruv bo'lsin."
  },
  {
    id: "lib_2",
    category: "smm",
    title: "AIDA/PAS Reklama Kopiraytingi",
    tags: ["SMM", "Marketing", "AIDA"],
    prompt: "Instagram va Telegram reklama kampaniyasi uchun yuqori konversiyali AIDA matnini yoz. Birinchi qatorda to'xtatuvchi kuchli sarlavha, o'rtada og'riqli nuqtalar va mahsulot afzalliklari, oxirida esa zudlik bilan harakat qilishga undovchi chaqiriq (CTA) bo'lsin."
  },
  {
    id: "lib_3",
    category: "visual",
    title: "Mahsulot Uchun Studiya Fotosessiyasi",
    tags: ["Midjourney", "Tasvir", "Dizayn"],
    prompt: "/imagine prompt: Commercial studio product photography of a modern minimalist product, clean neutral background, soft diffused natural studio lighting, shot on 85mm lens, f/2.8, highly detailed textures, vibrant color grading, Unreal Engine 5 render style, 8k resolution, photorealistic, cinematic atmosphere --ar 16:9 --v 6.0 --style raw"
  },
  {
    id: "lib_4",
    category: "visual",
    title: "30 Sekundlik Reels/Shorts Rolik Ssenariysi",
    tags: ["Kling", "Video", "Reels"],
    prompt: "30 soniyalik dinamik Reels reklama videosi ssenariysi: 0-3 soniyadagi e'tibor tortuvchi vizual ilgak (Hook), kadrma-kadr kamera harakatlari tavsifi, audio matn va ekrandagi subtitrlar matnini to'liq jadval shaklida tuzib ber."
  },
  {
    id: "lib_5",
    category: "biznes",
    title: "Murakkab Excel / Google Sheets Formulalari",
    tags: ["Excel", "Ofis", "Moliya"],
    prompt: "Excelda ikkita alohida jadvaldan ma'lumotlarni qidirib, mos keluvchi qiymatlarni solishtiruvchi va farqlarni aniqlovchi murakkab XLOOKUP va INDEX/MATCH formulasini tuzib ber hamda har bir qismini o'zbek tilida tushuntir."
  },
  {
    id: "lib_6",
    category: "visual",
    title: "Professional Diktor Ovozlashtirishi",
    tags: ["ElevenLabs", "Ovoz", "Audio"],
    prompt: "[Voice Style: Professional, warm, authoritative and engaging male/female voice with natural breathing pauses]\n\nVoiceover Script: \"Korporativ taqdimot videosi uchun ishonchli, samimiy va energiyaga to'la diktor ovozi prompti va audio ssenariysi.\""
  },
  {
    id: "lib_7",
    category: "ecom",
    title: "Uzum Market: 'Qimmat' E'tirozini Yopish",
    tags: ["Uzum", "Savdo", "E'tiroz"],
    prompt: "Uzum Market chatida mijoz 'Boshqa do'konlarda bu mahsulot arzonroq ekan, sizlarda nega qimmat?' deb so'radi. Mahsulotimizning haqiqiy original ekanligi, rasmiy kafolat, xavfsiz qadoq va tezkor bepul yetkazib berish afzalliklarini ko'rsatib, mijozni xaridga undovchi 2 ta xushmuomala javob varianti yoz."
  },
  {
    id: "lib_8",
    category: "it",
    title: "Python / JavaScript Kod Tahlili & Xavfsizlik",
    tags: ["IT", "Dasturlash", "Security"],
    prompt: "Ushbu kod parchasi xavfsizlik va samaradorlik talablariga qay darajada javob berishini tahlil qil. Xususan SQL Injection, XSS, xotira sarfi va asinxron funksiyalardagi potensial xatoliklarni aniqlab, tuzatilgan to'liq kodni yoz."
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

  let items = CURATED_LIBRARY_PROMPTS;
  if (currentLibraryCategory !== "all") {
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
    container.innerHTML = `
      <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
        <div style="font-size:32px; margin-bottom:6px;">🔍</div>
        <div style="font-weight:750; color:#fff;">Mos keluvchi prompt topilmadi</div>
        <div style="font-size:12px; margin-top:2px;">Boshqa so'z bilan qidirib ko'ring.</div>
      </div>
    `;
    return;
  }

  items.forEach(p => {
    const card = document.createElement("div");
    card.className = "lib-prompt-card";
    const tagSpans = p.tags.map(t => `<span style="font-size:9.5px; background:rgba(255,255,255,0.06); color:#94a3b8; padding:2px 6px; border-radius:4px;">#${t}</span>`).join(" ");

    card.innerHTML = `
      <div class="lib-prompt-header">
        <div>
          <div class="lib-prompt-title">${p.title}</div>
          <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">${tagSpans}</div>
        </div>
        <button class="lib-copy-btn" onclick="copyLibraryPrompt(this, '${p.prompt.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')">
          📋 Nusxa
        </button>
      </div>
      <div class="lib-prompt-body">${p.prompt}</div>
    `;
    container.appendChild(card);
  });
}

function copyLibraryPrompt(btn, text) {
  copyText(text);
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
  renderTemplateCards("smm");
  applyLibraryFilters();
});
