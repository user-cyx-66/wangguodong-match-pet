/* Original procedural music and effects: no downloads or audio-file dependencies. */
(function () {
  'use strict';
  class CozyAudio {
    constructor() { this.context = null; this.music = true; this.effects = true; this.volume = .45; this.paused = false; this.timer = null; this.step = 0; this.notesPlayed = 0; this.effectCount = 0; }
    unlock() {
      try {
        if (!this.context) {
          const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
          const c = this.context = new A();
          this.master = c.createGain(); this.master.gain.value = this.volume;
          const compressor = c.createDynamicsCompressor(); compressor.threshold.value = -15; compressor.ratio.value = 5;
          this.master.connect(compressor).connect(c.destination);
          this.musicBus = c.createGain(); this.musicBus.gain.value = this.music ? 1 : 0; this.musicBus.connect(this.master);
          this.fxBus = c.createGain(); this.fxBus.connect(this.master);
          this.noise = c.createBuffer(1, c.sampleRate * .26 | 0, c.sampleRate);
          const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        if (!this.paused) this.context.resume().catch(() => {});
        this.schedule();
      } catch { /* A device without audio can still play the entire game. */ }
    }
    configure({ music, sound, volume }) {
      this.music = music; this.effects = sound; this.volume = Math.max(0, Math.min(.8, Number(volume) || 0));
      if (this.context) {
        this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .08);
        this.musicBus.gain.setTargetAtTime(this.music && !this.paused ? 1 : 0, this.context.currentTime, .15);
        this.schedule();
      }
    }
    setPaused(paused) {
      this.paused = paused;
      if (!this.context) return;
      this.musicBus.gain.setTargetAtTime(this.music && !paused ? 1 : 0, this.context.currentTime, .1);
      if (paused) { clearInterval(this.timer); this.timer = null; this.context.suspend().catch(() => {}); }
      else { this.context.resume().catch(() => {}); this.schedule(); }
    }
    tone(midi, start, duration, gain = .1, bus = this.musicBus, bright = false) {
      const c = this.context, hz = 440 * 2 ** ((midi - 69) / 12);
      // A soft fundamental with short upper partials makes a small felt-piano sound.
      for (const [partial, strength] of [[1, 1], [2, bright ? .22 : .11], [3, .04]]) {
        const osc = c.createOscillator(), envelope = c.createGain(); osc.type = 'sine'; osc.frequency.value = hz * partial;
        envelope.gain.setValueAtTime(.00001, start); envelope.gain.exponentialRampToValueAtTime(gain * strength, start + .008);
        envelope.gain.exponentialRampToValueAtTime(.00001, start + duration / Math.sqrt(partial));
        osc.connect(envelope).connect(bus); osc.start(start); osc.stop(start + duration + .02);
      }
    }
    schedule() {
      if (!this.context || this.paused || !this.music || this.timer) return;
      this.next = this.context.currentTime + .08;
      const tick = () => {
        if (!this.music || this.paused) { clearInterval(this.timer); this.timer = null; return; }
        const chords = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 62]];
        const melody = [76, null, 79, 81, 79, 76, 74, null, 72, null, 76, 79, 76, 74, 72, null,
          69, null, 72, 76, 79, null, 76, 72, 71, null, 74, 79, 76, 74, 72, null];
        while (this.next < this.context.currentTime + .22) {
          const beat = this.step % 16, chord = chords[Math.floor(this.step / 16) % 4], t = this.next;
          if (beat === 0 || beat === 8) this.tone(chord[0] - 12, t, 2.2, .16);
          if (beat % 4 === 0) chord.slice(1).forEach((n, i) => this.tone(n, t + i * .035, 1.6, .047));
          if (beat % 2 === 1) this.tone(chord[1 + (beat / 2 | 0) % 3], t, .65, .035);
          const n = melody[this.step % 32];
          if (n !== null) this.tone(n + (Math.floor(this.step / 64) % 2 ? -12 : 0), t, .85, .075);
          this.step++; this.notesPlayed++; this.next += 60 / 86 / 2;
        }
      };
      this.timer = setInterval(tick, 90); tick();
    }
    blast(power = 1) {
      const c = this.context, t = c.currentTime, noise = c.createBufferSource(), filter = c.createBiquadFilter(), envelope = c.createGain();
      noise.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(2200, t); filter.frequency.exponentialRampToValueAtTime(250, t + .22);
      envelope.gain.setValueAtTime(Math.min(.3, .12 + power * .035), t); envelope.gain.exponentialRampToValueAtTime(.0001, t + .25);
      noise.connect(filter).connect(envelope).connect(this.fxBus); noise.start(t); noise.stop(t + .26);
      this.tone(40, t, .3, .24, this.fxBus);
    }
    play(kind = 'match', chain = 1, count = 3) {
      if (!this.effects) return; this.unlock(); if (!this.context || this.paused) return;
      this.effectCount++; const t = this.context.currentTime, bus = this.fxBus;
      if (kind === 'invalid') { this.tone(48, t, .11, .09, bus); return; }
      if (kind === 'touch') { [76, 81].forEach((n, i) => this.tone(n, t + i * .08, .27, .1, bus)); return; }
      if (kind === 'win') { [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => this.tone(n, t + i * .075, .8, .14, bus, true)); return; }
      if (kind === 'special' || count >= 10) this.blast(Math.min(5, count / 8));
      const scale = [72, 74, 76, 79, 81, 84, 86, 88];
      const hits = kind === 'pop' ? Math.min(12, Math.max(3, count)) : Math.min(7, 3 + chain);
      for (let i = 0; i < hits; i++) this.tone(scale[(i + Math.min(chain - 1, 4)) % scale.length], t + i * (kind === 'pop' ? .025 : .045), .26, .13, bus, true);
    }
  }
  window.CozyAudio = CozyAudio;
})();
