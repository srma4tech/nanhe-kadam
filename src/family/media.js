import { get, list, put, del } from '../core/storage.js';

export function selectRecordingMime(Recorder = globalThis.MediaRecorder) {
  if (!Recorder?.isTypeSupported) return '';
  for (const mime of ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (Recorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export async function beginFamilyRecording({ mediaDevices = globalThis.navigator?.mediaDevices, Recorder = globalThis.MediaRecorder, speaker = 'Family member', saveClip = (clip) => put('recordings', clip.id, clip) } = {}) {
  if (!mediaDevices?.getUserMedia || !Recorder) throw new Error('Recording is unavailable on this device.');
  const stream = await mediaDevices.getUserMedia({ audio: true });
  let recorder;
  try {
    const mimeType = selectRecordingMime(Recorder);
    recorder = mimeType ? new Recorder(stream, { mimeType }) : new Recorder(stream);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
  const chunks = [];
  recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
  try { recorder.start(); }
  catch (error) { stream.getTracks().forEach((track) => track.stop()); throw error; }
  let stopped = false;
  return {
    mimeType: recorder.mimeType || recorder.options?.mimeType || '',
    async stop() {
      if (stopped) return null;
      stopped = true;
      try {
        const blob = await new Promise((resolve, reject) => {
          recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })), { once: true });
          recorder.addEventListener('error', () => reject(new Error('Recording could not be saved.')), { once: true });
          recorder.stop();
        });
        if (!blob.size) return null;
        const clip = { id: globalThis.crypto?.randomUUID?.() || 'clip-' + Date.now() + '-' + Math.random().toString(36).slice(2), type: 'audio', speaker, createdAt: Date.now(), mimeType: blob.type, blob };
        await saveClip(clip);
        return clip;
      } finally {
        stream.getTracks().forEach((track) => track.stop());
      }
    },
    cancel() {
      if (stopped) return;
      stopped = true;
      try { recorder.stop(); } catch { /* A stopped recorder needs no additional action. */ }
      stream.getTracks().forEach((track) => track.stop());
    }
  };
}

export async function downscalePhoto(file, { bitmapFactory = globalThis.createImageBitmap, canvasFactory = (width, height) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas; }, maxEdge = 1280, quality = 0.72 } = {}) {
  if (!file?.type?.startsWith('image/') || !bitmapFactory) throw new Error('Choose an image file from this device.');
  const image = await bitmapFactory(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale)); const height = Math.max(1, Math.round(image.height * scale));
    const canvas = canvasFactory(width, height); const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo resize is unavailable.');
    context.drawImage(image, 0, 0, width, height);
    return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Photo could not be resized.')), 'image/jpeg', quality));
  } finally { image.close?.(); }
}

export async function saveMissionPhoto(file, label = 'Mission moment') {
  const blob = await downscalePhoto(file);
  const id = globalThis.crypto?.randomUUID?.() || 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const entry = { id, label, type: 'photo', createdAt: Date.now(), mimeType: blob.type, blob };
  await put('journal', id, entry);
  return entry;
}

export async function listFamilyMedia() {
  const [recordings, journal] = await Promise.all([list('recordings'), list('journal')]);
  return [...(recordings || []), ...(journal || [])].filter((item) => item?.blob);
}

export async function deleteFamilyMedia(item) {
  const store = item.type === 'audio' ? 'recordings' : 'journal';
  await del(store, item.id);
  return item.id;
}

export async function getFamilyMedia(id, type) {
  return get(type === 'audio' ? 'recordings' : 'journal', id);
}
