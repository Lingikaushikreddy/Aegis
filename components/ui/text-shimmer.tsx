"use client";

import { motion } from "framer-motion";
import React from "react";

export const TextShimmer = ({
    children,
    className = "",
    duration = 2.5,
}: {
    children: React.ReactNode;
    className?: string;
    duration?: number;
}) => {
    return (
        <motion.div
            className={`inline-flex relative overflow-hidden bg-[length:200%_100%] ${className}`}
            style={{
                backgroundImage:
                    "linear-gradient(90deg, rgba(161, 161, 170, 0.4) 0%, rgba(255, 255, 255, 1) 50%, rgba(161, 161, 170, 0.4) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
            }}
            initial={{ backgroundPosition: "200% 0" }}
            animate={{ backgroundPosition: "-200% 0" }}
            transition={{
                repeat: Infinity,
                duration: duration,
                ease: "linear",
            }}
        >
            {children}
        </motion.div>
    );
};
