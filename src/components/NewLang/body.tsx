"use client";

import Image from "next/image";
import LanguageSelector from "./LanguageSelector";

export default function Body() {
    return (
        <div className="flex flex-col justify-center items-center text-center min-h-screen">
            <div className="mb-44">
                <Image
                    src="/img/openNext.png"
                    alt="LOGO"
                    width={350}
                    height={150}
                    className="hover:opacity-75 mx-auto"
                    priority
                />
                <h1 className="p-8 pb-5 font-extrabold sm:text-2xl md:text-3xl lg:text-4xl">
                    Build Faster, Smarter, Better -<br />
                    A
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-600 bg-clip-text text-transparent">
                        {' '} Lightning-Fast {' '}
                    </span>
                    CMS for the Modern Web.
                </h1>

                <div className="w-full h-80 max-w-2xl mb-3 mx-auto p-6 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center">
                    <h2 className="font-extrabold sm:text-3xl md:text-4xl lg:text-5xl">Start Installation</h2>
                    <LanguageSelector />
                </div>
            </div>
        </div>
    );
}
