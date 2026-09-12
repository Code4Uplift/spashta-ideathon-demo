const SPASHTA_API_URL = window.SPASHTA_API_URL || 'http://localhost:8000';

const STATIC_TRANSLATIONS = {
  hi: {
    'CREDIT APPROVED': 'ऋण स्वीकृत (Approved)',
    'CREDIT REJECTED': 'ऋण अस्वीकृत (Rejected)',
    'CLAIM APPROVED': 'बीमा दावा स्वीकृत (Approved)',
    'CLAIM REJECTED': 'बीमा दावा अस्वीकृत (Rejected)',
    'SUITABLE': 'निवेश हेतु उपयुक्त (Suitable)',
    'NOT SUITABLE': 'निवेश हेतु अनुपयुक्त (Not Suitable)',
    'PENSION APPROVED': 'पेंशन आवंटन स्वीकृत (Approved)',
    'PENSION REJECTED': 'पेंशन पुनर्मूल्यांकन आवश्यक',
    'RESOLUTION APPROVED': 'समाधान योजना स्वीकृत (Approved)',
    'LIQUIDATION RISK': 'परिसमापन जोखिम चेतावनी (Liquidation Risk)',
    'KCC APPROVED': 'किसान क्रेडिट कार्ड स्वीकृत (Approved)',
    'KCC REJECTED': 'किसान क्रेडिट कार्ड अस्वीकृत (Rejected)',
    'Compute Explanations': 'स्पष्टीकरण निकालें',
    'Generate Audit Certificate': 'ऑडिट प्रमाणपत्र बनाएं',
    'Reset Defaults': 'डिफ़ॉल्ट रीसेट करें',
    'Fetch via Account Aggregator': 'अकाउंट एग्रीगेटर से प्राप्त करें',
    'Voice Command': 'वॉइस कमांड'
  },
  mr: {
    'CREDIT APPROVED': 'कर्ज मंजूर (Approved)',
    'CREDIT REJECTED': 'कर्ज नाकारले (Rejected)',
    'CLAIM APPROVED': 'दावा मंजूर (Approved)',
    'CLAIM REJECTED': 'दावा नाकारला (Rejected)',
    'SUITABLE': 'गुंतवणुकीसाठी योग्य (Suitable)',
    'NOT SUITABLE': 'गुंतवणुकीसाठी अयोग्य (Not Suitable)',
    'PENSION APPROVED': 'पेन्शन वाटप मंजूर (Approved)',
    'PENSION REJECTED': 'पेन्शन पुनर्मूल्यांकन आवश्यक',
    'RESOLUTION APPROVED': 'ठराव योजना मंजूर (Approved)',
    'LIQUIDATION RISK': 'परिसमापन जोखीम (Liquidation Risk)',
    'KCC APPROVED': 'किसान क्रेडिट कार्ड मंजूर (Approved)',
    'KCC REJECTED': 'किसान क्रेडिट कार्ड नाकारले (Rejected)',
    'Compute Explanations': 'स्पष्टीकरणे काढा',
    'Generate Audit Certificate': 'ऑडिट प्रमाणपत्र तयार करा',
    'Reset Defaults': 'डीफॉल्ट रीसेट करा',
    'Fetch via Account Aggregator': 'अकाउंट अ‍ॅग्रीगेटरवरून आणा',
    'Voice Command': 'व्हॉइस कमांड'
  },
  bn: {
    'CREDIT APPROVED': 'ঋণ অনুমোদিত (Approved)',
    'CREDIT REJECTED': 'ঋণ প্রত্যাখ্যাত (Rejected)',
    'CLAIM APPROVED': 'দাবি অনুমোদিত (Approved)',
    'CLAIM REJECTED': 'দাবি প্রত্যাখ্যাত (Rejected)',
    'SUITABLE': 'বিনিয়োগের জন্য উপযুক্ত (Suitable)',
    'NOT SUITABLE': 'অনুপযুক্ত (Not Suitable)',
    'PENSION APPROVED': 'পেনশন অনুমোদিত (Approved)',
    'PENSION REJECTED': 'পেনশন প্রত্যাখ্যান',
    'RESOLUTION APPROVED': 'সমাধান অনুমোদিত (Approved)',
    'LIQUIDATION RISK': 'অবসায়ন ঝুঁকি (Liquidation Risk)',
    'KCC APPROVED': 'কিষাণ ক্রেডিট অনুমোদিত (Approved)',
    'KCC REJECTED': 'কিষাণ ক্রেডিট প্রত্যাখ্যাত (Rejected)',
    'Compute Explanations': 'ব্যাখ্যা গণনা করুন',
    'Generate Audit Certificate': 'অডিট সার্টিফিকেট তৈরি করুন',
    'Reset Defaults': 'রিসেট করুন',
    'Voice Command': 'ভয়েস কমান্ড'
  },
  ta: {
    'CREDIT APPROVED': 'கடன் அங்கீகரிக்கப்பட்டது (Approved)',
    'CREDIT REJECTED': 'கடன் நிராகரிக்கப்பட்டது (Rejected)',
    'CLAIM APPROVED': 'கோரிக்கை ஏற்கப்பட்டது (Approved)',
    'CLAIM REJECTED': 'கோரிக்கை நிராகரிக்கப்பட்டது (Rejected)',
    'SUITABLE': 'முதலீட்டிற்கு பொருத்தமானது (Suitable)',
    'NOT SUITABLE': 'பொருத்தமற்றது (Not Suitable)',
    'PENSION APPROVED': 'ஓய்வூதியம் அங்கீகரிக்கப்பட்டது (Approved)',
    'PENSION REJECTED': 'ஓய்வூதியம் நிராகரிக்கப்பட்டது',
    'RESOLUTION APPROVED': 'தீர்வு அங்கீகரிக்கப்பட்டது (Approved)',
    'LIQUIDATION RISK': 'கலைப்பு ஆபத்து (Liquidation Risk)',
    'KCC APPROVED': 'கிசான் கிரெடிட் அங்கீகரிக்கப்பட்டது (Approved)',
    'KCC REJECTED': 'கிசான் கிரெடிட் நிராகரிக்கப்பட்டது',
    'Compute Explanations': 'விளக்கங்களைக் கணக்கிடு',
    'Generate Audit Certificate': 'தணிக்கை சான்றிதழ் உருவாக்கு',
    'Reset Defaults': 'மீட்டமைக்க',
    'Voice Command': 'குரல் கட்டளை'
  },
  te: {
    'CREDIT APPROVED': 'రుణం ఆమోదించబడింది (Approved)',
    'CREDIT REJECTED': 'రుణం తిరస్కరించబడింది (Rejected)',
    'CLAIM APPROVED': 'క్లెయిమ్ ఆమోదించబడింది (Approved)',
    'CLAIM REJECTED': 'క్లెయిమ్ తిరస్కరించబడింది (Rejected)',
    'SUITABLE': 'పెట్టుబడికి అనుకూలమైనది (Suitable)',
    'NOT SUITABLE': 'అనుకూలం కాదు (Not Suitable)',
    'PENSION APPROVED': 'పెన్షన్ ఆమోదించబడింది (Approved)',
    'PENSION REJECTED': 'పెన్షన్ తిరస్కరించబడింది',
    'RESOLUTION APPROVED': 'పరిష్కారం ఆమోదించబడింది (Approved)',
    'LIQUIDATION RISK': 'లిక్విడేషన్ ప్రమాదం (Liquidation Risk)',
    'KCC APPROVED': 'కిసాన్ క్రెడిట్ ఆమోదించబడింది (Approved)',
    'KCC REJECTED': 'కిసాన్ క్రెడిట్ తిరస్కరించబడింది',
    'Compute Explanations': 'వివరణలను లెక్కించండి',
    'Generate Audit Certificate': 'ఆడిట్ సర్టిఫికెట్ రూపొందించండి',
    'Reset Defaults': 'రీసెట్ చేయండి',
    'Voice Command': 'వాయిస్ కమాండ్'
  },
  gu: {
    'CREDIT APPROVED': 'લોન મંજૂર (Approved)',
    'CREDIT REJECTED': 'લોન અસ્વીકાર (Rejected)',
    'CLAIM APPROVED': 'દાવો મંજૂર (Approved)',
    'CLAIM REJECTED': 'દાવો અસ્વીકાર (Rejected)',
    'SUITABLE': 'યોગ્ય છે (Suitable)',
    'NOT SUITABLE': 'યોગ્ય નથી (Not Suitable)',
    'PENSION APPROVED': 'પેન્શન મંજૂર (Approved)',
    'PENSION REJECTED': 'પેન્શન અસ્વીકાર',
    'RESOLUTION APPROVED': 'ઠરાવ મંજૂર (Approved)',
    'LIQUIDATION RISK': 'લિક્વિડેશન જોખમ (Liquidation Risk)',
    'KCC APPROVED': 'કિસાન ક્રેડિટ મંજૂર (Approved)',
    'KCC REJECTED': 'કિસાન ક્રેડિટ અસ્વીકાર',
    'Compute Explanations': 'સમજૂતી ગણો',
    'Generate Audit Certificate': 'ઓડિટ પ્રમાણપત્ર બનાવો',
    'Reset Defaults': 'રીસેટ કરો',
    'Voice Command': 'વોઇસ કમાન્ડ'
  }
};

