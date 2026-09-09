// Coherent, auto-calibrating global Gyroscope & Motion tracker for MUTE DEJOTA
// Works immediately on page load, auto-calibrates to any holding angle,
// and respects physical 3D orientation in both portrait and landscape.

export interface GyroData {
  tiltX: number;       // degrees [-maxTilt, maxTilt], coherent: tilt forward = rotX positive
  tiltY: number;       // degrees [-maxTilt, maxTilt], coherent: tilt right = rotY positive
  normX: number;       // [-1, 1]
  normY: number;       // [-1, 1]
  glareX: number;      // [0, 100]% specular highlight position
  glareY: number;      // [0, 100]% specular highlight position
  isGyroActive: boolean;
  needsPermission: boolean;
}

type GyroListener = (data: GyroData) => void;

class GyroscopeManager {
  private listeners = new Set<GyroListener>();
  private baseBeta: number | null = null;
  private baseGamma: number | null = null;
  private isListening = false;
  private isGyroActive = false;
  private needsPermission = false;
  private lastData: GyroData = {
    tiltX: 0,
    tiltY: 0,
    normX: 0,
    normY: 0,
    glareX: 50,
    glareY: 50,
    isGyroActive: false,
    needsPermission: false,
  };

  // Filtered values for ultra-smooth movement
  private currentTiltX = 0;
  private currentTiltY = 0;
  private targetTiltX = 0;
  private targetTiltY = 0;
  private animFrameId: number | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    // Check iOS permission requirement
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      this.needsPermission = true;
      this.lastData.needsPermission = true;
    }

    // Start listening immediately
    this.start();

    // Auto-request iOS permission on first touch/click anywhere on document
    const unlockOnGesture = () => {
      this.requestPermission();
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('touchstart', unlockOnGesture);
      window.removeEventListener('click', unlockOnGesture);
    };
    window.addEventListener('pointerdown', unlockOnGesture, { once: true, passive: true });
    window.addEventListener('touchstart', unlockOnGesture, { once: true, passive: true });
    window.addEventListener('click', unlockOnGesture, { once: true, passive: true });
  }

  public subscribe(listener: GyroListener): () => void {
    this.listeners.add(listener);
    listener(this.lastData);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === 'granted') {
          this.needsPermission = false;
          this.start();
          return true;
        }
      } catch (err) {
        console.warn('Gyroscope permission error:', err);
      }
      return false;
    }
    return true;
  }

  // Recalibrate center baseline to current holding angle
  public recalibrate() {
    this.baseBeta = null;
    this.baseGamma = null;
  }

  private start() {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;

    window.addEventListener('deviceorientation', this.handleOrientation, { passive: true });
    this.startSmoothingLoop();
  }

  private handleOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;

    if (!this.isGyroActive) {
      this.isGyroActive = true;
    }

    let rawBeta = e.beta;
    let rawGamma = e.gamma;

    // Screen orientation adaptation (portrait vs landscape)
    const orientation = window.screen?.orientation?.angle ?? (window.orientation as number) ?? 0;
    if (orientation === 90) {
      // Rotated 90° clockwise
      const temp = rawBeta;
      rawBeta = -rawGamma;
      rawGamma = temp;
    } else if (orientation === -90 || orientation === 270) {
      // Rotated 90° counter-clockwise
      const temp = rawBeta;
      rawBeta = rawGamma;
      rawGamma = -temp;
    } else if (orientation === 180) {
      rawBeta = -rawBeta;
      rawGamma = -rawGamma;
    }

    // Dynamic initial baseline auto-zeroing:
    // Wherever the user is holding the phone when opening, that angle is calibrated as "flat / center".
    if (this.baseBeta === null || this.baseGamma === null) {
      this.baseBeta = rawBeta;
      this.baseGamma = rawGamma;
    } else {
      // Gentle drift compensation (very slow low-pass filter to keep center stable as posture shifts)
      this.baseBeta += (rawBeta - this.baseBeta) * 0.002;
      this.baseGamma += (rawGamma - this.baseGamma) * 0.002;
    }

    // Calculate delta relative to user's calibrated resting angle
    const deltaBeta = rawBeta - this.baseBeta;
    const deltaGamma = rawGamma - this.baseGamma;

    // Angle sensitivity threshold (35° max swing is comfortable for natural hand rotation)
    const maxDegree = 35;
    const normY = Math.max(-1, Math.min(1, deltaBeta / maxDegree));
    const normX = Math.max(-1, Math.min(1, deltaGamma / maxDegree));

    // COHERENT PHYSICAL DIRECTION:
    // - Tilting top of phone away (beta increases, deltaBeta > 0):
    //   In CSS rotateX(positive) rotates top edge INTO the screen (-Z) away from user.
    //   This gives 100% coherent 3D depth!
    // - Tilting right side of phone away (gamma increases, deltaGamma > 0):
    //   In CSS rotateY(positive) brings left edge forward, pushes right edge into screen.
    const maxTilt = 18;
    this.targetTiltX = normY * maxTilt;
    this.targetTiltY = normX * maxTilt;
  };

  private startSmoothingLoop() {
    const lerp = (a: number, b: number, factor: number) => a + (b - a) * factor;

    const tick = () => {
      // Silky smooth interpolation (speed 0.18 gives snappy yet fluid response)
      this.currentTiltX = lerp(this.currentTiltX, this.targetTiltX, 0.18);
      this.currentTiltY = lerp(this.currentTiltY, this.targetTiltY, 0.18);

      const normX = Math.max(-1, Math.min(1, this.currentTiltY / 18));
      const normY = Math.max(-1, Math.min(1, this.currentTiltX / 18));

      // Specular highlight tracks natural light sheen opposite to tilt
      const glareX = Math.max(0, Math.min(100, 50 - normX * 42));
      const glareY = Math.max(0, Math.min(100, 50 - normY * 42));

      const updated: GyroData = {
        tiltX: Math.round(this.currentTiltX * 100) / 100,
        tiltY: Math.round(this.currentTiltY * 100) / 100,
        normX: Math.round(normX * 100) / 100,
        normY: Math.round(normY * 100) / 100,
        glareX: Math.round(glareX * 10) / 10,
        glareY: Math.round(glareY * 10) / 10,
        isGyroActive: this.isGyroActive,
        needsPermission: this.needsPermission,
      };

      this.lastData = updated;

      for (const listener of this.listeners) {
        listener(updated);
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  public getData(): GyroData {
    return this.lastData;
  }
}

// Global Singleton
export const gyroManager = new GyroscopeManager();
