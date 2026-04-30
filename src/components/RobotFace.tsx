import { motion, AnimatePresence } from 'motion/react';
import { Emotion } from '../services/geminiService';
import { useEffect, useState, useMemo } from 'react';

interface RobotFaceProps {
  emotion: Emotion;
  isListening?: boolean;
  isTalking?: boolean;
}

export const RobotFace = ({ emotion, isListening, isTalking }: RobotFaceProps) => {
  const [blink, setBlink] = useState(false);
  const [wink, setWink] = useState<null | 'left' | 'right'>(null);
  const [talkPulse, setTalkPulse] = useState(0);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [lastDirection, setLastDirection] = useState<'left' | 'right'>('right');
  const [autonomousEmotion, setAutonomousEmotion] = useState<Emotion | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Connection check
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Autonomous state management for idle behavior
  useEffect(() => {
    if (isTalking || isListening || emotion !== 'idle' || !isOnline) {
      setAutonomousEmotion(null);
      return;
    }

    const triggerAutonomousEmotion = () => {
      const emotions: Emotion[] = ['happy', 'thinking', 'love', 'sad', 'confident', 'calm'];
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      setAutonomousEmotion(randomEmotion);

      // Reset to neutral after a few seconds
      setTimeout(() => {
        setAutonomousEmotion(null);
      }, 3000 + Math.random() * 3000);

      // Schedule next trigger
      setTimeout(triggerAutonomousEmotion, 8000 + Math.random() * 10000);
    };

    const timer = setTimeout(triggerAutonomousEmotion, 2000); // Resume faster after interaction
    return () => clearTimeout(timer);
  }, [isTalking, isListening, emotion]);

  const activeEmotion = !isOnline ? 'error' : (autonomousEmotion || emotion);

  // Blinking Logic: Natural frequency, disabled when talking
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const triggerBlink = () => {
      if (isTalking) {
        timer = setTimeout(triggerBlink, 1000);
        return;
      }
      setBlink(true);
      setTimeout(() => setBlink(false), 150); // Faster blink duration
      timer = setTimeout(triggerBlink, 3000 + Math.random() * 4000);
    };
    timer = setTimeout(triggerBlink, 4000);
    return () => clearTimeout(timer);
  }, [isTalking]);

  // Autonomous Gaze Logic: Snappier, darting movements (Locked during interaction)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const moveGaze = () => {
      // Lock gaze to center when talking, listening, or following a non-idle emotion from AI
      if (isTalking || isListening || emotion !== 'idle') {
        setGaze({ x: 0, y: 0 });
        return;
      }

      const isThinking = activeEmotion === 'thinking';
      const isConfused = activeEmotion === 'confused';
      
      // Darting logic: Alternating or snapping to corners
      const dart = Math.random() > 0.3;
      let newX = 0;
      let newY = (Math.random() - 0.5) * 30;

      if (dart || isThinking || isConfused) {
        // Oscillation logic: If last was right, go left, and vice versa
        const direction = lastDirection === 'right' ? 'left' : 'right';
        setLastDirection(direction);
        
        newX = (direction === 'right' ? 1 : -1) * (isThinking || isConfused ? 130 : 90);
        newY = - (Math.random() * 40 + 20); // Looking up
        
        // Occasional wink or squint during snap, higher chance when thinking/confused
        if (Math.random() > (isThinking || isConfused ? 0.4 : 0.8)) {
          const side = Math.random() > 0.5 ? 'left' : 'right';
          setWink(side);
          setTimeout(() => setWink(null), 800 + Math.random() * 600);
        }
      }
      
      setGaze({ x: newX, y: newY });
      
      const nextMove = (isThinking || isConfused) ? 600 + Math.random() * 600 : 2000 + Math.random() * 4000;
      timer = setTimeout(moveGaze, nextMove);
    };

    if (isTalking || isListening || emotion !== 'idle') {
      setGaze({ x: 0, y: 0 });
    } else {
      timer = setTimeout(moveGaze, 1500);
    }

    return () => clearTimeout(timer);
  }, [activeEmotion, isTalking, isListening, emotion, lastDirection]);

  // fluid Talk Animation
  useEffect(() => {
    if (!isTalking) {
      setTalkPulse(0);
      return;
    }
    let frame: number;
    const update = () => {
      const time = Date.now() / 150;
      // Combine multiple frequencies for organic speech-like movement
      const pulse = (Math.sin(time) * 0.5 + 0.5) * 0.6 + (Math.sin(time * 2.3) * 0.2);
      setTalkPulse(Math.max(0, pulse));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [isTalking]);

  // Eye Expression Paths - Rounded, organic shapes (Wider)
  const getEyeExpression = (side: 'left' | 'right', state: Emotion) => {
    if (blink) return "M 5,35 Q 50,15 95,35 L 95,38 Q 50,18 5,38 Z"; 
    if (wink === side) return "M 15,22 H 85 Q 90,22 90,25 Q 90,28 85,28 H 15 Q 10,28 10,25 Q 10,22 15,22 Z";

    // Rounded Square organic shapes
    const paths = {
      happy: "M 20,10 H 80 A 30,30 0 0 1 110,40 V 80 A 30,30 0 0 1 80,110 H 20 A 30,30 0 0 1 -10,80 V 40 A 30,30 0 0 1 20,10 Z",
      calm: "M 25,5 H 75 A 35,35 0 0 1 110,40 V 80 A 35,35 0 0 1 75,115 H 25 A 35,35 0 0 1 -10,80 V 40 A 35,35 0 0 1 25,5 Z", 
      thinking: "M 10,45 H 90 V 55 H 10 Z",
      confident: "M 20,15 H 80 A 25,25 0 0 1 105,40 V 80 A 25,25 0 0 1 80,105 H 20 A 25,25 0 0 1 -5,80 V 40 A 25,25 0 0 1 20,15 Z",
      sad: "M 15,20 H 85 A 35,35 0 0 1 120,55 V 90 A 35,35 0 0 1 85,125 H 15 A 35,35 0 0 1 -20,90 V 55 A 35,35 0 0 1 15,20 Z",
      angry: side === 'left' ? "M 20,20 H 80 L 90,80 Q 90,90 70,90 H 10 Z" : "M 10,20 H 70 L 70,90 Q 70,100 50,100 H -10 Z",
      confused: side === 'left' ? "M 30,30 H 70 A 20,20 0 0 1 90,50 V 80 A 20,20 0 0 1 70,100 H 30 A 20,20 0 0 1 10,80 V 50 A 20,20 0 0 1 30,30 Z" : "M 25,5 H 75 A 35,35 0 0 1 110,40 V 80 A 35,35 0 0 1 75,115 H 25 A 35,35 0 0 1 -10,80 V 40 A 35,35 0 0 1 25,5 Z",
      idle: "M 20,18 H 80 A 25,25 0 0 1 105,43 V 77 A 25,25 0 0 1 80,102 H 20 A 25,25 0 0 1 -5,77 V 43 A 25,25 0 0 1 20,18 Z",
      love: "M 50,90 C 50,90 -10,60 -10,20 C -10,0 10,-10 30,-10 C 40,-10 45,-5 50,10 C 55,-5 60,-10 70,-10 C 90,-10 110,0 110,20 C 110,60 50,90 50,90 Z",
      error: "M 10,10 L 40,40 L 10,70 L 20,80 L 50,50 L 80,80 L 90,70 L 60,40 L 90,10 L 80,0 L 50,30 L 20,0 Z" 
    };

    if (isListening && !isTalking) return "M 10,5 H 90 Q 100,5 100,15 V 40 Q 100,50 90,50 H 10 Q 0,50 0,40 V 15 Q 0,5 10,5 Z";

    return (paths as any)[state] || paths.calm;
  };

  // Mouth Shape Paths - Center-weighted expansion with emotional context (Smoother & Dynamic)
  const getMouthPath = () => {
    if (isTalking) {
      const centerX = 25;
      const centerY = 18; // Shifted up to avoid bottom clipping
      
      // Dynamic scaling based on talkPulse
      const widthScale = 6 + talkPulse * 14; 
      const heightScale = 4 + talkPulse * 12;
      
      const left = centerX - widthScale - 5;
      const right = centerX + widthScale + 5;
      
      // Cubic bezier for a very smooth rounded "pill" or "oval" shape
      // M x,y C cp1x,cp1y cp2x,cp2y x,y ...
      return `M ${left},${centerY} 
              C ${left},${centerY + heightScale} ${right},${centerY + heightScale} ${right},${centerY} 
              C ${right},${centerY - heightScale * 0.4} ${left},${centerY - heightScale * 0.4} ${left},${centerY} Z`;
    }

    if (isListening) return "M 10,15 Q 25,28 40,15 Q 25,38 10,15 Z"; 

    switch (activeEmotion) {
      case 'happy': return "M 5,15 Q 25,35 45,15 Q 25,48 5,15 Z";
      case 'love': return "M 8,12 Q 25,45 42,12 Q 25,35 8,12 Z"; 
      case 'sad': return "M 5,38 Q 25,12 45,38 Q 25,25 5,38 Z";
      case 'thinking': return "M 15,25 H 35 V 32 H 15 Z";
      case 'confident': return "M 8,22 Q 25,29 42,22 Q 25,41 8,22 Z";
      case 'error': return "M 12,22 H 38 V 30 H 12 Z"; 
      default: return "M 12,24 Q 25,35 38,24 Q 25,46 12,24 Z"; 
    }
  };

  // Colors based on the provided image
  const vibrancePurple = "#a855f7"; // Vibrant Violet
  const accentWhite = "#ffffff";    // White highlight

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      <svg style={{ visibility: 'hidden', position: 'absolute' }}>
        <defs>
          <radialGradient id="orbGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={accentWhite} stopOpacity="0.95" />
            <stop offset="45%" stopColor={accentWhite} stopOpacity="0.6" />
            <stop offset="100%" stopColor={vibrancePurple} />
          </radialGradient>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      {/* Upper 60% - Eyes Area */}
      <motion.div 
        className="w-full h-[60%] flex items-center justify-center space-x-[1.5vw]"
        animate={{ 
          rotateX: -gaze.y * 0.4,
          rotateY: gaze.x * 0.25,
          scale: [1, 1.02, 1]
        }}
        transition={{ 
          scale: { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{ perspective: 1200 }}
      >
        {['left', 'right'].map((side) => {
          const isLeft = side === 'left';
          // Human-like asymmetrical gaze
          const leadMultiplier = 1.15;
          const trailMultiplier = 0.8;
          let xOffset = 0;
          
          if (gaze.x < 0) {
            xOffset = isLeft ? gaze.x * leadMultiplier : gaze.x * trailMultiplier;
          } else {
            xOffset = isLeft ? gaze.x * trailMultiplier : gaze.x * leadMultiplier;
          }

          const yOffset = isLeft ? gaze.y * 1.02 : gaze.y * 0.98;

          return (
          <motion.div 
            key={side} 
            className="relative w-[40vw] h-[40vw]"
            animate={{ 
              x: xOffset,
              y: yOffset,
              rotateZ: isLeft ? gaze.x * 0.05 : -gaze.x * 0.05
            }}
            transition={{ 
              x: { type: "spring", stiffness: 120, damping: 22 },
              y: { type: "spring", stiffness: 100, damping: 20 },
            }}
          >
            <svg viewBox="-40 -20 180 150" className="w-full h-full overflow-visible">
              <filter id={`glow-${side}`}>
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <motion.path
                animate={{ d: getEyeExpression(side as any, activeEmotion) }}
                transition={{ 
                  duration: blink ? 0.12 : 0.6, // Snappier blink transition to avoid glitches
                  ease: "easeInOut" 
                }}
                fill="url(#orbGradient)"
                stroke="transparent"
                strokeWidth="0"
                strokeLinecap="round"
                style={{ filter: `url(#glow-${side})` }}
              />
            </svg>
          </motion.div>
          );
        })}
      </motion.div>

      {/* Lower 35% - Mouth Area */}
      <motion.div 
        className="w-full h-[35%] flex items-center justify-center pb-8"
        animate={{ 
          rotateX: gaze.y * 0.1,
          scale: [1, 1.05, 1] 
        }}
        transition={{ scale: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        style={{ perspective: 1200 }}
      >
        <div className="relative w-[55vw] h-[25vw]">
          <svg viewBox="0 0 50 50" className="w-full h-full overflow-visible">
            <motion.path
              animate={{ d: getMouthPath() }}
              transition={{ 
                duration: isTalking ? 0.08 : 0.6, // Smoother idle mouth transitions
                ease: isTalking ? "linear" : "easeInOut" 
              }}
              fill="url(#orbGradient)"
              stroke="transparent"
              strokeWidth="0"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.4))' }}
            />
          </svg>
        </div>
      </motion.div>

      {/* Subtle Digital Depth */}
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-[0.2]"
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ background: `radial-gradient(circle at center, ${vibrancePurple}33 0%, transparent 80%)` }}
      />
    </div>
  );
};

