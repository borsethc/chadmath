"use client";

import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { X, QrCode } from 'lucide-react';

export function QRCodeDisplay() {
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setUrl(window.location.href);
        }
    }, []);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-all shadow-lg z-50 group"
                title="Show QR Code"
            >
                <QrCode className="w-6 h-6 opacity-70 group-hover:opacity-100" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">Scan to Join</h3>
                    <p className="text-gray-500 text-sm">Open camera & point at code</p>
                </div>

                <div className="p-4 bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_8px_20px_rgba(0,0,0,0.1)]">
                    <QRCodeSVG
                        value={url}
                        size={200}
                        level="H"
                        includeMargin={true}
                    />
                </div>

                <p className="text-xs text-gray-400 font-mono break-all text-center max-w-[200px]">
                    {url}
                </p>
            </div>
        </div>
    );
}
