"use client";

import React, { useEffect, useRef } from "react";

export const FluidGradient = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        let t = 0;

        const render = () => {
            // Very specific mesh gradient aesthetic colors (Stripe/Vercel top notch influence)
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, `hsla(${210 + Math.sin(t * 0.01) * 20}, 100%, 70%, 0.15)`); // Cyan-ish
            gradient.addColorStop(0.5, `hsla(${270 + Math.sin(t * 0.015) * 30}, 80%, 60%, 0.1)`); // Purple-ish
            gradient.addColorStop(1, `hsla(${330 + Math.sin(t * 0.02) * 20}, 100%, 70%, 0.15)`); // Pink-ish

            ctx.fillStyle = "#09090B"; // Base dark background
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = gradient;

            // Draw organic fluid shapes
            ctx.beginPath();
            for (let i = 0; i <= width; i += 20) {
                const y = height / 2 + Math.sin(i * 0.01 + t * 0.02) * 50 + Math.cos(i * 0.02 - t * 0.03) * 100;
                if (i === 0) ctx.moveTo(i, y);
                else ctx.lineTo(i, y);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.fill();

            // Second layer of fluid
            ctx.beginPath();
            for (let i = 0; i <= width; i += 20) {
                const y = height / 2 + Math.cos(i * 0.015 + t * 0.01) * 80 + Math.sin(i * 0.025 - t * 0.02) * 120;
                if (i === 0) ctx.moveTo(i, height - y);
                else ctx.lineTo(i, height - y);
            }
            ctx.lineTo(width, 0);
            ctx.lineTo(0, 0);
            ctx.fillStyle = `hsla(${250 + Math.sin(t * 0.01) * 30}, 70%, 60%, 0.1)`;
            ctx.fill();

            t += 1;
            requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none w-full h-full opacity-60 mix-blend-screen"
            style={{ filter: "blur(100px)" }} // Heavy blur creates the "mesh gradient" feel
        />
    );
};
