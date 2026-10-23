// Web Audio API Synthesizer for Turn Bell Chime and Spanish Voice announcement

export function playQueueChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.4);       // D5
    playTone(880.00, now + 0.25, 0.8); // A5
  } catch (e) {
    console.warn('Audio chime could not be played:', e);
  }
}

export function speakTurn(ticketCode, clientName = '') {
  try {
    playQueueChime();
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const text = `Turno número ${ticketCode.replace('-', ' ')}${clientName ? ', ' + clientName : ''}, por favor acercarse a la estación de atención.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-CO'; // Colombian Spanish
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }, 500);
    }
  } catch (e) {
    console.warn('Speech synthesis not available:', e);
  }
}

