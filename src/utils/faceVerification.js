import * as faceapi from 'face-api.js';

// Use more reliable CDN for face-api.js models
const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';


let modelsLoaded = false;

export async function loadFaceModels() {
  if (modelsLoaded) return true;
  try {
    console.log('Loading Face API models from CDN...');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),   // faster + more tolerant than ssdMobilenetv1
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face API models loaded.');
    return true;
  } catch (error) {
    console.error('Error loading Face API models:', error);
    throw new Error('Failed to load facial recognition models. Check internet connection.');
  }
}

/**
 * Waits until the video element is actually playing and has frames.
 */
function waitForVideoReady(videoElement, maxMs = 5000) {
  return new Promise((resolve, reject) => {
    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => reject(new Error('Video stream not ready')), maxMs);
    const onReady = () => {
      clearTimeout(timeout);
      resolve();
    };
    videoElement.addEventListener('canplay', onReady, { once: true });
    videoElement.addEventListener('playing', onReady, { once: true });
  });
}

export async function verifyFace(videoElement) {
  if (!videoElement) {
    return { success: false, error: 'No video feed found.' };
  }

  try {
    // Wait for the video to have an actual live frame
    await waitForVideoReady(videoElement);

    console.log('Detecting face with TinyFaceDetector...');

    // TinyFaceDetector is faster and works better in varied lighting
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,       // 160 | 224 | 320 | 416 | 512 | 608
      scoreThreshold: 0.3,  // lowered from 0.5 — handles dark skin, poor lighting, angles
    });

    const detections = await faceapi
      .detectAllFaces(videoElement, options)
      .withFaceLandmarks(true); // true = use tiny landmark model

    if (detections.length === 0) {
      return {
        success: false,
        error: 'No face detected. Move closer, improve lighting, or remove obstructions.',
      };
    }

    if (detections.length > 1) {
      return {
        success: false,
        error: 'Multiple faces detected. Ensure only you are in the frame.',
      };
    }

    const confidence = detections[0].detection.score;
    console.log('Face detected, confidence:', confidence);

    // Accept anything above 0.3 — sufficient for liveness proof demo
    return { success: true, confidence };

  } catch (error) {
    console.error('Error during face verification:', error);
    return { success: false, error: 'Facial analysis failed. Please try again.' };
  }
}
