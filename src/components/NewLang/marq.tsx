'use client'

import React, { useState } from 'react'
import { motion } from "framer-motion";
import styles from "@/styles/Marquee.module.css";

const tagGroups = [
    [
        "🚀 Blazing Fast Performance",
        "⚡ Next.js Powered",
        "Static Generation",
        "ISR",
        "🖼 Automatic Image Optimization",
        "🎥 Rich Media Support",
        "⚙ Lazy Loading for Speed",
        "🚀 CDN-Powered Delivery",
        "📡 Real-Time Updates"
    ],
    [
        "Headless",
        "API-Driven",
        "🌍 SEO Optimized",
        "🏎 Ultra-Lightweight",
        "🔥 Serverless & Scalable",
        "🎨 Drag & Drop Builder",
        "🏗 Customizable Templates",
        "🖌 No-Code Page Design",
        "🌈 Dynamic Theming",
        "🛠 Modular Architecture"
    ],
];

const Marq = () => {
    const [animationDuration] = useState(25); // Uniform speed

    return (
        <div className='absolute bottom-4 left-0 w-full px-4 sm:px-6 md:px-10'>
            <p className="font-semibold text-gray-700 text-sm sm:text-base md:text-md lg:text-lg text-center m-3 sm:m-5">
                Designed for performance, built for flexibility -<br />
                Our CMS lets you create without limits. Experience the power of a
                headless, API-driven CMS with Next.js speed and modular flexibility.
            </p>
            <Marquee tags={tagGroups[0]} animationDuration={animationDuration} index={1} />
            <Marquee tags={tagGroups[1]} animationDuration={animationDuration} index={2} />
        </div>
    );
};

function Marquee({ tags, animationDuration, index }: { tags: string[]; animationDuration: number; index: number }) {
    return (
        <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[80%] flex flex-col mx-auto relative overflow-hidden shrink-0">
            <motion.div
                className="relative overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
            >
                <div className="relative overflow-hidden">
                    <div
                        className={styles.marquee}
                        style={{
                            animationDuration: `${animationDuration}s`,
                            animationDirection: index % 2 === 0 ? "normal" : "reverse",
                        }}
                    >
                        {[...tags, ...tags].map((tag, i) => (
                            <div
                                key={i}
                                className="bg-black text-white px-2 sm:px-3 py-1 sm:py-2 rounded-md m-1 shadow-md text-xs sm:text-sm md:text-base"
                            >
                                {tag}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-100 via-transparent to-slate-100"></div>
        </div>
    );
}

export default Marq;
