"use client";

import Image from "next/image";
import LanguageSelector from "./LanguageSelector";

export default function Body() {
    return (
        <div className="flex justify-center items-center text-center min-h-screen">
            <div className="text-center">
                <div className="mb-48">
                    <Image
                        src="/img/openNext.png"
                        alt="LOGO"
                        width={384} // w-96 (384px)
                        height={192} // Adjust height accordingly
                        className="hover:opacity-75 mx-auto"
                        priority
                    />

                    <h1 className="p-12 font-extrabold sm:text-3xl md:text-4xl lg:text-5xl">
                        Build Faster, Smarter, Better -<br />
                        A
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-600 bg-clip-text text-transparent">
                            {' '} Lightning-Fast {' '}
                        </span>
                        CMS for the Modern Web.
                    </h1>

                    <div className="w-full h-56 max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center">
                        <h2>Start Installation</h2>
                        <LanguageSelector />
                    </div>
                </div>
            </div>
        </div>
    );
}
