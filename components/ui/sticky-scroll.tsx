"use client";

import React, { useRef } from "react";
import { useScroll, motion, useTransform, MotionValue } from "framer-motion";

interface StickyScrollProps {
    content: {
        title: string;
        description: string;
        content: React.ReactNode;
    }[];
}

const StickyTextItem = ({
    item,
    index,
    totalLength,
    scrollYProgress,
}: {
    item: StickyScrollProps["content"][0];
    index: number;
    totalLength: number;
    scrollYProgress: MotionValue<number>;
}) => {
    const opacity = useTransform(
        scrollYProgress,
        [
            (index - 0.5) / totalLength,
            index / totalLength,
            (index + 0.5) / totalLength,
        ],
        [0.3, 1, 0.3]
    );

    return (
        <motion.div style={{ opacity }} className="flex flex-col gap-4">
            <h3 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                {item.title}
            </h3>
            <p className="text-lg text-neutral-400 max-w-sm">{item.description}</p>
        </motion.div>
    );
};

const StickyVisualItem = ({
    item,
    index,
    totalLength,
    scrollYProgress,
}: {
    item: StickyScrollProps["content"][0];
    index: number;
    totalLength: number;
    scrollYProgress: MotionValue<number>;
}) => {
    const opacity = useTransform(
        scrollYProgress,
        [
            (index - 0.5) / totalLength,
            index / totalLength,
            (index + 0.5) / totalLength,
        ],
        [0, 1, 0]
    );
    const scale = useTransform(
        scrollYProgress,
        [
            (index - 0.5) / totalLength,
            index / totalLength,
            (index + 0.5) / totalLength,
        ],
        [0.8, 1, 0.8]
    );

    return (
        <motion.div
            style={{ opacity, scale }}
            className="absolute inset-0 flex items-center justify-center p-8"
        >
            {item.content}
        </motion.div>
    );
};


export const StickyScroll = ({ content }: StickyScrollProps) => {
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start start", "end end"],
    });

    return (
        <div ref={targetRef} className="relative h-[300vh] mt-24">
            <div className="sticky top-0 flex h-screen items-center px-6 md:px-12 lg:px-24">
                {/* Left Side: Text Track */}
                <div className="flex-1 space-y-24 max-w-lg mb-32 relative">
                    {content.map((item, index) => (
                        <StickyTextItem
                            key={`text-${index}`}
                            item={item}
                            index={index}
                            totalLength={content.length}
                            scrollYProgress={scrollYProgress}
                        />
                    ))}
                </div>

                {/* Right Side: Visual Track */}
                <div className="hidden lg:block flex-1 h-[60vh] w-full rounded-3xl bg-[#09090B]/30 backdrop-blur-3xl border border-white/[0.08] relative overflow-hidden shadow-[inset_0_0_40px_rgba(255,255,255,0.03),0_4px_30px_rgba(0,0,0,0.5),0_0_80px_-20px_rgba(255,255,255,0.05)]">
                    {content.map((item, index) => (
                        <StickyVisualItem
                            key={`visual-${index}`}
                            item={item}
                            index={index}
                            totalLength={content.length}
                            scrollYProgress={scrollYProgress}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
