import { useRef, useState, useCallback, MouseEvent, TouchEvent } from 'react';

interface UseDragScrollOptions {
  threshold?: number;  // クリックとドラッグを区別する閾値（px）
}

export function useDragScroll(options: UseDragScrollOptions = {}) {
  const { threshold = 5 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > threshold) {
      setHasMoved(true);
    }
    containerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft, threshold]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // タッチイベント対応
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > threshold) {
      setHasMoved(true);
    }
    containerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft, threshold]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // カードクリック時にドラッグ中だったら無効化するための関数
  const shouldPreventClick = useCallback(() => {
    return hasMoved;
  }, [hasMoved]);

  return {
    containerRef,
    isDragging,
    hasMoved,
    shouldPreventClick,
    containerProps: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      style: { cursor: isDragging ? 'grabbing' : 'grab' }
    }
  };
}
