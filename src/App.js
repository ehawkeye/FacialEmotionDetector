import React, { useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';
import * as tf from '@tensorflow/tfjs';

// TensorFlow-Debugging aktivieren
console.log('TensorFlow.js version:', tf.version.tfjs);

function App() {
  const loadModels = async (modelPath) => {
    console.log('Model path:', modelPath);
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
      console.log('ssd_mobilenetv1 model loaded successfully');
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
      console.log('faceLandmark68Net model loaded successfully');
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
      console.log('faceRecognitionNet model loaded successfully');
      await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
      console.log('faceExpressionNet model loaded successfully');
    } catch (error) {
      console.error('Error loading models:', error.message);
      throw new Error('Failed to load models');
    }
  };

  useEffect(() => {
    const loadModelsAndStartVideo = async () => {
      const modelPath = process.env.PUBLIC_URL + '/models';
      try {
        await loadModels(modelPath);

        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          video.srcObject = stream;
          console.log('Camera initialized successfully');

          video.addEventListener('play', () => {
            console.log('Video is playing...');
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            canvas.width = displaySize.width;
            canvas.height = displaySize.height;

            faceapi.matchDimensions(canvas, displaySize);

            let lastDetections = [];

            setInterval(async () => {
              try {
                const detections = await faceapi
                  .detectAllFaces(video)
                  .withFaceLandmarks()
                  .withFaceExpressions();

                // Überprüfen, ob gültige Detection-Objekte existieren
                if (!detections || detections.length === 0) {
                  console.log('No faces detected.');
                  return;
                }

                // Optional: Nur das größte Gesicht verarbeiten
                const primaryDetection = detections.reduce((largest, detection) => {
                  if (!detection || !detection.box) {
                    console.warn('Invalid detection skipped.');
                    return largest;
                  }
                  return detection.box.width * detection.box.height >
                    (largest?.box?.width || 0) * (largest?.box?.height || 0)
                    ? detection
                    : largest;
                }, null);

                // Überprüfen, ob primaryDetection gültig ist
                if (!primaryDetection || !primaryDetection.box) {
                  console.warn('No valid primary detection found.');
                  return;
                }

                // Glättung der Detektionsbox
                const smoothedDetection = {
                  ...primaryDetection,
                  box: {
                    x:
                      (primaryDetection.box.x +
                        (lastDetections[0]?.box?.x || primaryDetection.box.x)) /
                      2,
                    y:
                      (primaryDetection.box.y +
                        (lastDetections[0]?.box?.y || primaryDetection.box.y)) /
                      2,
                    width:
                      (primaryDetection.box.width +
                        (lastDetections[0]?.box?.width || primaryDetection.box.width)) /
                      2,
                    height:
                      (primaryDetection.box.height +
                        (lastDetections[0]?.box?.height || primaryDetection.box.height)) /
                      2,
                  },
                };

                lastDetections = [smoothedDetection];

                const resizedDetections = faceapi.resizeResults(
                  lastDetections,
                  displaySize
                );

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
              } catch (detectionError) {
                console.error('Error during detection:', detectionError.message);
              }
            }, 100);
          });
        } catch (cameraError) {
          console.error('Error accessing the camera:', cameraError.message);
          alert('Unable to access the camera. Please check your permissions.');
        }
      } catch (error) {
        console.error('Error initializing the application:', error.message);
      }
    };

    loadModelsAndStartVideo();
  }, []);

  return (
    <>
      <div id="app" className="app">
        <div className="overlay"></div>
        <div className="text">
          <span aria-label="emoji" role="img" id="emoji">
            😐
          </span>
          You look <span id="textStatus">...</span>!
        </div>
        <div className="mockup">
          <div id="browser" className="browser">
            <div className="browserChrome">
              <div className="browserActions"></div>
            </div>
            <canvas id="canvas"></canvas>
            <video id="video" width="540" height="405" muted autoPlay></video>
          </div>
        </div>
        <p className="note">You are not being recorded, it all happens in your own browser!</p>
      </div>
    </>
  );
}

export default App;