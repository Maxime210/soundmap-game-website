# Soundmap

A small, responsive music-guessing game that runs entirely in your browser. Each session has 10 rounds. Listen to a synthesized melody, guess its title and artist or composer, and earn up to 150 points per track.

## Run it

Open `index.html` in a modern browser and choose **Start playing**. No build step, account, API key, backend, or install is needed. Audio is generated locally by the browser, so allow sound playback when prompted.

## How to play

1. Play or replay the audio clip.
2. Enter the song title, artist/composer, or both. Guesses are not case-sensitive and ignore punctuation.
3. Lock in your guess to see the answer and points: 100 for the title and 50 for the artist/composer.
4. Continue through all 10 rounds. Your best session score is saved in this browser when local storage is available.

## About the demo tracks

The game features short melodies of well-known classical and traditional tunes, synthesized in the browser with the Web Audio API. It does not include audio recordings, Spotify integration, or external services.

## Files

- `index.html` — game layout and accessible controls
- `style.css` — responsive styling
- `script.js` — round logic, scoring, local tune catalog, and synthesized audio
