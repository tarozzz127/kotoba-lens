import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { words, languages, chooseObjects } from '../src/words.js';

const require = createRequire(import.meta.url);
const { CLASSES } = require('@tensorflow-models/coco-ssd/dist/classes.js');

test('all detector classes have Japanese and seven complete learning languages', () => {
  const names = Object.values(CLASSES).map((c) => c.displayName);
  assert.equal(names.length, 80);
  assert.deepEqual(Object.keys(words).sort(), names.sort());
  assert.equal(languages.length, 7);
  for (const word of Object.values(words)) {
    for (const id of ['ja', ...languages.map((l) => l.id)]) {
      assert.equal(typeof word[id], 'string');
      assert.ok(word[id].trim().length > 0);
    }
  }
});

test('recognition rejects low confidence and unknown labels, deduplicates and ranks objects', () => {
  const results = chooseObjects([
    { class: 'cat', score: .99 }, { class: 'cat', score: .8 },
    { class: 'cup', score: .7 }, { class: 'untranslated', score: 1 },
    { class: 'book', score: .5 }, { class: 'dog', score: .9 },
  ]);
  assert.deepEqual(results.map((r) => r.class), ['cat', 'dog', 'cup']);
  assert.deepEqual(chooseObjects([]), []);
});

test('self-hosted model has all weight bytes (no third-party model request needed)', () => {
  const model = JSON.parse(readFileSync(new URL('../public/model/model.json', import.meta.url)));
  const sizes = { float32: 4, int32: 4, bool: 1, complex64: 8, float16: 2, uint8: 1, uint16: 2 };
  for (const group of model.weightsManifest) {
    const expected = group.weights.reduce((sum, w) => sum + w.shape.reduce((a, b) => a * b, 1) * sizes[w.quantization?.dtype || w.dtype], 0);
    const actual = group.paths.reduce((sum, path) => sum + statSync(new URL(`../public/model/${path}`, import.meta.url)).size, 0);
    assert.equal(actual, expected);
  }
});
