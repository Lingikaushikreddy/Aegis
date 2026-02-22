"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import React, { MouseEvent } from "react";

export const BeamCard = ({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
    }: MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl bg-[#0F0F12] border border-white/[0.06] p-[1px] ${className}`}
            onMouseMove={handleMouseMove}
        >
            {/* Spotlight Glare */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100 z-0"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            400px circle at ${mouseX}px ${mouseY}px,
                            rgba(14, 165, 233, 0.15),
                            transparent 80%
                        )
                    `,
                }}
            />
            {/* Animated Glowing Beam Trace */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <motion.div
                    animate={{
                        top: ["0%", "0%", "100%", "100%", "0%"],
                        left: ["0%", "100%", "100%", "0%", "0%"],
                    }}
                    transition={{
                        duration: 8,
                        ease: "linear",
                        repeat: Infinity,
                    }}
                    className="absolute h-[150px] w-[2px] bg-gradient-to-b from-transparent via-[#0EA5E9] to-transparent opacity-80 shadow-[0_0_20px_#0EA5E9]"
                    style={{ transform: "translateY(-50%)" }}
                />
                <motion.div
                    animate={{
                        top: ["100%", "100%", "0%", "0%", "100%"],
                        left: ["100%", "0%", "0%", "100%", "100%"],
                    }}
                    transition={{
                        duration: 8,
                        ease: "linear",
                        repeat: Infinity,
                    }}
                    className="absolute h-[150px] w-[2px] bg-gradient-to-b from-transparent via-[#8B5CF6] to-transparent opacity-80 shadow-[0_0_20px_#8B5CF6]"
                    style={{ transform: "translateY(-50%)" }}
                />
            </div>

            {/* Inner Content Surface */}
            <div className="relative z-10 h-full w-full rounded-[15px] bg-[#0F0F12] p-6 lg:p-8 flex flex-col items-start overflow-hidden">
                {/* Subtle static gradient to give volume to darkness */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent z-0 pointer-events-none" />
                <div className="relative w-full z-10">{children}</div>
            </div>
        </div>
    );
};
