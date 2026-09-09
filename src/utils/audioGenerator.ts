// Generates a cinematic, gothic, ambient drone track for MUTE DEJOTA with Web Audio API
// Encoded as a loopable WAV buffer Data URI so <audio> and Web Audio both work seamlessly
export function generateAtmosphericAudioUri(): string {
  const sampleRate = 22050;
  const durationSeconds = 12; // 12-second loop
  const totalSamples = sampleRate * durationSeconds;

  // Create 16-bit PCM WAV
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  // Generate gothic dark ambient audio:
  // Low resonant sub-bass drone (D2 = ~73.4Hz, A1 = ~55Hz, D1 = ~36.7Hz) + subtle vinyl tape warmth
  const baseFreq = 73.42; // D note
  const fifthFreq = 110.0; // A note
  const octaveSub = 36.71; // D sub
  const minorThird = 87.31; // F note (minor, dark mood)

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Slow atmospheric LFO modulation (0.1Hz breathing)
    const lfoBreathing = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.0833 * t);
    const slowSweep = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.166 * t + 1.2);

    // Warm sub-bass + harmonics
    const sub = Math.sin(2 * Math.PI * octaveSub * t) * 0.35;
    const tonic = Math.sin(2 * Math.PI * baseFreq * t) * 0.25;
    const fifth = Math.sin(2 * Math.PI * fifthFreq * t) * 0.15 * slowSweep;
    const darkThird = Math.sin(2 * Math.PI * minorThird * t) * 0.12 * (1 - slowSweep);

    // Subtle dark tape saturation warmth
    const noise = (Math.random() * 2 - 1) * 0.015;

    // Combine layers with smooth loop envelope at boundaries
    let sample = (sub + tonic + fifth + darkThird + noise) * lfoBreathing;

    // Crossfade edges (0.5s fade in/out for seamless loop)
    const edge = 0.5;
    if (t < edge) {
      sample *= (t / edge);
    } else if (t > durationSeconds - edge) {
      sample *= ((durationSeconds - t) / edge);
    }

    // Soft clipping / warmth
    sample = Math.max(-0.95, Math.min(0.95, sample * 1.6));

    // Convert to 16-bit PCM integer (-32768 to 32767)
    const int16 = Math.floor(sample * 32767);
    view.setInt16(44 + i * 2, int16, true);
  }

  // Convert buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}
