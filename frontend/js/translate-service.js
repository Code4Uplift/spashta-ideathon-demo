const SPASHTA_API_URL = window.SPASHTA_API_URL || 'http://localhost:8000';

class InstantTranslateService {
  constructor() {
    this.cache = new Map();
    this.audioElement = new Audio();
    this.audioElement.setAttribute('referrerpolicy', 'no-referrer');
    this.isPlayingAudio = false;
    this.onAudioStateChange = null;
    this.currentAudioChunks = [];
    this.currentChunkIndex = 0;

    this.audioElement.onended = () => {
      this.playNextChunk();
    };

    this.audioElement.onerror = (e) => {
      console.warn('Audio stream playback error, trying Web Speech fallback:', e);
      this.fallbackWebSpeech(this.currentTextToSpeak);
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

    if (cleanText.length > 250) {
      const paragraphs = cleanText.split(/\n\n+/);
      const translatedParagraphs = [];

      for (const p of paragraphs) {
        if (!p.trim()) continue;
        const sentences = p.split(/(?<=[.!?।])\s+/);
        const translatedSentences = [];
        for (const s of sentences) {
          if (!s.trim()) continue;
          const transS = await this.fetchSingleTranslation(s.trim(), sourceLang, targetLang);
          translatedSentences.push(transS);
        }
        translatedParagraphs.push(translatedSentences.join(' '));
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

  speakText(text) {
    this.stopAudio();
    if (!text) return;

    this.currentTextToSpeak = text;

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

    if (this.onAudioStateChange) this.onAudioStateChange({ state: 'playing' });

    this.playChunk(this.currentChunkIndex);
  }

  playChunk(index) {
    if (index >= this.currentAudioChunks.length) {
      this.isPlayingAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
      return;
    }

    const chunk = this.currentAudioChunks[index];
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=gtx`;

    this.audioElement.src = audioUrl;
    this.audioElement.play().catch(err => {
      console.warn('Audio stream play blocked or failed, trying Web Speech fallback:', err);
      this.fallbackWebSpeech(this.currentTextToSpeak);
    });
  }

  playNextChunk() {
    if (!this.isPlayingAudio) return;
    this.currentChunkIndex++;
    this.playChunk(this.currentChunkIndex);
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
    if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
  }

  fallbackWebSpeech(cleanText) {
    if (!('speechSynthesis' in window)) {
      this.isPlayingAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
      return;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-IN';
    utterance.rate = 0.95;

    utterance.onend = () => {
      this.isPlayingAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
    };

    utterance.onerror = () => {
      this.isPlayingAudio = false;
      if (this.onAudioStateChange) this.onAudioStateChange({ state: 'stopped' });
    };

    this.isPlayingAudio = true;
    if (this.onAudioStateChange) this.onAudioStateChange({ state: 'playing' });
    window.speechSynthesis.speak(utterance);
  }
}

const translateService = new InstantTranslateService();
