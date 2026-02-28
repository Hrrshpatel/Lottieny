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
            className={`w-full h-full flex items-center justify-center ${className || ''}`}
        />
    );
};

export default LottiePlayer;
