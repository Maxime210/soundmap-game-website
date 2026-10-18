class SoundmapGame {
    constructor() {
        this.totalRounds = 10;
        this.score = 0;
        this.roundIndex = 0;
        this.tracks = [];
        this.currentTrack = null;
        this.answered = false;
        this.audioContext = null;
        this.audioNodes = [];
        this.audioTimer = null;

        this.startButton = document.getElementById('start-btn');
        this.nextButton = document.getElementById('next-btn');
        this.playButton = document.getElementById('play-btn');
        this.form = document.getElementById('guess-form');
        this.songInput = document.getElementById('song-guess');
        this.artistInput = document.getElementById('artist-guess');
        this.formHint = document.getElementById('form-hint');
        this.status = document.getElementById('feedback');
        this.scoreDisplay = document.getElementById('score');
        this.bestScoreDisplay = document.getElementById('best-score');
        this.roundDisplay = document.getElementById('round-number');
        this.tracksPlayedDisplay = document.getElementById('tracks-played');
        this.progress = document.querySelector('.progress-track');
        this.progressFill = document.getElementById('progress-fill');
        this.listeningArt = document.getElementById('listening-art');
        this.playerTitle = document.getElementById('player-title');
        this.playerSubtitle = document.getElementById('player-subtitle');
        this.clipLength = document.getElementById('clip-length');

        this.startButton.addEventListener('click', () => this.startGame());
        this.nextButton.addEventListener('click', () => this.nextRound());
        this.playButton.addEventListener('click', () => this.playClip());
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.submitGuess();
        });

        document.getElementById('round-total').textContent = this.totalRounds;
        this.progress.setAttribute('aria-valuemax', this.totalRounds);
        this.bestScoreDisplay.textContent = this.loadBestScore();
        this.updateScore();
    }

    getCatalog() {
        return [
            { title: 'Ode to Joy', artist: 'Ludwig van Beethoven', notes: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62] },
            { title: 'Für Elise', artist: 'Ludwig van Beethoven', notes: [76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72] },
            { title: 'Turkish March', artist: 'Wolfgang Amadeus Mozart', notes: [69, 71, 72, 74, 76, 74, 72, 71, 69, 68, 69, 72, 76, 69, 71, 72] },
            { title: 'Eine kleine Nachtmusik', artist: 'Wolfgang Amadeus Mozart', notes: [67, 74, 79, 74, 67, 74, 79, 74, 79, 74, 71, 74, 79, 74, 67] },
            { title: 'Minuet in G major', artist: 'Christian Petzold', notes: [74, 67, 69, 71, 72, 74, 67, 67, 76, 72, 74, 76, 78, 79, 79] },
            { title: 'Spring', artist: 'Antonio Vivaldi', notes: [76, 76, 76, 72, 74, 74, 74, 71, 72, 72, 72, 69, 71, 71, 71] },
            { title: 'The Entertainer', artist: 'Scott Joplin', notes: [72, 74, 76, 72, 60, 64, 67, 72, 74, 76, 77, 76, 74, 72, 67] },
            { title: 'Swan Lake', artist: 'Pyotr Ilyich Tchaikovsky', notes: [71, 78, 74, 71, 69, 67, 69, 71, 74, 78, 76, 74, 71, 69, 67] },
            { title: 'Canon in D', artist: 'Johann Pachelbel', notes: [62, 66, 69, 74, 73, 66, 69, 73, 71, 64, 67, 71, 69, 62, 66] },
            { title: 'Greensleeves', artist: 'Traditional', notes: [69, 72, 74, 76, 77, 76, 74, 71, 67, 69, 71, 72, 74, 69, 69] }
        ];
    }

    startGame() {
        this.stopClip();
        this.score = 0;
        this.roundIndex = 0;
        this.tracks = this.shuffle(this.getCatalog()).slice(0, this.totalRounds);
        this.startButton.hidden = true;
        this.nextButton.hidden = true;
        this.status.hidden = true;
        this.updateScore();
        this.loadRound();
    }

    loadRound() {
        this.stopClip();
        this.currentTrack = this.tracks[this.roundIndex];
        this.answered = false;
        const round = this.roundIndex + 1;

        this.roundDisplay.textContent = round;
        this.updateProgress(round - 1);
        this.tracksPlayedDisplay.innerHTML = `${round - 1} <small>/ ${this.totalRounds}</small>`;
        this.playerTitle.textContent = `Mystery track ${String(round).padStart(2, '0')}`;
        this.playerSubtitle.textContent = 'Synthesized melody · tap to listen';
        this.clipLength.textContent = '0:03';
        this.playButton.disabled = false;
        this.playButton.setAttribute('aria-label', 'Play audio clip');
        this.listeningArt.classList.remove('is-playing');
        this.songInput.value = '';
        this.artistInput.value = '';
        this.songInput.disabled = false;
        this.artistInput.disabled = false;
        this.form.querySelector('#submit-guess').disabled = false;
        this.formHint.textContent = 'You can replay the clip as many times as you like.';
        this.status.hidden = true;
        this.nextButton.hidden = true;
        this.songInput.focus({ preventScroll: true });
    }

    async playClip() {
        if (!this.currentTrack || this.answered || this.playButton.disabled) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            this.showFeedback('Audio playback is not supported in this browser. You can still make a guess and play the game.', 'incorrect');
            return;
        }

        try {
            if (!this.audioContext) this.audioContext = new AudioContextClass();
            if (this.audioContext.state === 'suspended') await this.audioContext.resume();
            this.scheduleMelody(this.currentTrack.notes);
        } catch (error) {
            console.error('Could not play the demo clip:', error);
            this.playerSubtitle.textContent = 'Audio could not start — check your browser sound settings';
            this.showFeedback('The demo audio could not start. Check your browser sound settings, then try the play button again.', 'incorrect');
        }
    }

    scheduleMelody(notes) {
        this.stopClip();
        const startAt = this.audioContext.currentTime + 0.06;
        const beat = 0.235;
        this.audioNodes = [];
        this.listeningArt.classList.add('is-playing');
        this.playButton.disabled = true;
        this.playButton.setAttribute('aria-label', 'Audio clip is playing');
        this.playerSubtitle.textContent = 'Listen closely…';

        notes.forEach((note, index) => {
            const start = startAt + index * beat;
            const oscillator = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();
            oscillator.type = index % 4 === 0 ? 'sine' : 'triangle';
            oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), start);
            envelope.gain.setValueAtTime(0.0001, start);
            envelope.gain.linearRampToValueAtTime(0.075, start + 0.018);
            envelope.gain.setValueAtTime(0.05, start + beat * 0.57);
            envelope.gain.exponentialRampToValueAtTime(0.0001, start + beat * 0.88);
            oscillator.connect(envelope);
            envelope.connect(this.audioContext.destination);
            oscillator.start(start);
            oscillator.stop(start + beat * 0.9);
            this.audioNodes.push(oscillator);
        });

        const duration = (notes.length * beat + 0.18) * 1000;
        this.audioTimer = window.setTimeout(() => {
            this.audioNodes = [];
            this.audioTimer = null;
            this.listeningArt.classList.remove('is-playing');
            this.playButton.disabled = false;
            this.playButton.setAttribute('aria-label', 'Replay audio clip');
            this.playerSubtitle.textContent = 'Clip finished · listen again or make your guess';
        }, duration);
    }

    stopClip() {
        if (this.audioTimer !== null) {
            window.clearTimeout(this.audioTimer);
            this.audioTimer = null;
        }
        for (const node of this.audioNodes) {
            try {
                node.stop();
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'InvalidStateError')) throw error;
            }
        }
        this.audioNodes = [];
        this.listeningArt.classList.remove('is-playing');
        this.playButton.disabled = !this.currentTrack || this.answered;
        this.playButton.setAttribute('aria-label', 'Play audio clip');
    }

    submitGuess() {
        if (!this.currentTrack || this.answered) return;

        const songGuess = this.normalize(this.songInput.value);
        const artistGuess = this.normalize(this.artistInput.value);
        if (!songGuess && !artistGuess) {
            this.formHint.textContent = 'Add a song title or artist before locking in your guess.';
            this.formHint.classList.add('is-error');
            this.songInput.focus();
            return;
        }

        this.formHint.classList.remove('is-error');
        this.stopClip();
        this.answered = true;
        const songCorrect = songGuess === this.normalize(this.currentTrack.title);
        const artistCorrect = artistGuess === this.normalize(this.currentTrack.artist);
        const points = (songCorrect ? 100 : 0) + (artistCorrect ? 50 : 0);
        this.score += points;
        this.updateScore();
        this.updateProgress(this.roundIndex + 1);
        this.tracksPlayedDisplay.innerHTML = `${this.roundIndex + 1} <small>/ ${this.totalRounds}</small>`;

        let result;
        if (songCorrect && artistCorrect) result = `Perfect ear! You got the track and composer. +${points} points.`;
        else if (songCorrect) result = `Right track, wrong artist. The artist is ${this.currentTrack.artist}. +${points} points.`;
        else if (artistCorrect) result = `Right artist! The track is “${this.currentTrack.title}”. +${points} points.`;
        else result = `The track was “${this.currentTrack.title}” by ${this.currentTrack.artist}. +0 points this round.`;

        this.showFeedback(result, points ? 'correct' : 'incorrect');
        this.songInput.disabled = true;
        this.artistInput.disabled = true;
        this.form.querySelector('#submit-guess').disabled = true;
        this.playerTitle.textContent = this.currentTrack.title;
        this.playerSubtitle.textContent = `by ${this.currentTrack.artist}`;
        this.nextButton.textContent = this.roundIndex === this.totalRounds - 1 ? 'See final score →' : 'Next track →';
        this.nextButton.hidden = false;
        this.nextButton.focus({ preventScroll: true });
    }

    nextRound() {
        if (!this.answered) return;
        this.roundIndex += 1;
        if (this.roundIndex >= this.totalRounds) {
            this.endGame();
            return;
        }
        this.loadRound();
    }

    endGame() {
        this.stopClip();
        this.currentTrack = null;
        this.updateProgress(this.totalRounds);
        this.roundDisplay.textContent = this.totalRounds;
        this.tracksPlayedDisplay.innerHTML = `${this.totalRounds} <small>/ ${this.totalRounds}</small>`;
        this.playerTitle.textContent = 'That’s the session';
        this.playerSubtitle.textContent = 'Thanks for listening';
        this.clipLength.textContent = '—';
        this.songInput.disabled = true;
        this.artistInput.disabled = true;
        this.form.querySelector('#submit-guess').disabled = true;
        this.formHint.textContent = 'Play again for a fresh set of demo tracks.';
        this.startButton.textContent = 'Play again';
        this.startButton.hidden = false;
        this.nextButton.hidden = true;
        this.showFeedback(`Session complete! You scored ${this.score} out of ${this.totalRounds * 150} points.`, 'correct');
        this.saveBestScore();
    }

    updateProgress(completed) {
        this.progress.setAttribute('aria-valuenow', completed);
        this.progressFill.style.width = `${(completed / this.totalRounds) * 100}%`;
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
    }

    showFeedback(message, result) {
        this.status.textContent = message;
        this.status.classList.toggle('is-incorrect', result === 'incorrect');
        this.status.hidden = false;
    }

    normalize(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    shuffle(items) {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    }

    loadBestScore() {
        try {
            return Number(window.localStorage.getItem('soundmap-best-score')) || 0;
        } catch (error) {
            console.warn('Could not read the saved best score:', error);
            return 0;
        }
    }

    saveBestScore() {
        const best = this.loadBestScore();
        if (this.score <= best) return;
        try {
            window.localStorage.setItem('soundmap-best-score', String(this.score));
            this.bestScoreDisplay.textContent = this.score;
        } catch (error) {
            console.warn('Could not save the best score:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.soundmapGame = new SoundmapGame();
});
