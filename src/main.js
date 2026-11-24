import './style.css';
import { languages, words, chooseObjects } from './words.js';
import { pickVoice } from './voice.js';
import { hasCameraFrame, playCamera } from './camera.js';

const icons = {
  camera: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  sound: '<path d="m11 4-5 4H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
function readStored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
let language = languages.find((l) => l.id === readStored('kotoba-language', 'en')) || languages[0];
let saved = readStored('kotoba-words', []);
saved = Array.isArray(saved) ? saved.filter((s) => s && words[s.word] && languages.some((l) => l.id === s.lang)).slice(0, 200) : [];
let selected = null;
let predictions = [];
let stream = null;
let cameraOpening = null;
let timer = null;
let session = 0;
let mode = 'idle';
let imageUrl = null;
let detectorPromise;
const emptyMessages = {
  idle: ['どんなことばに<br>出会えるかな。', 'カメラや写真で調べると、<br>ここに名前が出ます。'],
  loading: ['名前を探しています', '少しお待ちください。'],
  live: ['まだ名前が見つかりません', 'カメラの向きや距離を変えてみてね。'],
  photo: ['名前が見つかりませんでした', '「写真をえらぶ」から、別の写真で試してみてね。'],
  frozen: ['まだ名前が見つかりません', '「もう一度写す」から、向きや距離を変えてみてね。'],
};

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="./" aria-label="ことばレンズ ホーム"><img src="${import.meta.env.BASE_URL}icon.svg" alt="" width="42" height="42"><span>ことばレンズ<small>見つける。聞く。おぼえる。</small></span></a>
    <button id="open-notebook" class="button notebook-button">${icon('book')}<span>ことば帳</span><span id="saved-count" class="count">0</span></button>
  </header>
  <main>
    <section class="intro" aria-labelledby="page-title">
      <div><p class="eyebrow">いつもの景色が、学びに変わる</p><h1 id="page-title">目の前の「これ」、<br class="portrait-break">なんて言う？</h1><p class="intro-copy">カメラや写真で、身近なものの名前を調べよう。</p></div>
      <label class="language-picker" for="language"><span>学ぶことば</span><select id="language">${languages.map((l) => `<option value="${l.id}" ${l.id === language.id ? 'selected' : ''}>${l.label} / ${l.native}</option>`).join('')}</select></label>
    </section>
    <div class="workspace">
      <section class="camera-section" aria-label="カメラと写真">
        <div id="stage" class="stage">
          <video id="video" autoplay muted playsinline hidden></video>
          <img id="photo" alt="名前を調べる写真" hidden>
          <canvas id="frozen" hidden></canvas>
          <svg id="boxes" class="boxes" aria-hidden="true"></svg>
          <div class="stage-top"><span id="stage-label" class="stage-label"><span class="dot"></span>ことばを探す準備</span><button id="stop" class="stage-stop" hidden>やめる ${icon('close')}</button></div>
          <div id="welcome" class="welcome">
            <svg class="still-life" viewBox="0 0 400 265" fill="none" aria-hidden="true">
              <ellipse cx="201" cy="234" rx="145" ry="13" fill="#d9dfd1"/>
              <path d="M60 63V43h22m236 0h22v20M60 201v20h22m236 0h22v-20" stroke="#80967d" stroke-width="3" stroke-linecap="round"/>
              <rect x="76" y="183" width="120" height="26" rx="5" fill="#d1a96b" transform="rotate(-9 76 183)"/><path d="m92 187 89-14" stroke="#fff6dd" stroke-width="4"/>
              <rect x="84" y="204" width="122" height="24" rx="4" fill="#75886e"/><path d="M95 214h98" stroke="#f8f0dc" stroke-width="4"/>
              <path d="M169 139h88v55c0 25-17 37-44 37s-44-12-44-37v-55Z" fill="#f3e9d3"/><path d="M257 151h10c28 0 28 43 0 43h-10" stroke="#d1b98d" stroke-width="11"/><ellipse cx="213" cy="139" rx="44" ry="10" fill="#d4bc98"/><ellipse cx="213" cy="139" rx="33" ry="6" fill="#7d624b"/>
              <path d="M204 115c-13-15 13-20 0-35m23 35c-13-15 13-20 0-35" stroke="#b8c1ac" stroke-width="3" stroke-linecap="round"/>
              <path d="M290 155c-1-38 3-70 18-99" stroke="#698369" stroke-width="4"/>
              <path d="M299 94c-25 2-35-12-32-32 20-1 33 12 32 32Zm1-2c-2-25 11-40 31-38 1 20-9 36-31 38Zm-7 38c-26-1-34-16-29-35 22 1 32 17 29 35Zm3-10c2-25 16-37 35-31-2 20-15 33-35 31Z" fill="#819878"/>
              <path d="M268 156h50l-7 66h-36l-7-66Z" fill="#c6d1b9"/><path d="M264 155h58v10h-58z" fill="#aebf9f"/>
              <path d="m118 94 4-12 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="#d6b05f"/>
            </svg>
            <p>身近なものが、<br><strong>今日のことばに。</strong></p><span>カップ、本、くだものなどを写してみよう</span>
          </div>
          <div id="loading" class="loading" role="status" hidden><span class="spinner"></span><strong id="loading-title">ことばを探す準備をしています</strong><span id="loading-copy">はじめだけ少し時間がかかります</span></div>
          <p id="stage-hint" class="stage-hint" hidden></p>
        </div>
        <p id="notice" class="notice" role="status" hidden></p>
        <div class="camera-actions"><button id="start-camera" class="button primary">${icon('camera')}<span>カメラをはじめる</span></button><button id="choose-photo" class="button secondary">${icon('photo')}<span>写真をえらぶ</span></button></div>
        <input id="photo-input" type="file" accept="image/*" hidden>
        <div class="camera-caption"><span>${icon('shield')}写真は外に送りません</span><button id="try-demo" class="button demo-button">ねこの写真で試す ${icon('arrow')}</button></div>
      </section>
      <aside class="word-panel" aria-label="見つけたことば">
        <div class="panel-heading"><span class="mini-mark"></span><h2>見つけたことば</h2><span id="result-badge" class="result-badge" hidden>見つけた！</span></div>
        <div id="empty-result" class="empty-result" data-state="idle"><span class="empty-orbit" aria-hidden="true">Aa<span>あ</span></span><div role="status"><h3 id="empty-title">${emptyMessages.idle[0]}</h3><p id="empty-copy">${emptyMessages.idle[1]}</p></div><div class="small-rule"></div><p class="tip-label">見つけるコツ</p><p>明るいところで、ものを1つ<br>大きく写してみてね。</p></div>
        <div id="word-result" class="word-result" hidden><p id="result-language" class="eyebrow"></p><h3 id="translated-word" dir="auto"></h3><p id="japanese-word" class="japanese-word"></p><button id="speak" class="button listen">${icon('sound')}発音を聞く</button><button id="save" class="button save">${icon('plus')}ことば帳に入れる</button><div id="other-objects" class="other-objects" hidden><p>ほかに見つけたもの</p><div id="object-choices"></div></div><p id="recognition-note" class="recognition-note">名前がちがうときは、向きや距離を<br>変えてもう一度写してみてね。</p></div>
        <div class="panel-bottom">小さな発見を、ひとつずつ。</div>
      </aside>
    </div>
    <section class="how-it-works" aria-label="使い方"><div><span>01</span><p>ものを写す<small>身近なものを、大きく</small></p></div><div><span>02</span><p>ことばを聞く<small>音でも、おぼえよう</small></p></div><div><span>03</span><p>ことば帳に残す<small>あとから、もう一度</small></p></div></section>
    <footer><span>ことばレンズ</span><button id="open-help" class="text-button">使い方と、見つけられるもの</button></footer>
  </main>
  <dialog id="notebook-dialog" aria-labelledby="notebook-title"><div class="dialog-header"><div><p class="eyebrow">あなただけの小さな辞書</p><h2 id="notebook-title">ことば帳</h2></div><button class="icon-button close-dialog" aria-label="ことば帳を閉じる">${icon('close')}</button></div><p class="dialog-intro">このiPadに、ことばだけを残します。写真は残りません。</p><div id="notebook-list"></div><p class="dialog-footnote">同じブラウザで開くと、また見られます。<br>Safariの履歴やWebサイトのデータを消すと、ことば帳も消えます。</p></dialog>
  <dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-header"><h2 id="help-title">ことばを見つけよう</h2><button class="icon-button close-dialog" aria-label="使い方を閉じる">${icon('close')}</button></div><div class="help-content"><h3>はじめかた</h3><p>学ぶことばをえらんで「カメラをはじめる」を押します。カメラの使用を聞かれたら「許可」を押してください。身近なものを大きく写すと、名前が出てきます。</p><p>「写真をえらぶ」から、iPadにある写真でも調べられます。「ねこの写真で試す」なら、カメラも自分の写真もいりません。</p><h3>カメラを許可しなかったとき</h3><p>Safariのアドレス欄の横のメニューから「ウェブサイトの設定」を開き、「カメラ」を「許可」にします。そのあと「カメラをはじめる」を押してください。</p><h3>写真は、iPadの中だけで調べます</h3><p>写真やカメラの映像を外に送ったり、残したりしません。はじめの準備には通信が必要です（約20MB）。</p><h3>いつも正しいとは限りません</h3><p>明るいところで、ものを1つ大きく写してみてください。種類が似ているものや小さなものは、まちがえたり、見つからなかったりします。文章や文字の翻訳はできません。</p><h3>発音について</h3><p>iPadに入っている音声で読みます。聞こえないときは音量を上げてください。その言語の音声がないときは、iPadの「設定」で読み上げる音声を追加すると使えます。</p><h3>見つけられる80種類</h3><p class="supported-objects">${Object.values(words).map((w) => w.ja).join('・')}</p><p class="photo-credit">おためしの写真：<a href="https://unsplash.com/photos/2F3HEGx5fC0" target="_blank" rel="noopener noreferrer">Mikhail Vasilyev / Unsplash</a></p></div></dialog>
  <div id="toast" class="toast" role="status" hidden></div>
`;

const $ = (id) => document.getElementById(id);
function notice(message = '', suggestPhoto = false) {
  $('notice').textContent = message;
  $('notice').hidden = !message;
  $('start-camera').classList.toggle('primary', !suggestPhoto);
  $('start-camera').classList.toggle('secondary', suggestPhoto);
  $('choose-photo').classList.toggle('primary', suggestPhoto);
  $('choose-photo').classList.toggle('secondary', !suggestPhoto);
}
let toastTimer;
function toast(message) {
  // An open dialog sits in the top layer, so show the message inside it.
  (document.querySelector('dialog[open]') || document.body).append($('toast'));
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000);
}
function stopTracks() {
  cameraOpening?.abort();
  cameraOpening = null;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  $('video').srcObject = null;
}
function cleanup() {
  session++; clearTimeout(timer); stopTracks();
  if (imageUrl) { URL.revokeObjectURL(imageUrl); imageUrl = null; }
}
function resetResult(state = 'idle') {
  selected = null; predictions = [];
  $('empty-result').hidden = false; $('word-result').hidden = true; $('result-badge').hidden = true;
  $('boxes').replaceChildren();
  if ($('empty-result').dataset.state !== state) {
    const [title, copy] = emptyMessages[state];
    $('empty-title').innerHTML = title; $('empty-copy').innerHTML = copy;
    $('empty-result').dataset.state = state;
  }
}
function setBusy(busy) {
  $('loading').hidden = !busy;
  $('start-camera').disabled = busy;
  $('choose-photo').disabled = busy;
  $('try-demo').disabled = busy;
  $('stop').hidden = !busy && mode !== 'live';
}
function prepare(nextMode) {
  cleanup(); mode = nextMode; resetResult('loading'); notice();
  $('welcome').hidden = true; $('video').hidden = true; $('photo').hidden = true; $('frozen').hidden = true;
  $('stage-hint').hidden = true;
  $('stage').classList.remove('has-media');
  $('stage-label').innerHTML = '<span class="dot"></span>準備しています';
  $('loading-title').textContent = 'ことばを探す準備をしています';
  $('loading-copy').textContent = 'はじめだけ少し時間がかかります（約20MB）';
  setBusy(true);
  return session;
}
function showIdle() {
  cleanup(); mode = 'idle'; setBusy(false); resetResult();
  $('welcome').hidden = false; $('video').hidden = true; $('photo').hidden = true; $('frozen').hidden = true;
  $('stage-hint').hidden = true; $('stage').classList.remove('has-media');
  $('stage-label').innerHTML = '<span class="dot"></span>ことばを探す準備';
  $('start-camera').innerHTML = `${icon('camera')}<span>カメラをはじめる</span>`;
}
async function detector() {
  if (!detectorPromise) {
    detectorPromise = import('./detector.js').then((m) => m.loadDetector()).catch((e) => { detectorPromise = null; throw e; });
  }
  let timeout;
  try {
    return await Promise.race([detectorPromise, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('model-timeout')), 90000); })]);
  } finally { clearTimeout(timeout); }
}
function saveButton() {
  const exists = saved.some((s) => s.word === selected && s.lang === language.id);
  $('save').innerHTML = exists ? `${icon('check')}ことば帳に入りました` : `${icon('plus')}ことば帳に入れる`;
  $('save').disabled = exists;
}
function renderWord() {
  if (!selected) return;
  $('empty-result').hidden = true; $('word-result').hidden = false; $('result-badge').hidden = false;
  $('result-language').textContent = `${language.label} / ${language.native}`;
  $('translated-word').textContent = words[selected][language.id];
  $('translated-word').lang = language.id;
  $('japanese-word').textContent = words[selected].ja;
  saveButton();
  const others = predictions.filter((p) => p.class !== selected);
  $('other-objects').hidden = !others.length;
  $('object-choices').replaceChildren(...others.map((p) => {
    const button = document.createElement('button'); button.className = 'object-choice';
    button.textContent = words[p.class].ja;
    button.onclick = () => { selected = p.class; renderWord(); drawBoxes(); };
    return button;
  }));
}
function drawBoxes() {
  const media = mode === 'live' ? $('video') : mode === 'frozen' ? $('frozen') : $('photo');
  const width = media.videoWidth || media.naturalWidth || media.width;
  const height = media.videoHeight || media.naturalHeight || media.height;
  if (!width || !height) return;
  $('boxes').setAttribute('viewBox', `0 0 ${width} ${height}`);
  $('boxes').replaceChildren(...predictions.filter((p) => p.class === selected).map((p) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ['x', 'y', 'width', 'height'].forEach((attr, i) => rect.setAttribute(attr, p.bbox[i]));
    rect.setAttribute('rx', '12'); rect.setAttribute('vector-effect', 'non-scaling-stroke'); return rect;
  }));
}
function showStageHint(message) {
  $('stage-hint').textContent = message;
  $('stage-hint').hidden = false;
}
function showPredictions(items, preferred = selected) {
  predictions = chooseObjects(items);
  selected = predictions.some((p) => p.class === preferred) ? preferred : predictions[0]?.class || null;
  if (selected) {
    renderWord(); drawBoxes();
    showStageHint('見つけたものの名前を見てみよう');
  } else {
    resetResult(mode);
    showStageHint(mode === 'live' ? 'まだ名前が見つかりません' : '名前が見つかりませんでした');
  }
}
function showFailure(error, camera = false) {
  showIdle();
  if (camera && ['NotAllowedError', 'PermissionDeniedError'].includes(error?.name)) {
    notice('カメラの使用が許可されていません。写真からでも調べられます。', true);
  } else if (error?.message === 'camera-frame-timeout') {
    notice('カメラの映像が届きませんでした。もう一度はじめるか、写真から調べてください。', true);
  } else if (camera && ['NotFoundError', 'NotReadableError', 'OverconstrainedError'].includes(error?.name)) {
    notice('カメラを開けませんでした。写真からでも調べられます。', true);
  } else if (error?.message === 'invalid-photo') {
    notice('この写真は開けませんでした。別の写真をえらんでください。');
  } else {
    notice('準備ができませんでした。通信を確かめて、もう一度おためしください。');
  }
}
async function startCamera() {
  const token = prepare('camera-loading');
  if (!navigator.mediaDevices?.getUserMedia) {
    showIdle(); notice('このブラウザではカメラを使えません。写真からでも調べられます。', true); return;
  }
  const video = $('video');
  $('loading-title').textContent = 'カメラの使用を「許可」してください';
  $('loading-copy').textContent = '使わないときは「やめる」を押してください';
  try {
    // Request permission within the tap, before awaiting the model import.
    const cameraPromise = navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } } }).then(async (value) => {
      if (token !== session) { value.getTracks().forEach((t) => t.stop()); return null; }
      stream = value;
      for (const track of value.getVideoTracks()) {
        track.addEventListener('ended', () => {
          if (token === session) {
            showIdle(); notice('カメラが止まりました。「カメラをはじめる」をもう一度押してください。');
          }
        }, { once: true });
      }
      $('loading-title').textContent = 'カメラの映像を待っています';
      const opening = new AbortController();
      cameraOpening = opening;
      video.hidden = false;
      video.srcObject = value;
      try {
        await playCamera(video, opening.signal);
      } finally {
        if (cameraOpening === opening) cameraOpening = null;
      }
      if (token === session) {
        $('loading-title').textContent = 'ことばを探す準備をしています';
        $('loading-copy').textContent = 'はじめだけ少し時間がかかります（約20MB）';
      }
      return value;
    });
    const [camera, model] = await Promise.all([cameraPromise, detector()]);
    if (token !== session || !camera) return;
    mode = 'live'; $('stage').classList.add('has-media'); setBusy(false);
    $('stage-label').innerHTML = '<span class="dot live-dot"></span>カメラで探しています';
    $('start-camera').innerHTML = `${icon('check')}<span>とめて見る</span>`;
    let misses = 0;
    const scan = async () => {
      if (session !== token || mode !== 'live') return;
      try {
        if (!hasCameraFrame(video)) {
          resetResult('loading'); showStageHint('カメラの映像を待っています');
          timer = setTimeout(scan, 1000);
          return;
        }
        const width = video.videoWidth; const height = video.videoHeight;
        const results = await model.detect(video, 10, 0.55);
        if (session !== token || mode !== 'live') return;
        if (width === video.videoWidth && height === video.videoHeight) {
          const found = chooseObjects(results).length;
          if (found || ++misses >= 3 || !selected) showPredictions(results);
          if (found) misses = 0;
        } else {
          resetResult('loading'); showStageHint('ことばを探しています');
        }
        timer = setTimeout(scan, 1000);
      } catch (error) { if (session === token) showFailure(error); }
    };
    scan();
  } catch (error) { if (token === session) showFailure(error, true); }
}
async function freezeCamera() {
  const video = $('video'); const canvas = $('frozen');
  if (!hasCameraFrame(video)) {
    showStageHint('カメラの映像を待っています');
    return;
  }
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  cleanup(); mode = 'frozen';
  const token = session;
  const preferred = selected;
  resetResult('loading');
  showStageHint('写したものの名前を探しています');
  canvas.hidden = false; video.hidden = true; $('stop').hidden = true;
  $('stage-label').innerHTML = '<span class="dot"></span>とめて見ています';
  $('start-camera').innerHTML = `${icon('camera')}<span>もう一度写す</span>`;
  try {
    const model = await detector();
    if (token !== session) return;
    const results = await model.detect(canvas, 10, 0.55);
    if (token === session) showPredictions(results, preferred);
  } catch {
    if (token === session) {
      resetResult('frozen');
      showStageHint('名前を調べられませんでした。「もう一度写す」を押してください');
    }
  }
}
async function inspectPhoto(url, demo = false) {
  const token = prepare('photo-loading');
  if (url.startsWith('blob:')) imageUrl = url;
  const photo = $('photo');
  try {
    const imageReady = new Promise((resolve, reject) => {
      photo.onload = resolve; photo.onerror = () => reject(new Error('invalid-photo')); photo.src = url;
    });
    const [model] = await Promise.all([detector(), imageReady]);
    if (token !== session) return;
    mode = 'photo'; photo.hidden = false; $('stage').classList.add('has-media');
    $('loading-title').textContent = '写真の中のことばを探しています';
    const results = await model.detect(photo, 10, 0.55);
    if (token !== session) return;
    setBusy(false); showPredictions(results);
    $('stage-label').innerHTML = `<span class="dot"></span>${demo ? 'おためしの写真' : '写真から見つける'}`;
    $('start-camera').innerHTML = `${icon('camera')}<span>カメラで写す</span>`;
  } catch (error) { if (token === session) showFailure(error); }
}
let utterance = null;
function speak(word, langId) {
  const lang = languages.find((l) => l.id === langId);
  if (!('speechSynthesis' in window)) { toast('このブラウザでは音声を使えません。'); return; }
  const voices = speechSynthesis.getVoices();
  if (!voices.length) { toast('音声の準備をしています。少し待って、もう一度押してください。'); return; }
  // Only use a local voice. Never send the learned word to a remote voice service.
  const voice = pickVoice(voices, lang);
  if (!voice) { toast(`${lang.label}の音声がありません。iPadの設定で読み上げる音声を追加してください。`); return; }
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  // Keep a reference so Safari does not drop the utterance before it ends.
  utterance = new SpeechSynthesisUtterance(words[word][langId]);
  utterance.lang = voice.lang; utterance.voice = voice; utterance.rate = 0.8;
  utterance.onerror = (event) => { if (!['interrupted', 'canceled'].includes(event.error)) toast('音声を再生できませんでした。もう一度おためしください。'); };
  speechSynthesis.speak(utterance);
}
function renderNotebook() {
  $('saved-count').textContent = saved.length;
  const list = $('notebook-list'); list.replaceChildren();
  if (!saved.length) {
    list.innerHTML = `<div class="notebook-empty">${icon('book')}<h3>最初のことばを見つけよう</h3><p>気になったことばの<br>「ことば帳に入れる」を押してね。</p></div>`; return;
  }
  for (const entry of saved) {
    const row = document.createElement('div'); row.className = 'saved-row';
    const lang = languages.find((l) => l.id === entry.lang);
    const text = document.createElement('div');
    const name = document.createElement('strong'); name.lang = entry.lang; name.textContent = words[entry.word][entry.lang];
    const detail = document.createElement('small'); detail.textContent = `${words[entry.word].ja} / ${lang.label}`;
    text.append(name, detail);
    const play = document.createElement('button'); play.className = 'icon-button'; play.innerHTML = icon('sound'); play.ariaLabel = `${name.textContent}の発音を聞く`; play.onclick = () => speak(entry.word, entry.lang);
    const remove = document.createElement('button'); remove.className = 'icon-button remove-word'; remove.innerHTML = icon('close'); remove.ariaLabel = `${name.textContent}をことば帳から消す`;
    remove.onclick = () => {
      const next = saved.filter((s) => s !== entry);
      if (!writeStored('kotoba-words', next)) { toast('ことば帳を変更できませんでした。'); return; }
      saved = next; renderNotebook(); if (selected) saveButton(); toast('ことば帳から消しました');
    };
    row.append(text, play, remove); list.append(row);
  }
}
$('language').onchange = (event) => {
  language = languages.find((l) => l.id === event.target.value);
  writeStored('kotoba-language', language.id);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  renderWord();
};
$('start-camera').onclick = () => mode === 'live' ? freezeCamera() : startCamera();
$('stop').onclick = () => { showIdle(); notice(); };
$('choose-photo').onclick = () => $('photo-input').click();
$('photo-input').onchange = (event) => {
  const file = event.target.files[0];
  if (file) inspectPhoto(URL.createObjectURL(file));
  event.target.value = '';
};
$('try-demo').onclick = () => inspectPhoto(`${import.meta.env.BASE_URL}images/cat.jpg`, true);
$('speak').onclick = () => { if (selected) speak(selected, language.id); };
$('save').onclick = () => {
  if (!selected || saved.some((s) => s.word === selected && s.lang === language.id)) return;
  if (saved.length >= 200) { toast('ことば帳がいっぱいです。いらないことばを消すと、また入れられます。'); return; }
  const next = [{ word: selected, lang: language.id }, ...saved];
  if (!writeStored('kotoba-words', next)) { toast('ことばを残せませんでした。Safariの保存の設定を確かめてください。'); return; }
  saved = next; saveButton(); renderNotebook(); toast('ことば帳に入りました');
};
$('open-notebook').onclick = () => { renderNotebook(); $('notebook-dialog').showModal(); };
$('open-help').onclick = () => $('help-dialog').showModal();
document.querySelectorAll('.close-dialog').forEach((button) => { button.onclick = () => button.closest('dialog').close(); });
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('close', () => { if ($('toast').parentElement === dialog) { $('toast').hidden = true; document.body.append($('toast')); } });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
});
function stopCameraOnLeave() {
  if (mode === 'live' || mode === 'camera-loading') {
    showIdle(); notice('カメラを止めました。もう一度使うときは「カメラをはじめる」を押してください。');
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCameraOnLeave();
});
window.addEventListener('pagehide', (event) => {
  stopCameraOnLeave();
  if (!event.persisted) cleanup();
});
renderNotebook();
