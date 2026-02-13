"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
    decay: number;
}

export function Confetti({ active }: { active: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const animationFrame = useRef<number>(0);
    const [mounted, setMounted] = useState(false);

    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (active) {
            // Spawn particles
            for (let i = 0; i < 100; i++) {
                particles.current.push({
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                    vx: (Math.random() - 0.5) * 20,
                    vy: (Math.random() - 0.5) * 20,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 8 + 4,
                    life: 1.0,
                    decay: Math.random() * 0.02 + 0.01
                });
            }
        }
    }, [active]);

    useEffect(() => {
        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const remainingParticles: Particle[] = [];

            particles.current.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.5; // Gravity
                p.life -= p.decay;

                if (p.life > 0) {
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    remainingParticles.push(p);
                }
            });

            particles.current = remainingParticles;

            if (particles.current.length > 0) {
                animationFrame.current = requestAnimationFrame(render);
            }
        };

        if (active || particles.current.length > 0) {
            render();
        }

        return () => cancelAnimationFrame(animationFrame.current);
    }, [active]);

    if (!mounted) return null;
    if (!active && particles.current.length === 0) return null;

    // Safety check for document
    if (typeof document === 'undefined') return null;

    return createPortal(
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ width: "100vw", height: "100vh" }}
        />,
        document.body
    );
}
