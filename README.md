# Soundmap

A small, responsive music-guessing game that runs entirely in your browser. Each session has 10 rounds. Connect Spotify to try available track previews, or play the synthesized public-domain melody fallback. Guess the title and artist or composer to earn up to 150 points per track.

## Run it

Open the public site at <https://maxime210.github.io/soundmap-game-website/> or open `index.html` in a modern browser. Choose **Start playing** for the local melody game; no account, API key, backend, or install is needed.

## Connect Spotify

To enable Spotify sign-in, add this exact Redirect URI to the Spotify Developer Dashboard for the app whose Client ID is configured in `script.js`:

```text
https://maxime210.github.io/soundmap-game-website/
```

On the public HTTPS site, choose **Connect Spotify** and approve access, then start a game. The site uses Spotify's Authorization Code with PKCE flow; a client secret is not used or included in this public repository. If Spotify returns fewer than 10 tracks with a playable `preview_url`, the remaining rounds use the local synthesized melodies. Spotify may not provide preview URLs for search results, in which case the full game falls back to local melodies. Spotify app Development Mode and account allowlisting requirements may also apply.

## How to play

1. Play or replay the audio clip.
2. Enter the song title, artist/composer, or both. Guesses are not case-sensitive and ignore punctuation.
3. Lock in your guess to see the answer and points: 100 for the title and 50 for the artist/composer.
4. Continue through all 10 rounds. Your best session score is saved in this browser when local storage is available.

## About the audio

Spotify previews are streamed from Spotify only when the API returns a preview URL. The fallback uses short melodies of well-known classical and traditional tunes, synthesized in the browser with the Web Audio API; it does not include recordings.

## Files

- `index.html` — game layout and accessible controls
- `style.css` — responsive styling
- `script.js` — round logic, scoring, Spotify PKCE/search integration, local tune catalog, and synthesized audio
