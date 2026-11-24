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
      return cocoSsd.load({
        base: 'lite_mobilenet_v2',
        modelUrl: `${import.meta.env.BASE_URL}model/model.json`,
      });
    })().catch((error) => { pending = undefined; throw error; });
  }
  return pending;
}
