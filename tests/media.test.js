import test from 'node:test';
import assert from 'node:assert/strict';
import { beginFamilyRecording, downscalePhoto, selectRecordingMime } from '../src/family/media.js';

test('prefers Opus and falls back to supported native recording format', () => {
  class Recorder { static isTypeSupported(type) { return type === 'audio/mp4'; } }
  assert.equal(selectRecordingMime(Recorder), 'audio/mp4');
  assert.equal(selectRecordingMime(class {}), '');
});

test('recording stores a speaker-tagged blob and always stops the microphone track', async () => {
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  const saved = [];
  class Recorder {
    static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
    constructor(stream, options) { this.stream = stream; this.mimeType = options.mimeType; this.listeners = {}; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    start() { this.listeners.dataavailable({ data: new Blob(['hello'], { type: this.mimeType }) }); }
    stop() { this.listeners.stop(); }
  }
  const session = await beginFamilyRecording({ mediaDevices: { async getUserMedia() { return { getTracks: () => tracks }; } }, Recorder, speaker: 'Adult', saveClip: async (clip) => saved.push(clip) });
  const clip = await session.stop();
  assert.equal(clip.speaker, 'Adult'); assert.equal(clip.blob.size, 5);
  assert.equal(saved.length, 1); assert.equal(tracks[0].stopped, true);
});

test('photo resize keeps aspect ratio and enforces maximum edge', async () => {
  let size;
  const image = { width: 4000, height: 2000, close() {} };
  const result = await downscalePhoto({ type: 'image/png' }, {
    bitmapFactory: async () => image,
    canvasFactory: (width, height) => {
      size = [width, height];
      return { getContext: () => ({ drawImage() {} }), toBlob: (callback, type) => callback(new Blob(['photo'], { type })) };
    }
  });
  assert.deepEqual(size, [1280, 640]); assert.equal(result.type, 'image/jpeg');
});

test('unavailable microphone access returns a typed friendly failure', async () => {
  await assert.rejects(beginFamilyRecording({ mediaDevices: {}, Recorder: class {} }), /Recording is unavailable/);
});
