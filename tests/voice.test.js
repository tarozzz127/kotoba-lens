import test from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice } from '../src/voice.js';
import { languages } from '../src/words.js';

const voice = (lang, extra = {}) => ({ name: lang, lang, localService: true, default: false, ...extra });
const lang = (id) => languages.find((l) => l.id === id);

test('picks the exact locale voice, so Chinese is Mandarin and not Cantonese', () => {
  const voices = [voice('zh-HK'), voice('zh-TW'), voice('zh-CN'), voice('en-GB'), voice('en_US')];
  assert.equal(pickVoice(voices, lang('zh')).lang, 'zh-CN');
  assert.equal(pickVoice(voices.filter((v) => v.lang !== 'zh-CN'), lang('zh')).lang, 'zh-TW');
  assert.equal(pickVoice(voices, lang('en')).lang, 'en_US');
});

test('only uses on-device voices of the same language', () => {
  assert.equal(pickVoice([voice('ko-KR', { localService: false }), voice('ja-JP')], lang('ko')), null);
  assert.equal(pickVoice([voice('de-AT')], lang('de')).lang, 'de-AT');
  assert.equal(pickVoice([], lang('fr')), null);
});
