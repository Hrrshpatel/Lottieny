import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

const LottiePlayer = ({ animationData, className }) => {
    const containerRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !animationData) return;

        animRef.current = lottie.loadAnimation({
            container: containerRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            // Pass a clone to lottie since it mutates the object heavily
            animationData: JSON.parse(JSON.stringify(animationData)),
        });

        return () => {
            if (animRef.current) {
                animRef.current.destroy();
            }
        };
    }, [animationData]);

    return (
        <div
            ref={containerRef}
            className={`w-full max-w-sm aspect-square bg-slate-800/50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-700 ${className || ''}`}
        />
    );
};

export default LottiePlayer;
