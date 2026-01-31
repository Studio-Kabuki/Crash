import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number; // アニメーション時間（ms）
  className?: string;
  onComplete?: () => void;
  onAnimatingChange?: (isAnimating: boolean) => void;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 500,
  className = '',
  onComplete,
  onAnimatingChange
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const prevValue = prevValueRef.current;

    if (prevValue === value) return;

    const startValue = prevValue;
    const endValue = value;
    const startTime = performance.now();

    setIsAnimating(true);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutQuad
      const easeProgress = 1 - (1 - progress) * (1 - progress);

      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
        prevValueRef.current = endValue;
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, onComplete]);

  // 初期値の同期
  useEffect(() => {
    if (!isAnimating) {
      setDisplayValue(value);
      prevValueRef.current = value;
    }
  }, [value, isAnimating]);

  // アニメーション状態の通知
  useEffect(() => {
    onAnimatingChange?.(isAnimating);
  }, [isAnimating, onAnimatingChange]);

  return (
    <span className={`inline-block ${className} ${isAnimating ? 'scale-150 transition-transform' : 'transition-transform'}`}>
      {displayValue}
    </span>
  );
};