class InstantTranslateService {
  constructor() {
    this.cache = new Map();
    this.audioElement = new Audio();
    this.audioElement.setAttribute('referrerpolicy', 'no-referrer');
    this.isPlayingAudio = false;
    this.isPausedAudio = false;
    this.onAudioStateChange = null;
    this.currentAudioChunks = [];
    this.currentChunkIndex = 0;
    this.currentTextToSpeak = '';
    this.currentAudioLang = 'en';

    this.audioElement.onended = () => {
      this.playNextChunk();
    };

    this.audioElement.onerror = (e) => {
      console.warn('Audio stream playback error, trying Web Speech fallback:', e);
      this.fallbackWebSpeech(this.currentTextToSpeak, this.currentAudioLang);
    };
  }

  async translateText(text, sourceLang = 'en', targetLang = 'hi') {
    if (!text || sourceLang === targetLang) return text;

    const cacheKey = `${sourceLang}_${targetLang}_${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
    if (!cleanText) return text;

    // Check pre-compiled instant dictionary first (0ms latency)
    if (STATIC_TRANSLATIONS && STATIC_TRANSLATIONS[targetLang] && STATIC_TRANSLATIONS[targetLang][cleanText]) {
      const instantMatch = STATIC_TRANSLATIONS[targetLang][cleanText];
      this.cache.set(cacheKey, instantMatch);
      return instantMatch;
    }

    if (cleanText.length > 250) {
      const paragraphs = cleanText.split(/\n\n+/);
      const translatedParagraphs = [];

      for (const p of paragraphs) {
        if (!p.trim()) continue;
        const sentences = p.split(/(?<=[.!?।])\s+/).filter(s => s.trim());
        // Execute all sentence translations in parallel for maximum speed
        const transArr = await Promise.all(
          sentences.map(s => this.fetchSingleTranslation(s, sourceLang, targetLang))
        );
        translatedParagraphs.push(transArr.join(' '));
      }

      const result = translatedParagraphs.join('\n\n');
      this.cache.set(cacheKey, result);
      return result;
    }

    const result = await this.fetchSingleTranslation(cleanText, sourceLang, targetLang);
    this.cache.set(cacheKey, result);
    return result;
  }

  async fetchSingleTranslation(textChunk, sourceLang, targetLang) {
    const clean = textChunk.trim();
    if (!clean) return textChunk;

    // 1. Primary: Server-side FastAPI Translation Proxy
    try {
      const resp = await fetch(`${SPASHTA_API_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          source_lang: sourceLang,
          target_lang: targetLang
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.translated_text) {
          return data.translated_text;
        }
      }
    } catch (apiErr) {
      console.warn('FastAPI translate proxy unreachable, falling back to direct browser translation:', apiErr);
    }

    // 2. Client-side Fallback: Google GTX Single API
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(clean)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) {
          const translated = data[0].map(item => item[0]).filter(Boolean).join('');
          if (translated) {
            return translated;
          }
        }
      }
    } catch (e) {
      console.warn('Google Translate Single API error, trying MyMemory fallback:', e);
    }

    // 3. Fallback: MyMemory API
    try {
      const url2 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${sourceLang}|${targetLang}`;
      const response2 = await fetch(url2);
      if (response2.ok) {
        const data2 = await response2.json();
        const translated2 = data2?.responseData?.translatedText;
        if (translated2 && translated2 !== clean) {
          return translated2;
        }
      }
    } catch (e2) {
      console.warn('MyMemory API error:', e2);
    }

    return textChunk;
  }

  speakText(text, lang = 'en') {
    this.stopAudio();
    if (!text) return;

    this.currentTextToSpeak = text;
    this.currentAudioLang = lang || 'en';

    const cleanText = text
      .replace(/<[^>]*>?/gm, '')
      .replace(/[•\t\r]/g, '')
      .replace(/\n+/g, '. ');

    const rawSentences = cleanText.split(/(?<=[.!?।])\s+/);
    this.currentAudioChunks = [];

    rawSentences.forEach(s => {
      let str = s.trim();
      while (str.length > 140) {
        let cut = str.lastIndexOf(' ', 140);
        if (cut === -1) cut = 140;
        this.currentAudioChunks.push(str.slice(0, cut));
        str = str.slice(cut).trim();
      }
      if (str.length > 0) {
        this.currentAudioChunks.push(str);
      }
    });

    if (this.currentAudioChunks.length === 0) return;

    this.currentChunkIndex = 0;
    this.isPlayingAudio = true;
    this.isPausedAudio = false;

    if (this.onAudioStateChange) this.onAudioStateChange({ state: 'playing' });

    this.playChunk(this.currentChunkIndex);
  }

  playChunk(index) {
    if (index >= this.currentAudioChunks.length) {
      this.isPlayingAudio = false;
      this.isPausedAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
      return;
    }

    const chunk = this.currentAudioChunks[index];
    const tlParam = this.currentAudioLang || 'en';
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${tlParam}&client=gtx`;

    this.audioElement.src = audioUrl;
    this.audioElement.play().catch(err => {
      console.warn('Audio stream play blocked or failed, trying Web Speech fallback:', err);
      this.fallbackWebSpeech(this.currentTextToSpeak, this.currentAudioLang);
    });
  }

  playNextChunk() {
    if (!this.isPlayingAudio) return;
    this.currentChunkIndex++;
    this.playChunk(this.currentChunkIndex);
  }

  pauseAudio() {
    if (this.audioElement && this.isPlayingAudio) {
      this.audioElement.pause();
      this.isPausedAudio = true;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'paused' });
    } else if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.isPausedAudio = true;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'paused' });
    }
  }

  resumeAudio() {
    if (this.audioElement && this.isPausedAudio) {
      this.audioElement.play();
      this.isPausedAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'playing' });
    } else if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.isPausedAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'playing' });
    }
  }

  stopAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentAudioChunks = [];
    this.currentChunkIndex = 0;
    this.isPlayingAudio = false;
    this.isPausedAudio = false;
    if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
  }

  fallbackWebSpeech(cleanText, targetLang = 'en') {
    if (!('speechSynthesis' in window)) {
      this.isPlayingAudio = false;
      this.isPausedAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
      return;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Map language code to standard locale
    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      bn: 'bn-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      pa: 'pa-IN',
      ur: 'ur-IN'
    };
    utterance.lang = langMap[targetLang] || `${targetLang}-IN`;
    utterance.rate = 0.95;

    // Pick matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(targetLang) || v.lang.includes(targetLang));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      this.isPlayingAudio = false;
      this.isPausedAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
    };

    utterance.onerror = () => {
      this.isPlayingAudio = false;
      this.isPausedAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
    };

    this.isPlayingAudio = true;
    this.isPausedAudio = false;
    if (this.onAudioStateChange) this.onAudioStateChange({ state: 'playing' });
    window.speechSynthesis.speak(utterance);
  }
}

const translateService = new InstantTranslateService();
