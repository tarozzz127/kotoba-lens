import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let pending;
export function loadDetector() {
  if (!pending) {
    pending = (async () => {
      try {
        if (!await tf.setBackend('webgl')) await tf.setBackend('cpu');
      } catch {
        await tf.setBackend('cpu');
      }
      await tf.ready();
      const model = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
        modelUrl: `${import.meta.env.BASE_URL}model/model.json`,
      });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      return {
        async detect(media, maxBoxes, minScore) {
          // fromPixels(HTMLImageElement) uses its layout width/height, not
          // its natural dimensions. Normalize the pixels first so CSS and
          // object-fit never stretch inference or displace its bounding box.
          const width = media.videoWidth || media.naturalWidth || media.width;
          const height = media.videoHeight || media.naturalHeight || media.height;
          const scale = Math.min(1, 960 / Math.max(width, height));
          const sampleWidth = canvas.width = Math.max(1, Math.round(width * scale));
          const sampleHeight = canvas.height = Math.max(1, Math.round(height * scale));
          context.drawImage(media, 0, 0, sampleWidth, sampleHeight);
          const boxes = await model.detect(canvas, maxBoxes, minScore);
          return boxes.map((box) => ({
            ...box,
            bbox: box.bbox.map((value, i) => value * (i % 2 === 0 ? width / sampleWidth : height / sampleHeight)),
          }));
        },
      };
    })().catch((error) => { pending = undefined; throw error; });
  }
  return pending;
}
