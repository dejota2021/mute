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
  isGyroActive: boolean;
  needsPermission: boolean;
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
    isGyroActive: false,
    needsPermission: false,
  });

  const elementRef = useRef<HTMLDivElement>(null);
  const gyroActiveRef = useRef(false);
  const isTouchInteractingRef = useRef(false);
  const targetTiltRef = useRef({ rotX: 0, rotY: 0, transX: 0, transY: 0, glareX: 50, glareY: 50 });
  const animFrameRef = useRef<number | null>(null);

  // Smooth lerp loop for silky gyroscope and touch dynamics
  useEffect(() => {
    let currentRotX = 0;
    let currentRotY = 0;
    let currentTransX = 0;
    let currentTransY = 0;
    let currentGlareX = 50;
    let currentGlareY = 50;

    const lerp = (a: number, b: number, factor: number) => a + (b - a) * factor;

    const tick = () => {
      if (!disabled) {
        const target = targetTiltRef.current;
        const speed = isTouchInteractingRef.current ? 0.35 : 0.15;

        currentRotX = lerp(currentRotX, target.rotX, speed);
        currentRotY = lerp(currentRotY, target.rotY, speed);
        currentTransX = lerp(currentTransX, target.transX, speed);
        currentTransY = lerp(currentTransY, target.transY, speed);
        currentGlareX = lerp(currentGlareX, target.glareX, speed);
        currentGlareY = lerp(currentGlareY, target.glareY, speed);

        // Only update react state when moving or active to avoid unneeded renders
        setTilt((prev) => {
          const changed =
            Math.abs(prev.rotateX - currentRotX) > 0.05 ||
            Math.abs(prev.rotateY - currentRotY) > 0.05 ||
            prev.isGyroActive !== gyroActiveRef.current;

          if (!changed && !prev.isInteracting && !gyroActiveRef.current) {
            return prev;
          }

          return {
            ...prev,
            rotateX: Math.round(currentRotX * 100) / 100,
            rotateY: Math.round(currentRotY * 100) / 100,
            translateX: Math.round(currentTransX * 100) / 100,
            translateY: Math.round(currentTransY * 100) / 100,
            translateZ: prev.isInteracting || gyroActiveRef.current ? 22 : 0,
            glareX: Math.round(currentGlareX * 10) / 10,
            glareY: Math.round(currentGlareY * 10) / 10,
            normX: currentRotY / maxTilt,
            normY: -currentRotX / maxTilt,
            isGyroActive: gyroActiveRef.current,
          };
        });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [disabled, maxTilt]);

  // Request gyroscope permissions for iOS 13+ devices
  const requestGyroPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const state = await (DeviceOrientationEvent as any).requestPermission();
        if (state === 'granted') {
          gyroActiveRef.current = true;
          setTilt((p) => ({ ...p, isGyroActive: true, needsPermission: false }));
          return true;
        }
      } catch (err) {
        console.warn('Could not request device orientation permission:', err);
      }
      return false;
    }
    return true;
  }, []);

  // Check whether iOS requires permission
  useEffect(() => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      setTilt((p) => ({ ...p, needsPermission: true }));
    }
  }, []);

  // Mouse Move Handler (Desktop)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disabled || !elementRef.current || isTouchInteractingRef.current) return;
      const rect = elementRef.current.getBoundingClientRect();
      const padding = 200; // Magnetic zone around element

      const isInside =
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding;

      if (!isInside) {
        if (!gyroActiveRef.current) {
          targetTiltRef.current = {
            rotX: 0,
            rotY: 0,
            transX: 0,
            transY: 0,
            glareX: 50,
            glareY: 50,
          };
          setTilt((prev) => ({ ...prev, isInteracting: false }));
        }
        return;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) / (rect.width / 2);
      const deltaY = (e.clientY - centerY) / (rect.height / 2);

      const clampedX = Math.max(-1.1, Math.min(1.1, deltaX));
      const clampedY = Math.max(-1.1, Math.min(1.1, deltaY));

      const rotY = clampedX * maxTilt;
      const rotX = -clampedY * maxTilt;
      const transX = clampedX * maxTranslate;
      const transY = clampedY * (maxTranslate * 0.85);

      const glareX = Math.max(0, Math.min(100, (clampedX + 1) * 50));
      const glareY = Math.max(0, Math.min(100, (clampedY + 1) * 50));

      targetTiltRef.current = { rotX, rotY, transX, transY, glareX, glareY };
      setTilt((prev) => ({ ...prev, isInteracting: true }));
    },
    [disabled, maxTilt, maxTranslate]
  );

  const handleMouseLeave = useCallback(() => {
    if (disabled || gyroActiveRef.current || isTouchInteractingRef.current) return;
    targetTiltRef.current = {
      rotX: 0,
      rotY: 0,
      transX: 0,
      transY: 0,
      glareX: 50,
      glareY: 50,
    };
    setTilt((prev) => ({ ...prev, isInteracting: false }));
  }, [disabled]);

  // Mobile Device Orientation (Gyroscope & Accelerometer)
  useEffect(() => {
    if (disabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // If user is actively touching/dragging, let touch take temporary precedence
      if (isTouchInteractingRef.current) return;

      if (e.gamma !== null && e.beta !== null) {
        gyroActiveRef.current = true;

        // gamma: left-to-right tilt in degrees [-90, 90]
        // beta: front-to-back tilt in degrees [-180, 180]
        // Standard comfortable holding angle for smartphone is ~42-45°
        const gamma = Math.max(-45, Math.min(45, e.gamma));
        const beta = Math.max(-45, Math.min(45, e.beta - 42));

        const rotY = (gamma / 45) * maxTilt;
        const rotX = (-beta / 45) * maxTilt;
        const transX = (gamma / 45) * maxTranslate;
        const transY = (beta / 45) * (maxTranslate * 0.85);

        const glareX = 50 + (gamma / 45) * 45;
        const glareY = 50 + (beta / 45) * 45;

        targetTiltRef.current = { rotX, rotY, transX, transY, glareX, glareY };
      }
    };

    // Touch support for mobile dragging & tilting
    const handleTouchStart = (e: TouchEvent) => {
      // Auto-trigger permission request on first touch if required
      if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function' && !gyroActiveRef.current) {
        requestGyroPermission();
      }
      if (e.touches.length > 0 && elementRef.current) {
        isTouchInteractingRef.current = true;
        setTilt((p) => ({ ...p, isInteracting: true }));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && elementRef.current) {
        isTouchInteractingRef.current = true;
        const touch = e.touches[0];
        const rect = elementRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (touch.clientX - centerX) / (rect.width / 2);
        const deltaY = (touch.clientY - centerY) / (rect.height / 2);

        const clampedX = Math.max(-1.2, Math.min(1.2, deltaX));
        const clampedY = Math.max(-1.2, Math.min(1.2, deltaY));

        const rotY = clampedX * maxTilt;
        const rotX = -clampedY * maxTilt;
        const transX = clampedX * maxTranslate;
        const transY = clampedY * (maxTranslate * 0.85);

        const glareX = 50 + clampedX * 40;
        const glareY = 50 + clampedY * 40;

        targetTiltRef.current = { rotX, rotY, transX, transY, glareX, glareY };
        setTilt((p) => ({ ...p, isInteracting: true }));
      }
    };

    const handleTouchEnd = () => {
      isTouchInteractingRef.current = false;
      if (!gyroActiveRef.current) {
        targetTiltRef.current = {
          rotX: 0,
          rotY: 0,
          transX: 0,
          transY: 0,
          glareX: 50,
          glareY: 50,
        };
        setTilt((p) => ({ ...p, isInteracting: false }));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, handleMouseMove, handleMouseLeave, maxTilt, maxTranslate, requestGyroPermission]);

  return { elementRef, tilt, requestGyroPermission };
}
