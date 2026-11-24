import test from 'node:test';
import assert from 'node:assert/strict';
import { playCamera } from '../src/camera.js';

function cameraVideo(play = () => Promise.resolve()) {
  return Object.assign(new EventTarget(), {
    play, HAVE_CURRENT_DATA: 2, readyState: 0, videoWidth: 0, videoHeight: 0,
  });
}

test('camera startup waits for a usable frame after playback starts', async () => {
  const video = cameraVideo();
  const signal = new AbortController().signal;
  let started = false;
  const startup = playCamera(video, signal).then(() => { started = true; });
  await Promise.resolve();
  assert.equal(started, false);
  Object.assign(video, { readyState: 2, videoWidth: 640, videoHeight: 480 });
  video.dispatchEvent(new Event('loadeddata'));
  await startup;
  assert.equal(started, true);
});

test('camera startup accepts a frame that is already available', async () => {
  const video = cameraVideo();
  Object.assign(video, { readyState: 2, videoWidth: 640, videoHeight: 480 });
  await playCamera(video, new AbortController().signal);
});

test('camera startup times out with no frame even if playback has not resolved', async () => {
  const video = cameraVideo(() => new Promise(() => {}));
  await assert.rejects(playCamera(video, new AbortController().signal, 5), /camera-frame-timeout/);
});

test('camera startup can be canceled while waiting and preserves playback errors', async () => {
  const controller = new AbortController();
  const startup = playCamera(cameraVideo(), controller.signal);
  controller.abort();
  await assert.rejects(startup, { name: 'AbortError' });

  const error = new DOMException('Cannot read camera', 'NotReadableError');
  const video = cameraVideo(() => Promise.reject(error));
  await assert.rejects(playCamera(video, new AbortController().signal), error);
});
