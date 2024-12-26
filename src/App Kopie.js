import React, { useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';
import * as tf from '@tensorflow/tfjs';

// TensorFlow-Debugging aktivieren
console.log('TensorFlow.js version:', tf.version.tfjs);

function App() {
  // Funktion, um alle Modelle zu laden
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
        // Modelle laden
        await loadModels(modelPath);

        // Kamera starten
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          video.srcObject = stream;
          console.log('Camera initialized successfully');

          video.addEventListener('play', () => {
            console.log('Video is playing...');

            // Dimensionen für Canvas und Video anpassen
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            canvas.width = displaySize.width;
            canvas.height = displaySize.height;

            faceapi.matchDimensions(canvas, displaySize);

            let lastDetections = [];

            setInterval(async () => {
              try {
                // Gesichtserkennung durchführen
                const detections = await faceapi
                  .detectAllFaces(video)
                  .withFaceLandmarks()
                  .withFaceExpressions();

                // Ergebnisse filtern
                if (!detections || detections.length === 0) {
                  console.log('No faces detected.');
                  return;
                }

                // Glättung der Detektionsboxen
                const smoothedDetections = detections.map((detection, index) => {
                  const lastDetection = lastDetections[index] || detection;
                  return {
                    ...detection,
                    box: {
                      x: (detection.box.x + lastDetection.box.x) / 2,
                      y: (detection.box.y + lastDetection.box.y) / 2,
                      width: (detection.box.width + lastDetection.box.width) / 2,
                      height: (detection.box.height + lastDetection.box.height) / 2,
                    },
                  };
                });

                lastDetections = smoothedDetections;

                // Ergebnisse skalieren und zeichnen
                const resizedDetections = faceapi.resizeResults(smoothedDetections, displaySize);
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