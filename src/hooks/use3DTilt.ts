import { useState, useEffect, useRef, useCallback } from 'react';

export interface TiltState {
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
  translateZ: number;
  glareX: number;
  glareY: number;
  isInteracting: boolean;
  normX: number;
  normY: number;
}

interface Use3DTiltOptions {
  maxTilt?: number; // max tilt in degrees, e.g. 18
  maxTranslate?: number; // max lateral translation in px, e.g. 15
  perspective?: number;
  disabled?: boolean;
}

export function use3DTilt({
  maxTilt = 18,
  maxTranslate = 14,
  disabled = false,
}: Use3DTiltOptions = {}) {
  const [tilt, setTilt] = useState<TiltState>({
    rotateX: 0,
    rotateY: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    glareX: 50,
    glareY: 50,
    isInteracting: false,
    normX: 0,
    normY: 0,
  });

  const elementRef = useRef<HTMLDivElement>(null);
  const gyroActiveRef = useRef(false);

  // Mouse Move Handler
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disabled || !elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const padding = 200; // Proximity magnetic zone around the element

      // Check if cursor is within active interaction bounds
      const isInside =
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding;

      if (!isInside) {
        if (!gyroActiveRef.current) {
          setTilt((prev) =>
            prev.isInteracting
              ? {
                  rotateX: 0,
                  rotateY: 0,
                  translateX: 0,
                  translateY: 0,
                  translateZ: 0,
                  glareX: 50,
                  glareY: 50,
                  isInteracting: false,
                  normX: 0,
                  normY: 0,
                }
              : prev
          );
        }
        return;
      }

      // Calculate mouse position relative to element center
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) / (rect.width / 2);
      const deltaY = (e.clientY - centerY) / (rect.height / 2);

      // Clamp between -1.1 and 1.1
      const clampedX = Math.max(-1.1, Math.min(1.1, deltaX));
      const clampedY = Math.max(-1.1, Math.min(1.1, deltaY));

      const rotY = clampedX * maxTilt;
      const rotX = -clampedY * maxTilt;

      // Dynamic physical translation following mouse direction
      const transX = clampedX * maxTranslate;
      const transY = clampedY * (maxTranslate * 0.85);

      // Glare position in percentages
      const glareX = Math.max(0, Math.min(100, (clampedX + 1) * 50));
      const glareY = Math.max(0, Math.min(100, (clampedY + 1) * 50));

      setTilt({
        rotateX: rotX,
        rotateY: rotY,
        translateX: transX,
        translateY: transY,
        translateZ: 22,
        glareX,
        glareY,
        isInteracting: true,
        normX: clampedX,
        normY: clampedY,
      });
    },
    [disabled, maxTilt, maxTranslate]
  );

  const handleMouseLeave = useCallback(() => {
    if (disabled || gyroActiveRef.current) return;
    setTilt({
      rotateX: 0,
      rotateY: 0,
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      glareX: 50,
      glareY: 50,
      isInteracting: false,
      normX: 0,
      normY: 0,
    });
  }, [disabled]);

  // Mobile Device Orientation (Gyroscope / Accelerometer)
  useEffect(() => {
    if (disabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      gyroActiveRef.current = true;

      // gamma is left-to-right tilt in degrees [-90, 90]
      // beta is front-to-back tilt in degrees [-180, 180]
      const gamma = Math.max(-45, Math.min(45, e.gamma));
      const beta = Math.max(-45, Math.min(45, e.beta - 45)); // normalize holding angle

      const rotY = (gamma / 45) * maxTilt;
      const rotX = (-beta / 45) * maxTilt;

      const transX = (gamma / 45) * maxTranslate;
      const transY = (beta / 45) * (maxTranslate * 0.85);

      const glareX = 50 + (gamma / 45) * 40;
      const glareY = 50 + (beta / 45) * 40;

      setTilt({
        rotateX: rotX,
        rotateY: rotY,
        translateX: transX,
        translateY: transY,
        translateZ: 18,
        glareX,
        glareY,
        isInteracting: true,
        normX: gamma / 45,
        normY: beta / 45,
      });
    };

    // Touch move support on mobile
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && elementRef.current) {
        const touch = e.touches[0];
        const rect = elementRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (touch.clientX - centerX) / (rect.width / 2);
        const deltaY = (touch.clientY - centerY) / (rect.height / 2);

        const clampedX = Math.max(-1.1, Math.min(1.1, deltaX));
        const clampedY = Math.max(-1.1, Math.min(1.1, deltaY));

        const rotY = clampedX * maxTilt;
        const rotX = -clampedY * maxTilt;

        setTilt({
          rotateX: rotX,
          rotateY: rotY,
          translateX: clampedX * maxTranslate,
          translateY: clampedY * (maxTranslate * 0.85),
          translateZ: 20,
          glareX: 50 + clampedX * 35,
          glareY: 50 + clampedY * 35,
          isInteracting: true,
          normX: clampedX,
          normY: clampedY,
        });
      }
    };

    const handleTouchEnd = () => {
      if (!gyroActiveRef.current) {
        setTilt({
          rotateX: 0,
          rotateY: 0,
          translateX: 0,
          translateY: 0,
          translateZ: 0,
          glareX: 50,
          glareY: 50,
          isInteracting: false,
          normX: 0,
          normY: 0,
        });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, handleMouseMove, handleMouseLeave, maxTilt, maxTranslate]);

  return { elementRef, tilt };
}
