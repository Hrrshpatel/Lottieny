import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

import { forwardRef, useImperativeHandle } from 'react';

const LottiePlayer = forwardRef(({ animationData, className, loop = true, autoplay = true, style }, ref) => {
    const containerRef = useRef(null);
    const animRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getLottie: () => animRef.current
    }));

    useEffect(() => {
        if (!containerRef.current || !animationData) return;

        animRef.current = lottie.loadAnimation({
            container: containerRef.current,
            renderer: 'svg',
            loop: loop,
            autoplay: autoplay,
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
            style={style}
        />
    );
});

export default LottiePlayer;


