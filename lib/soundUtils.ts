// Sound utility functions for notifications, messages, and other app sounds

export const generateTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);

  return audioContext;
};

export const playNotificationTone = () => {
  const tone = localStorage.getItem("notification_tone") || "gentle-bell";

  switch (tone) {
    case 'gentle-bell':
      generateTone(523, 1, 'triangle');
      setTimeout(() => generateTone(659, 1, 'triangle'), 200);
      break;

    case 'quick-beep':
      generateTone(1000, 0.2, 'square');
      setTimeout(() => generateTone(1200, 0.2, 'square'), 300);
      break;

    case 'crystal-bell':
      generateTone(1046, 0.8, 'sine');
      setTimeout(() => generateTone(1318, 0.8, 'sine'), 300);
      break;

    case 'digital-pulse':
      let pulseInterval = setInterval(() => {
        generateTone(880, 0.1, 'square');
      }, 150);
      setTimeout(() => clearInterval(pulseInterval), 600);
      break;

    default:
      generateTone(523, 1, 'triangle');
  }
};

export const playMessageTone = () => {
  const tone = localStorage.getItem("message_tone") || "quick-beep";

  switch (tone) {
    case 'quick-beep':
      generateTone(1000, 0.2, 'square');
      setTimeout(() => generateTone(1200, 0.2, 'square'), 300);
      break;

    case 'melody-chime':
      generateTone(523, 0.3, 'sine');
      setTimeout(() => generateTone(659, 0.3, 'sine'), 200);
      setTimeout(() => generateTone(783, 0.3, 'sine'), 400);
      break;

    case 'gentle-bell':
      generateTone(523, 1, 'triangle');
      setTimeout(() => generateTone(659, 1, 'triangle'), 200);
      break;

    case 'nature-chime':
      generateTone(440, 0.5, 'sine');
      setTimeout(() => generateTone(554, 0.5, 'sine'), 300);
      setTimeout(() => generateTone(659, 0.5, 'sine'), 600);
      break;

    default:
      generateTone(1000, 0.2, 'square');
  }
};

// Function to play any tone by type (used in settings preview)
export const playToneByType = (toneType: string) => {
  switch (toneType) {
    case 'normal-ring':
      setTimeout(() => generateTone(800, 0.5), 0);
      setTimeout(() => generateTone(800, 0.5), 600);
      setTimeout(() => generateTone(800, 0.5), 1200);
      setTimeout(() => generateTone(800, 0.5), 1800);
      break;

    case 'crystal-bell':
      generateTone(1046, 0.8, 'sine');
      setTimeout(() => generateTone(1318, 0.8, 'sine'), 300);
      setTimeout(() => generateTone(1567, 0.8, 'sine'), 600);
      break;

    case 'melody-chime':
      generateTone(523, 0.3, 'sine');
      setTimeout(() => generateTone(659, 0.3, 'sine'), 200);
      setTimeout(() => generateTone(783, 0.3, 'sine'), 400);
      setTimeout(() => generateTone(1046, 0.5, 'sine'), 600);
      break;

    case 'gentle-bell':
      generateTone(523, 1, 'triangle');
      setTimeout(() => generateTone(659, 1, 'triangle'), 200);
      break;

    case 'digital-pulse':
      let pulseInterval = setInterval(() => {
        generateTone(880, 0.1, 'square');
      }, 150);
      setTimeout(() => clearInterval(pulseInterval), 600);
      break;

    case 'piano-note':
      generateTone(261, 0.4, 'triangle');
      setTimeout(() => generateTone(329, 0.4, 'triangle'), 200);
      setTimeout(() => generateTone(392, 0.4, 'triangle'), 400);
      setTimeout(() => generateTone(523, 0.6, 'triangle'), 600);
      break;

    case 'quick-beep':
      generateTone(1000, 0.2, 'square');
      setTimeout(() => generateTone(1200, 0.2, 'square'), 300);
      break;

    case 'nature-chime':
      generateTone(440, 0.5, 'sine');
      setTimeout(() => generateTone(554, 0.5, 'sine'), 300);
      setTimeout(() => generateTone(659, 0.5, 'sine'), 600);
      setTimeout(() => generateTone(880, 0.7, 'sine'), 900);
      break;

    case 'trumpet-call':
      generateTone(523, 0.3, 'sawtooth');
      setTimeout(() => generateTone(659, 0.3, 'sawtooth'), 150);
      setTimeout(() => generateTone(783, 0.3, 'sawtooth'), 300);
      setTimeout(() => generateTone(1046, 0.6, 'sawtooth'), 450);
      break;

    case 'orchestra-hit':
      generateTone(146, 0.4, 'sawtooth');
      setTimeout(() => generateTone(220, 0.4, 'sawtooth'), 100);
      setTimeout(() => generateTone(293, 0.4, 'sawtooth'), 200);
      setTimeout(() => generateTone(440, 0.8, 'sawtooth'), 300);
      break;

    case 'whatsapp-connecting':
      let interval = setInterval(() => {
        generateTone(440, 0.1);
      }, 200);
      setTimeout(() => clearInterval(interval), 2000);
      break;

    default:
      generateTone(523, 0.5, 'sine');
  }
};