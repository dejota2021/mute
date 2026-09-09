import { useState, useEffect, useRef, useCallback } from 'react';
import { gyroManager, GyroData } from '../utils/gyroscope';

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
  maxTranslate?: number; // max lateral translation in px, e.g. 14
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
  const isTouchOrMouseInteracting = useRef(false);
  const targetTiltRef = useRef({ rotX: 0, rotY: 0, transX: 0, transY: 0, glareX: 50, glareY: 50 });
  const animFrameRef = useRef<number | null>(null);

  // Subscribe to the global auto-calibrating gyroscope
  useEffect(() => {
    if (disabled) return;

    const unsubscribe = gyroManager.subscribe((gyro: GyroData) => {
      // If user is currently dragging with touch or moving mouse, let touch take precedence
      if (isTouchOrMouseInteracting.current) return;

      if (gyro.isGyroActive) {
        // Coherent scale to component's configured maxTilt & maxTranslate
        const scale = maxTilt / 18;
        const rotX = gyro.tiltX * scale;
        const rotY = gyro.tiltY * scale;
        const transX = gyro.normX * maxTranslate;
        const transY = gyro.normY * (maxTranslate * 0.85);

        targetTiltRef.current = {
          rotX,
          rotY,
          transX,
          transY,
          glareX: gyro.glareX,
          glareY: gyro.glareY,
        };
      }
    });

    return unsubscribe;
  }, [disabled, maxTilt, maxTranslate]);

  // Silky smooth lerp loop for all motion
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
        const speed = isTouchOrMouseInteracting.current ? 0.35 : 0.18;

        currentRotX = lerp(currentRotX, target.rotX, speed);
        currentRotY = lerp(currentRotY, target.rotY, speed);
        currentTransX = lerp(currentTransX, target.transX, speed);
        currentTransY = lerp(currentTransY, target.transY, speed);
        currentGlareX = lerp(currentGlareX, target.glareX, speed);
        currentGlareY = lerp(currentGlareY, target.glareY, speed);

        const gyroState = gyroManager.getData();

        setTilt((prev) => {
          const isActivelyMoving =
            Math.abs(prev.rotateX - currentRotX) > 0.04 ||
            Math.abs(prev.rotateY - currentRotY) > 0.04 ||
            prev.isGyroActive !== gyroState.isGyroActive;

          if (!isActivelyMoving && !prev.isInteracting && !gyroState.isGyroActive) {
            return prev;
          }

          return {
            ...prev,
            rotateX: Math.round(currentRotX * 100) / 100,
            rotateY: Math.round(currentRotY * 100) / 100,
            translateX: Math.round(currentTransX * 100) / 100,
            translateY: Math.round(currentTransY * 100) / 100,
            translateZ: prev.isInteracting || gyroState.isGyroActive ? 22 : 0,
            glareX: Math.round(currentGlareX * 10) / 10,
            glareY: Math.round(currentGlareY * 10) / 10,
            normX: currentRotY / (maxTilt || 1),
            normY: currentRotX / (maxTilt || 1),
            isGyroActive: gyroState.isGyroActive,
            needsPermission: gyroState.needsPermission,
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
    return gyroManager.requestPermission();
  }, []);

  // Mouse Move Handler (Desktop)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disabled || !elementRef.current) return;
      const gyroState = gyroManager.getData();
      // If mobile gyroscope is actively moving, ignore synthetic mouse events
      if (gyroState.isGyroActive) return;

      const rect = elementRef.current.getBoundingClientRect();
      const padding = 180; // Magnetic zone around element

      const isInside =
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding;

      if (!isInside) {
        targetTiltRef.current = {
          rotX: 0,
          rotY: 0,
          transX: 0,
          transY: 0,
          glareX: 50,
          glareY: 50,
        };
        isTouchOrMouseInteracting.current = false;
        setTilt((prev) => ({ ...prev, isInteracting: false }));
        return;
      }

      isTouchOrMouseInteracting.current = true;
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

      const glareX = Math.max(0, Math.min(100, 50 - clampedX * 42));
      const glareY = Math.max(0, Math.min(100, 50 - clampedY * 42));

      targetTiltRef.current = { rotX, rotY, transX, transY, glareX, glareY };
      setTilt((prev) => ({ ...prev, isInteracting: true }));
    },
    [disabled, maxTilt, maxTranslate]
  );

  const handleMouseLeave = useCallback(() => {
    isTouchOrMouseInteracting.current = false;
    if (disabled) return;
    const gyroState = gyroManager.getData();
    if (!gyroState.isGyroActive) {
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
  }, [disabled]);

  // Touch drag support
  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      gyroManager.requestPermission();
      if (e.touches.length > 0 && elementRef.current) {
        isTouchOrMouseInteracting.current = true;
        setTilt((p) => ({ ...p, isInteracting: true }));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && elementRef.current) {
        isTouchOrMouseInteracting.current = true;
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

        const glareX = Math.max(0, Math.min(100, 50 - clampedX * 40));
        const glareY = Math.max(0, Math.min(100, 50 - clampedY * 40));

        targetTiltRef.current = { rotX, rotY, transX, transY, glareX, glareY };
        setTilt((p) => ({ ...p, isInteracting: true }));
      }
    };

    const handleTouchEnd = () => {
      isTouchOrMouseInteracting.current = false;
      const gyroState = gyroManager.getData();
      if (!gyroState.isGyroActive) {
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

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, handleMouseMove, handleMouseLeave, maxTilt, maxTranslate]);

  return { elementRef, tilt, requestGyroPermission };
}
