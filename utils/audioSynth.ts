
export class PresentationAudio {
  public ctx: AudioContext;
  private destination: AudioNode;
  private masterGain: GainNode;
  private voiceGain: GainNode;
  private nodes: AudioNode[] = []; 
  public streamDestination: MediaStreamAudioDestinationNode | null = null;
  
  // Scheduling state
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;

  private voiceSource: AudioBufferSourceNode | null = null;

  // C Major Pentatonic Scale
  private scale = [
    261.63, 293.66, 329.63, 392.00, 440.00, 
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50
  ];

  constructor(forExport: boolean = false) {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5; // Music volume

    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.value = 1.0; // Voice is louder

    // Connect voice to destination directly (or mix if needed)
    // We want voice to be part of the export stream too.

    if (forExport) {
      this.streamDestination = this.ctx.createMediaStreamDestination();
      this.destination = this.streamDestination;
    } else {
      this.destination = this.ctx.destination;
    }

    this.masterGain.connect(this.destination);
    this.voiceGain.connect(this.destination);
  }

  async start() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    if (!this.isPlaying) {
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.5;
        this.scheduleAmbientPiano();
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }

    // Stop generated music nodes
    this.nodes.forEach(node => {
      try { (node as any).stop?.(); } catch (e) {}
      try { node.disconnect(); } catch (e) {}
    });
    this.nodes = [];
    
    // Stop voice if playing
    if (this.voiceSource) {
        try { this.voiceSource.stop(); } catch(e){}
        try { this.voiceSource.disconnect(); } catch(e){}
        this.voiceSource = null;
    }

    try { this.masterGain.disconnect(); } catch(e) {}
    try { this.voiceGain.disconnect(); } catch(e) {}

    if (this.ctx.state !== 'closed') {
        this.ctx.close();
    }
  }

  // --- TTS Handling ---

  async playSpeech(base64Pcm: string) {
    if (!base64Pcm) return;

    try {
        // Stop previous voice
        if (this.voiceSource) {
            try { this.voiceSource.stop(); } catch(e) {}
            this.voiceSource = null;
        }

        // Decode Raw PCM (Gemini format: 24kHz, 1 channel, Int16)
        const binaryString = atob(base64Pcm);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const sampleRate = 24000;
        const buffer = this.ctx.createBuffer(1, dataInt16.length, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < dataInt16.length; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.voiceGain);
        source.start(this.ctx.currentTime + 0.5); // Slight delay to start after music logic
        this.voiceSource = source;

    } catch (e) {
        console.error("Error decoding/playing speech:", e);
    }
  }

  // --- Generative Piano Logic ---

  private scheduleAmbientPiano() {
      const lookahead = 0.1;
      const scheduleAheadTime = 1.0; 

      const scheduler = () => {
          if (!this.isPlaying) return;

          while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
              this.playRandomPianoNote(this.nextNoteTime);
              this.nextNoteTime += 2.0 + Math.random() * 2.5;
          }
          
          this.timerID = window.setTimeout(scheduler, lookahead * 1000);
      };
      
      scheduler();
  }

  private playRandomPianoNote(time: number) {
      const freq = this.scale[Math.floor(Math.random() * this.scale.length)];
      this.playPianoTone(freq, time);

      if (Math.random() < 0.3) {
          const idx = this.scale.indexOf(freq);
          if (idx + 2 < this.scale.length) {
              this.playPianoTone(this.scale[idx + 2], time);
          }
      }
  }

  private playPianoTone(freq: number, time: number) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4, time); 
      filter.frequency.exponentialRampToValueAtTime(freq, time + 0.5); 

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.03, time + 0.02); 
      gain.gain.exponentialRampToValueAtTime(0.001, time + 4.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 4.5);

      this.nodes.push(osc);
      this.nodes.push(gain);
      this.nodes.push(filter);
  }

  public triggerTransition() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1); 
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.3);  
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.4);

    this.nodes.push(osc);
    this.nodes.push(gain);
  }
}