/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Info } from 'lucide-react';
import { RobotFace } from './components/RobotFace';
import { getEmotionalResponse, Emotion, ChatResponse } from './services/geminiService';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function App() {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stateRef = useRef({ isTalking, isThinking, messages, isListening });
  
  useEffect(() => {
    stateRef.current = { isTalking, isThinking, messages, isListening };
  }, [isTalking, isThinking, messages, isListening]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Recognized:", transcript);
        handleSendMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        }
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const speak = (text: string) => {
    if (speechRef.current) {
      window.speechSynthesis.cancel();
      speechRef.current.text = text;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = 
        voices.find(v => v.name.includes('Google') && v.name.includes('UK English Female')) ||
        voices.find(v => v.name.includes('Female')) || 
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
        
      if (preferredVoice) speechRef.current.voice = preferredVoice;
      speechRef.current.pitch = 1.1; 
      speechRef.current.rate = 0.95;
      
      speechRef.current.onstart = () => {
        setIsTalking(true);
        try { recognitionRef.current?.stop(); } catch(e) {}
        setIsListening(false);
      };
      speechRef.current.onend = () => {
        setIsTalking(false);
        setCurrentEmotion('calm');
      };

      window.speechSynthesis.speak(speechRef.current);
    }
  };

  const toggleListening = () => {
    if (isTalking) {
      window.speechSynthesis.cancel();
      setIsTalking(false);
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn("Mic start failed:", e);
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = text.trim();
    
    // Capture current messages for history before updating
    const history = [...messages];
    
    // 1. Update UI to show user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // 2. Set thinking state
    setIsThinking(true);
    setCurrentEmotion('thinking');
    
    // 3. Stop mic during processing
    try { recognitionRef.current?.stop(); } catch(e) {}
    setIsListening(false);

    // 4. Get AI response
    try {
      const response = await getEmotionalResponse(userMessage, history);
      
      // 5. Update state with AI response
      setMessages(current => [...current, { role: 'model', content: response.text }]);
      setCurrentEmotion(response.emotion);
      setIsThinking(false);
      
      // 6. Speak the response
      speak(response.text);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setIsThinking(false);
      setCurrentEmotion('error');
      
      // Fallback message
      const fallbackMsg = "I'm sorry, I'm having trouble connecting to my mind right now. Could you please try again?";
      setMessages(current => [...current, { role: 'model', content: fallbackMsg }]);
      speak(fallbackMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Full Screen Face */}
      <RobotFace emotion={currentEmotion} isListening={isListening} isTalking={isTalking} />

      {/* Mic Status Indicator (Discrete) */}
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.3, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-12 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] uppercase tracking-widest text-red-500 font-bold">Listening</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
