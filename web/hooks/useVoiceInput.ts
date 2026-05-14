"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// Minimal Web Speech API types (not in all TS dom libs)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
  readonly length: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SR extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SRConstructor = new () => SR;

function getSR(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as Window & { SpeechRecognition?: SRConstructor }).SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: SRConstructor }).webkitSpeechRecognition ??
    null
  );
}

export interface UseVoiceInputResult {
  isSupported: boolean;
  isRecording: boolean;
  transcript: string;
  startRecording: () => void;
  stopRecording: () => void;
}

export function useVoiceInput(): UseVoiceInputResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SR | null>(null);

  useEffect(() => {
    setIsSupported(getSR() !== null);
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const makeRecognition = useCallback(
    (SR: SRConstructor, lang: string, onResult: (e: SpeechRecognitionEvent) => void): SR => {
      const r = new SR();
      r.lang = lang;
      r.interimResults = false;
      r.continuous = false;
      r.maxAlternatives = 1;
      r.onresult = onResult;
      return r;
    },
    [],
  );

  const startRecording = useCallback(() => {
    const SR = getSR();
    if (!SR || isRecording) return;

    const onResult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) setTranscript(last[0].transcript.trim());
    };

    const recognition = makeRecognition(SR, "hi-IN", onResult);

    recognition.onerror = (event) => {
      if (event.error === "language-not-supported") {
        // Fallback to en-IN
        const r2 = makeRecognition(SR, "en-IN", onResult);
        r2.onerror = () => { setIsRecording(false); recognitionRef.current = null; };
        r2.onend = () => { setIsRecording(false); recognitionRef.current = null; };
        recognitionRef.current = r2;
        r2.start();
      } else {
        setIsRecording(false);
        recognitionRef.current = null;
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setTranscript("");
    recognition.start();
    setIsRecording(true);
  }, [isRecording, makeRecognition]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    // onend clears isRecording
  }, []);

  return { isSupported, isRecording, transcript, startRecording, stopRecording };
}
