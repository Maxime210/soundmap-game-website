# Soundmap

A small, responsive music-guessing game that runs entirely in your browser. Connect Spotify to play Spotify-provided track previews, guess the title and artist, and earn up to 150 points per track. No other audio source is used.

## Run it

Open the public site at <https://maxime210.github.io/soundmap-game-website/>. Connect Spotify and choose **Start playing**. The game requires an internet connection and Spotify authorization.

## Connect Spotify

To enable Spotify sign-in, add this exact Redirect URI to the Spotify Developer Dashboard for the app whose Client ID is configured in `script.js`:

```text
https://maxime210.github.io/soundmap-game-website/
```

On the public HTTPS site, choose **Connect Spotify** and approve access, then start a game. The site uses Spotify's Authorization Code with PKCE flow; a client secret is not used or included in this public repository. Only tracks for which Spotify returns a playable preview URL are included. A session contains up to 10 available previews and can be shorter if Spotify returns fewer. If no previews are available, the game will not start; it never substitutes other audio. Spotify app Development Mode and account allowlisting requirements may also apply.

## How to play

1. Connect Spotify and start a session.
2. Play or replay the Spotify preview.
3. Enter the song title, artist, or both. Guesses are not case-sensitive and ignore punctuation.
4. Lock in your guess to see the answer and points: 100 for the title and 50 for the artist.
5. Continue through the available previews. Your best session score is saved in this browser when local storage is available.

## About the audio

Spotify previews are streamed from Spotify only when the API returns a preview URL. Spotify may not provide previews for every search result; tracks without a preview are skipped.

## Files

- `index.html` — game layout and accessible controls
- `style.css` — responsive styling
- `script.js` — round logic, scoring, Spotify PKCE/search integration, and preview playback
