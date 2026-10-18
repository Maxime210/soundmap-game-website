class SoundmapGame {
    constructor() {
        this.spotifyClientId = '8bedcf805e4d487e98cfda4422f30a9d';
        this.spotifyRedirectUri = `${window.location.origin}${window.location.pathname}`;
        this.totalRounds = 10;
        this.score = 0;
        this.roundIndex = 0;
        this.tracks = [];
        this.currentTrack = null;
        this.answered = false;
        this.previewAudio = new Audio();
        this.spotifyToken = null;

        this.startButton = document.getElementById('start-btn');
        this.spotifyButton = document.getElementById('spotify-btn');
        this.spotifyStatus = document.getElementById('spotify-status');
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
        this.audioSourceCaption = document.getElementById('audio-source-caption');
        this.spotifyTrackLink = document.getElementById('spotify-track-link');

        this.startButton.addEventListener('click', () => this.startGame());
        this.spotifyButton.addEventListener('click', () => this.spotifyToken ? this.disconnectSpotify() : this.connectSpotify());
        this.nextButton.addEventListener('click', () => this.nextRound());
        this.playButton.addEventListener('click', () => this.playClip());
        this.previewAudio.addEventListener('ended', () => {
            this.listeningArt.classList.remove('is-playing');
            this.playButton.disabled = this.answered;
            this.playButton.setAttribute('aria-label', 'Replay audio preview');
            this.playerSubtitle.textContent = 'Preview finished · listen again or make your guess';
        });
        this.previewAudio.addEventListener('error', () => {
            this.playerSubtitle.textContent = 'Spotify preview is unavailable';
            this.skipUnavailablePreview();
        });
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.submitGuess();
        });

        document.getElementById('round-total').textContent = this.totalRounds;
        this.progress.setAttribute('aria-valuemax', this.totalRounds);
        this.bestScoreDisplay.textContent = this.loadBestScore();
        this.updateScore();
        this.handleSpotifyCallback();
    }

    async startGame() {
        if (!this.spotifyToken) {
            this.spotifyStatus.textContent = 'Connect Spotify first, then start the game. Only Spotify-provided previews are played.';
            this.spotifyButton.focus();
            return;
        }

        this.score = 0;
        this.roundIndex = 0;
        this.totalRounds = 10;
        document.getElementById('round-total').textContent = this.totalRounds;
        this.progress.setAttribute('aria-valuemax', this.totalRounds);
        this.startButton.disabled = true;
        this.status.hidden = true;
        this.spotifyStatus.textContent = 'Searching Spotify for tracks with preview audio…';
        try {
            const candidates = await this.fetchSpotifyTracks();
            this.spotifyStatus.textContent = 'Checking that Spotify previews can actually play…';
            this.tracks = await this.keepPlayablePreviews(candidates);
        } catch (error) {
            console.error('Could not load Spotify previews:', error);
            this.startButton.disabled = false;
            this.spotifyStatus.textContent = error.message;
            return;
        }

        if (this.tracks.length === 0) {
            this.startButton.disabled = false;
            this.spotifyStatus.textContent = 'Spotify did not return any previews that can be played right now. Try again later; tracks without playable preview audio are skipped.';
            return;
        }

        this.tracks = this.shuffle(this.tracks);
        this.totalRounds = this.tracks.length;
        document.getElementById('round-total').textContent = this.totalRounds;
        this.progress.setAttribute('aria-valuemax', this.totalRounds);
        this.spotifyStatus.textContent = this.totalRounds < 10
            ? `Found ${this.totalRounds} Spotify preview${this.totalRounds === 1 ? '' : 's'} that can play. Only playable Spotify previews are included.`
            : 'Spotify previews are ready for this session.';
        this.startButton.disabled = false;
        this.startButton.hidden = true;
        this.nextButton.hidden = true;
        this.updateScore();
        this.loadRound();
    }

    async fetchSpotifyTracks() {
        const queries = ['popular music', 'pop music', 'rock music', 'indie music', 'new music'];
        const found = new Map();

        for (const query of queries) {
            const parameters = new URLSearchParams({
                q: query,
                type: 'track',
                limit: '10',
                offset: '0'
            });
            const response = await fetch(`https://api.spotify.com/v1/search?${parameters}`, {
                headers: { Authorization: `Bearer ${this.spotifyToken}` }
            });

            if (response.status === 401) {
                this.spotifyToken = null;
                this.updateSpotifyConnection(false);
                throw new Error('Your Spotify session expired. Reconnect Spotify to use previews.');
            }
            if (response.status === 403) {
                throw new Error('Spotify denied access. Check that your Spotify app is in Development Mode and your account is allowed.');
            }
            if (!response.ok) {
                const responseText = await response.text();
                let details = responseText;
                try {
                    const errorBody = JSON.parse(responseText);
                    details = errorBody.error?.message ?? responseText;
                } catch (error) {
                    if (!(error instanceof SyntaxError)) throw error;
                }
                throw new Error(`Spotify search failed for “${query}” (HTTP ${response.status}): ${details || 'No details returned.'}`);
            }

            const data = await response.json();
            for (const track of data.tracks?.items ?? []) {
                if (!track.preview_url || !track.name || !track.artists?.length || !track.id || found.has(track.id)) continue;
                found.set(track.id, {
                    title: track.name,
                    artist: track.artists.map((artist) => artist.name).join(', '),
                    previewUrl: track.preview_url,
                    spotifyUrl: track.external_urls?.spotify
                });
            }
            if (found.size >= this.totalRounds) break;
        }

        return [...found.values()];
    }

    async keepPlayablePreviews(candidates) {
        const playable = [];
        const batchSize = 4;

        for (let index = 0; index < candidates.length && playable.length < this.totalRounds; index += batchSize) {
            const batch = candidates.slice(index, index + batchSize);
            const results = await Promise.all(batch.map(async (track) => ({
                track,
                playable: await this.canPlayPreview(track.previewUrl)
            })));
            playable.push(...results.filter((result) => result.playable).map((result) => result.track));
        }

        return playable.slice(0, this.totalRounds);
    }

    canPlayPreview(url) {
        return new Promise((resolve) => {
            const audio = new Audio();
            let settled = false;
            const finish = (playable) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeout);
                audio.removeEventListener('canplay', onCanPlay);
                audio.removeEventListener('error', onError);
                audio.removeAttribute('src');
                audio.load();
                resolve(playable);
            };
            const onCanPlay = () => finish(audio.readyState >= 3);
            const onError = () => finish(false);
            const timeout = window.setTimeout(() => finish(false), 5000);

            audio.preload = 'auto';
            audio.addEventListener('canplay', onCanPlay, { once: true });
            audio.addEventListener('error', onError, { once: true });
            audio.src = url;
            audio.load();
        });
    }

    async connectSpotify() {
        try {
            if (!window.isSecureContext || !window.crypto?.subtle) {
                throw new Error('Spotify sign-in requires the secure HTTPS website.');
            }

            const verifier = this.randomString(64);
            const state = this.randomString(32);
            sessionStorage.setItem('soundmap-spotify-verifier', verifier);
            sessionStorage.setItem('soundmap-spotify-state', state);
            const challengeDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
            const challenge = this.base64UrlEncode(challengeDigest);
            const authorizeUrl = new URL('https://accounts.spotify.com/authorize');
            authorizeUrl.search = new URLSearchParams({
                client_id: this.spotifyClientId,
                response_type: 'code',
                redirect_uri: this.spotifyRedirectUri,
                code_challenge_method: 'S256',
                code_challenge: challenge,
                state
            });
            window.location.assign(authorizeUrl);
        } catch (error) {
            console.error('Could not start Spotify sign-in:', error);
            this.spotifyStatus.textContent = error.message;
        }
    }

    async handleSpotifyCallback() {
        const parameters = new URLSearchParams(window.location.search);
        const code = parameters.get('code');
        const returnedState = parameters.get('state');
        const spotifyError = parameters.get('error');
        if (!code && !spotifyError) return;
        window.history.replaceState({}, document.title, this.spotifyRedirectUri);

        try {
            if (spotifyError) {
                throw new Error(`Spotify sign-in was not completed (${spotifyError}). Check that this exact Redirect URI is registered in your Spotify Developer Dashboard: ${this.spotifyRedirectUri}`);
            }
            const expectedState = sessionStorage.getItem('soundmap-spotify-state');
            const verifier = sessionStorage.getItem('soundmap-spotify-verifier');
            sessionStorage.removeItem('soundmap-spotify-state');
            sessionStorage.removeItem('soundmap-spotify-verifier');
            if (!expectedState || returnedState !== expectedState || !verifier) {
                throw new Error('Spotify sign-in could not be verified. Please connect again.');
            }

            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.spotifyClientId,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.spotifyRedirectUri,
                    code_verifier: verifier
                })
            });
            if (!response.ok) {
                const details = await response.text();
                throw new Error(`Spotify token request failed (HTTP ${response.status}). Confirm the registered Redirect URI exactly matches ${this.spotifyRedirectUri}. ${details}`);
            }
            const token = await response.json();
            this.spotifyToken = token.access_token;
            this.updateSpotifyConnection(true);
            this.spotifyStatus.textContent = 'Spotify connected. Start a game to look for available track previews.';
        } catch (error) {
            console.error('Spotify sign-in failed:', error);
            this.spotifyStatus.textContent = error.message;
        }
    }

    disconnectSpotify() {
        this.stopClip();
        this.spotifyToken = null;
        this.updateSpotifyConnection(false);
        this.spotifyStatus.textContent = 'Spotify disconnected. Connect again to play Spotify previews.';
        if (this.currentTrack && !this.answered) {
            this.currentTrack = null;
            this.startButton.hidden = false;
            this.nextButton.hidden = true;
            this.playButton.disabled = true;
            this.songInput.disabled = true;
            this.artistInput.disabled = true;
            this.form.querySelector('#submit-guess').disabled = true;
        }
    }

    updateSpotifyConnection(connected) {
        this.spotifyButton.classList.toggle('is-connected', connected);
        this.spotifyButton.innerHTML = connected
            ? 'Disconnect Spotify <span aria-hidden="true">×</span>'
            : 'Connect Spotify <span aria-hidden="true">♫</span>';
    }

    randomString(length) {
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        return this.base64UrlEncode(bytes);
    }

    base64UrlEncode(bytes) {
        return btoa(String.fromCharCode(...new Uint8Array(bytes)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    loadRound() {
        this.stopClip();
        this.currentTrack = this.tracks[this.roundIndex];
        if (!this.currentTrack?.previewUrl) {
            throw new Error('A track without a Spotify preview cannot be loaded.');
        }
        this.answered = false;
        const round = this.roundIndex + 1;

        this.roundDisplay.textContent = round;
        this.updateProgress(round - 1);
        this.tracksPlayedDisplay.innerHTML = `${round - 1} <small>/ ${this.totalRounds}</small>`;
        this.playerTitle.textContent = `Mystery track ${String(round).padStart(2, '0')}`;
        this.playerSubtitle.textContent = 'Spotify preview · tap to listen';
        this.clipLength.textContent = '0:30';
        this.audioSourceCaption.textContent = 'SPOTIFY TRACK PREVIEW';
        this.previewAudio.pause();
        this.previewAudio.removeAttribute('src');
        if (this.currentTrack.previewUrl) this.previewAudio.src = this.currentTrack.previewUrl;
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
        this.spotifyTrackLink.hidden = true;
        this.nextButton.hidden = true;
        this.songInput.focus({ preventScroll: true });
    }

    async playClip() {
        if (!this.currentTrack || this.answered || this.playButton.disabled) return;

        try {
            this.previewAudio.currentTime = 0;
            await this.previewAudio.play();
            this.listeningArt.classList.add('is-playing');
            this.playButton.disabled = true;
            this.playButton.setAttribute('aria-label', 'Spotify preview is playing');
            this.playerSubtitle.textContent = 'Spotify preview playing…';
        } catch (error) {
            console.error('Could not play the Spotify preview:', error);
            this.playerSubtitle.textContent = 'Spotify could not play this preview';
            this.skipUnavailablePreview();
        }
    }

    skipUnavailablePreview() {
        if (this.answered || !this.currentTrack) return;
        this.stopClip();
        this.answered = true;
        this.songInput.disabled = true;
        this.artistInput.disabled = true;
        this.form.querySelector('#submit-guess').disabled = true;
        this.showFeedback('This Spotify preview could not be played, so the track was skipped without points.', 'incorrect');
        this.nextButton.textContent = this.roundIndex === this.totalRounds - 1 ? 'See final score →' : 'Next preview →';
        this.nextButton.hidden = false;
    }

    stopClip() {
        this.previewAudio.pause();
        this.previewAudio.currentTime = 0;
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
        if (this.currentTrack.spotifyUrl) {
            this.spotifyTrackLink.href = this.currentTrack.spotifyUrl;
            this.spotifyTrackLink.hidden = false;
        } else {
            this.spotifyTrackLink.hidden = true;
        }
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
        this.formHint.textContent = 'Start another round of Spotify previews whenever you’re ready.';
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
