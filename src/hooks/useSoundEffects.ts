"use client";

import { useRef, useCallback } from "react";

export function useSoundEffects() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);

    // Initialize Audio Context on user interaction (first click/interaction usually required)
    const initAudio = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioContext) return; // Browser doesn't support Web Audio

                audioContextRef.current = new AudioContext();
                masterGainRef.current = audioContextRef.current.createGain();
                masterGainRef.current.gain.value = 0.3; // Low volume default
                masterGainRef.current.connect(audioContextRef.current.destination);
            } else if (audioContextRef.current.state === "suspended") {
                audioContextRef.current.resume().catch(e => console.warn("Audio resume failed", e));
            }
        } catch (e) {
            console.warn("Audio Context init failed (likely Safari restriction)", e);
        }
    }, []);

    const playCorrect = useCallback((streak: number = 0) => {
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx || !masterGainRef.current) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(masterGainRef.current);

        // Tech chime: Sine wave, quick decay
        // Pitch shift based on streak: +1 semitone per streak point
        // Cap at 12 semitones (1 octave)
        const semitones = Math.min(streak, 12);
        const baseFreq = 880; // A5
        const freqMultiplier = Math.pow(2, semitones / 12);

        const startFreq = baseFreq * freqMultiplier;
        const endFreq = (baseFreq * 2) * freqMultiplier; // Slide up an octave relative to start

        osc.type = "sine";
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    }, [initAudio]);

    const playHover = useCallback(() => {
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx || !masterGainRef.current) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(masterGainRef.current);

        // Subtle click
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200, ctx.currentTime);

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    }, [initAudio]);

    const playComplete = useCallback(() => {
        // Fanfare
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx || !masterGainRef.current) return;

        const now = ctx.currentTime;

        [0, 4, 7, 12].forEach((interval, i) => { // Major chord arpeggio
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(masterGainRef.current!);

            osc.type = "sine";
            const freq = 440 * Math.pow(2, interval / 12);
            osc.frequency.value = freq;

            const start = now + i * 0.1;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.5, start + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 1.5);

            osc.start(start);
            osc.stop(start + 1.6);
        });

    }, [initAudio]);

    const playIncorrect = useCallback(() => {
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx || !masterGainRef.current) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(masterGainRef.current);

        // Low frequency "thud" or "buzz"
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }, [initAudio]);

    return { playCorrect, playHover, playComplete, playIncorrect, initAudio };
}
