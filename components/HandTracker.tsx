
import React, { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { HandData } from '../types';

interface HandTrackerProps {
  active: boolean;
  handDataRef: React.MutableRefObject<HandData>;
  onLoaded: () => void;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ active, handDataRef, onLoaded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  
  // Internal smoothing state to avoid jitter
  const smoothed = useRef({
    distance: 0.1,
    x: 0.5,
    y: 0.5
  });

  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        onLoaded();
      } catch (e) {
        console.error("MediaPipe initialization error:", e);
      }
    };
    initLandmarker();
  }, [onLoaded]);

  useEffect(() => {
    if (active) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 360 }, 
          frameRate: { ideal: 60 } 
        } 
      }).then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }).catch(err => console.error("Camera access error:", err));
    }
    
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [active]);

  const detect = (time: number) => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const canvas = canvasRef.current;
    
    if (active && video && landmarker && canvas && video.readyState >= 2) {
      const results = landmarker.detectForVideo(video, time);
      const ctx = canvas.getContext('2d', { alpha: false });
      
      if (ctx) {
        // Fast draw mirrored webcam
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const drawingUtils = new DrawingUtils(ctx);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Draw tracking lines (mirrored to match preview)
          const mirroredLandmarks = landmarks.map(lm => ({...lm, x: 1 - lm.x}));
          drawingUtils.drawConnectors(mirroredLandmarks, HandLandmarker.HAND_CONNECTIONS, {
            color: "#000000",
            lineWidth: 3
          });
          drawingUtils.drawLandmarks(mirroredLandmarks, { 
            color: "#ffffff", 
            lineWidth: 1.5, 
            radius: 4 
          });

          // Pinch distance for zoom
          const thumb = landmarks[4];
          const index = landmarks[8];
          const rawDist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

          // Hand center for rotation
          const palm = landmarks[0];
          
          // EMA Smoothing for buttery performance
          const alpha = 0.25; 
          smoothed.current.distance += (rawDist - smoothed.current.distance) * alpha;
          smoothed.current.x += (palm.x - smoothed.current.x) * alpha;
          smoothed.current.y += (palm.y - smoothed.current.y) * alpha;

          // Update ref directly - NO REACT RENDER CYCLE
          handDataRef.current = {
            present: true,
            distance: smoothed.current.distance,
            position: { x: 1 - smoothed.current.x, y: smoothed.current.y }
          };
        } else {
          // Graceful fade to idle if hand lost
          smoothed.current.distance += (0.1 - smoothed.current.distance) * 0.1;
          smoothed.current.x += (0.5 - smoothed.current.x) * 0.05;
          smoothed.current.y += (0.5 - smoothed.current.y) * 0.05;
          
          handDataRef.current.present = false;
        }
      }
    }
    requestRef.current = requestAnimationFrame(detect);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(detect);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [active]);

  // Smaller size: 360x202 (matches 16:9)
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[360px] h-[202px] rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border-[8px] border-white bg-white">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} width={360} height={202} className="w-full h-full object-cover" />
      <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-[2rem]" />
    </div>
  );
};
