export function hasCameraFrame(video) {
  return video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
}

export function playCamera(video, signal, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let playing = false;
    const finish = (error) => {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', checkFrame);
      video.removeEventListener('resize', checkFrame);
      signal.removeEventListener('abort', cancel);
      if (error) reject(error); else resolve();
    };
    const checkFrame = () => { if (playing && hasCameraFrame(video)) finish(); };
    const cancel = () => finish(new DOMException('Camera start canceled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('camera-frame-timeout')), timeoutMs);
    if (signal.aborted) { cancel(); return; }
    video.addEventListener('loadeddata', checkFrame);
    video.addEventListener('resize', checkFrame);
    signal.addEventListener('abort', cancel, { once: true });
    video.play().then(() => { playing = true; checkFrame(); }, finish);
  });
}
