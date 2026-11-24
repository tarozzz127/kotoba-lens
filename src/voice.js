// Choose an on-device voice for a language. A voice for the exact locale
// (for example zh-CN Mandarin, not zh-HK Cantonese) wins over the rest.
export function pickVoice(voices, language) {
  const base = (lang) => lang.toLowerCase().replace('_', '-').split('-')[0];
  const preferred = [language.voice, ...(language.altVoices || [])].map((l) => l.toLowerCase());
  const rank = (v) => {
    const i = preferred.indexOf(v.lang.toLowerCase().replace('_', '-'));
    return i === -1 ? preferred.length + (v.default ? 0 : 1) : i;
  };
  return voices
    .filter((v) => v.localService && base(v.lang) === language.id)
    .sort((a, b) => rank(a) - rank(b))[0] || null;
}
