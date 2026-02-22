"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const BlendingCursor = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        // Hide default cursor on body
        document.body.style.cursor = "none";

        const updateMousePosition = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === "A" ||
                target.tagName === "BUTTON" ||
                target.closest("a") ||
                target.closest("button")
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener("mousemove", updateMousePosition);
        window.addEventListener("mouseover", handleMouseOver);

        return () => {
            document.body.style.cursor = "auto";
            window.removeEventListener("mousemove", updateMousePosition);
            window.removeEventListener("mouseover", handleMouseOver);
        };
    }, []);

    return (
        <>
            {/* Outer trailing ring */}
            <motion.div
                className="fixed top-0 left-0 rounded-full z-[9999] pointer-events-none hidden sm:block"
                style={{
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                    mixBlendMode: "difference",
                    translateX: "-50%",
                    translateY: "-50%",
                }}
                animate={{
                    x: mousePosition.x,
                    y: mousePosition.y,
                    width: isHovering ? 64 : 32,
                    height: isHovering ? 64 : 32,
                    backgroundColor: isHovering ? "rgba(255, 255, 255, 1)" : "transparent",
                    border: isHovering ? "0px solid transparent" : "1px solid rgba(255, 255, 255, 0.5)",
                }}
                transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    mass: 0.5,
                }}
            />

            {/* Inner instant dot */}
            <motion.div
                className="fixed top-0 left-0 bg-white rounded-full z-[10000] pointer-events-none hidden sm:block"
                style={{
                    mixBlendMode: "difference",
                    translateX: "-50%",
                    translateY: "-50%",
                }}
                animate={{
                    x: mousePosition.x,
                    y: mousePosition.y,
                    width: isHovering ? 0 : 8,
                    height: isHovering ? 0 : 8,
                    opacity: isHovering ? 0 : 1,
                }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 28,
                    mass: 0.1,
                }}
            />
        </>
    );
};
