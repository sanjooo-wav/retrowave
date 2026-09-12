"use client";
import { useEffect, useRef, useState } from "react";
type Track = {
  id: string;
  title: string;
  artist: string;
  uri: string;
  duration: number;
  image: string | null;
};
type Draft = { id: string; title: string; tracks: Track[] };
type Saved = { id: string; title: string; tracks: Track[] };
type Player = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  activateElement: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  addListener: (e: string, f: (x: any) => void) => void;
};
declare global {
  interface Window {
    Spotify?: { Player: new (o: any) => Player };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}
const time = (n: number) =>
  `${Math.floor(n / 60000)}:${String(Math.floor(n / 1000) % 60).padStart(2, "0")}`;
export default function Home() {
  const [connected, setConnected] = useState(false),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState("Sign in and link Spotify to start."),
    [q, setQ] = useState(""),
    [results, setResults] = useState<Track[]>([]),
    [liked, setLiked] = useState<Track[]>([]),
    [taste, setTaste] = useState<Track[]>([]),
    [spotifyLists, setSpotifyLists] = useState<
      { id: string; title: string; image: string | null; count: number }[]
    >([]),
    [drafts, setDrafts] = useState<Draft[]>([
      { id: "first-tape", title: "Late night drives", tracks: [] },
    ]),
    [activeId, setActiveId] = useState("first-tape"),
    [saved, setSaved] = useState<Saved[]>([]),
    [current, setCurrent] = useState<Track | null>(null),
    [playing, setPlaying] = useState(false),
    [loop, setLoop] = useState(false),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0),
    [volume, setVolume] = useState(70);
  const player = useRef<Player | null>(null),
    device = useRef("");
  const active = drafts.find((p) => p.id === activeId) || drafts[0];
  const tape = active.tracks;
  const token = async () => {
    const r = await fetch("/api/spotify/token");
    if (!r.ok) throw Error("Spotify is not linked.");
    return (await r.json()).accessToken;
  };
  const loadData = async () => {
    const [r, s] = await Promise.all([
      fetch("/api/spotify/library"),
      fetch("/api/retrowave/playlists"),
    ]);
    if (r.ok) {
      const d = await r.json();
      setLiked(d.liked);
      setTaste(d.taste);
      setSpotifyLists(d.playlists);
    }
    if (s.ok) setSaved((await s.json()).playlists);
  };
  useEffect(() => {
    let alive = true;
    const init = async () => {
      try {
        await token();
        if (!alive) return;
        setConnected(true);
        await loadData();
        const boot = () => {
          if (!window.Spotify || player.current) return;
          const p = new window.Spotify.Player({
            name: "Retrowave cassette deck",
            volume: 0.7,
            getOAuthToken: async (cb: (x: string) => void) => cb(await token()),
          });
          p.addListener("ready", ({ device_id }: any) => {
            device.current = device_id;
            setReady(true);
            setNotice("Spotify player ready. Search, load, and play.");
          });
          p.addListener("account_error", () =>
            setNotice("Spotify Premium is required for browser playback."),
          );
          p.addListener("autoplay_failed", () =>
            setNotice("Tap play again to allow audio."),
          );
          p.addListener("initialization_error", ({ message }: any) =>
            setNotice(message),
          );
          p.addListener("player_state_changed", (s: any) => {
            if (!s) return;
            setPlaying(!s.paused);
            setPosition(s.position);
            setDuration(s.duration);
            const t = s.track_window.current_track;
            if (t)
              setCurrent({
                id: t.id,
                title: t.name,
                artist: t.artists.map((a: any) => a.name).join(", "),
                uri: t.uri,
                duration: t.duration_ms,
                image: t.album.images?.[1]?.url || null,
              });
          });
          p.connect();
          player.current = p;
        };
        if (window.Spotify) boot();
        else {
          const script = document.createElement("script");
          script.src = "https://sdk.scdn.co/spotify-player.js";
          script.async = true;
          window.onSpotifyWebPlaybackSDKReady = boot;
          document.body.appendChild(script);
        }
      } catch {
        setNotice("Link Spotify to see your music and play songs.");
      }
    };
    init();
    return () => {
      alive = false;
      player.current?.disconnect();
    };
  }, []);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`),
      d = await r.json();
    if (r.ok) {
      setResults(d.tracks);
      setNotice(
        d.tracks.length
          ? "Add tracks to your tape or load one now."
          : "No tracks found.",
      );
    } else setNotice(d.error);
  };
  const play = async (t: Track) => {
    if (!device.current) {
      setNotice("Player is still connecting.");
      return;
    }
    try {
      await player.current?.activateElement();
      const a = await token();
      const r = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${device.current}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${a}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [t.uri] }),
        },
      );
      if (!r.ok)
        throw Error(
          r.status === 403
            ? "Spotify Premium is required."
            : "Spotify could not play that track.",
        );
      setCurrent(t);
      setPlaying(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Playback failed.");
    }
  };
  const add = (t: Track, target = activeId) => {
    setDrafts((all) =>
      all.map((p) =>
        p.id !== target
          ? p
          : {
              ...p,
              tracks: p.tracks.some((a) => a.id === t.id)
                ? p.tracks
                : [...p.tracks, t],
            },
      ),
    );
    setNotice(
      `${t.title} added to ${drafts.find((p) => p.id === target)?.title || "your playlist"}.`,
    );
  };
  const rename = (title: string) =>
    setDrafts((all) =>
      all.map((p) => (p.id === activeId ? { ...p, title } : p)),
    );
  const newDraft = () => {
    const id = crypto.randomUUID();
    setDrafts((all) => [...all, { id, title: "New cassette", tracks: [] }]);
    setActiveId(id);
  };
  const queue = async (t: Track) => {
    try {
      if (!device.current) throw Error("Player is still connecting.");
      const a = await token();
      const r = await fetch(
        `https://api.spotify.com/v1/me/player/queue?${new URLSearchParams({ uri: t.uri, device_id: device.current })}`,
        { method: "POST", headers: { Authorization: `Bearer ${a}` } },
      );
      if (!r.ok) throw Error("Spotify could not add that track to the queue.");
      setNotice(`${t.title} added to your Spotify queue.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Queue unavailable.");
    }
  };
  const repeat = async () => {
    try {
      if (!device.current) throw Error("Player is still connecting.");
      const next = !loop,
        a = await token();
      const r = await fetch(
        `https://api.spotify.com/v1/me/player/repeat?${new URLSearchParams({ state: next ? "track" : "off", device_id: device.current })}`,
        { method: "PUT", headers: { Authorization: `Bearer ${a}` } },
      );
      if (!r.ok) throw Error("Spotify could not change repeat mode.");
      setLoop(next);
      setNotice(next ? "Repeating the current song." : "Repeat turned off.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Repeat unavailable.");
    }
  };
  const save = async () => {
    if (!tape.length) {
      setNotice("Add at least one song to your tape.");
      return;
    }
    const r = await fetch("/api/retrowave/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: active.title, tracks: tape }),
      }),
      d = await r.json();
    if (r.ok) {
      setSaved((x) => [d.playlist, ...x]);
      setNotice("Saved to your Retrowave account.");
    } else setNotice(d.error);
  };
  const jump = (value: number) => {
    const ms = Math.round((value * duration) / 100);
    setPosition(ms);
    player.current?.seek(ms);
  };
  const changeVolume = async (value: number) => {
    setVolume(value);
    try {
      await player.current?.setVolume(value / 100);
    } catch {
      setNotice("Volume control is unavailable.");
    }
  };
  return (
    <main className="studio">
      <div className="grain" />
      <div className="wrap">
        <header>
          <a href="/">
            RETRO<i>wave</i>
          </a>
          <span>YOUR SPOTIFY LISTENING ROOM</span>
          <a href="/auth" className="account">
            ACCOUNT
          </a>
        </header>
        <section className="hero">
          <div>
            <p>
              CASSETTE DECK <b>●</b> SPOTIFY EDITION
            </p>
            <h1>
              Keep it
              <br />
              <em>on repeat.</em>
            </h1>
          </div>
          <aside>
            <i />
            <div>
              <small>{ready ? "PLAYER READY" : "STATUS"}</small>
              <strong>
                {current ? `${current.title} — ${current.artist}` : notice}
              </strong>
            </div>
          </aside>
        </section>
        {!connected ? (
          <section className="connect-banner">
            <div>
              <b>Link your Spotify account</b>
              <span>
                Play full tracks, see your library, and build Retrowave
                mixtapes.
              </span>
            </div>
            <a href="/api/spotify/authorize">LINK SPOTIFY</a>
          </section>
        ) : null}
        <div className="spotify-grid">
          <section className={`deck ${playing ? "rolling" : ""}`}>
            <div className="decktop">
              <span>RETROWAVE / WEB PLAYER</span>
              <span className={ready ? "ready" : "waiting"}>
                ● {ready ? "ON AIR" : "CONNECTING"}
              </span>
            </div>
            <div className="cassette">
              <div className="label">
                <small>SPOTIFY · SIDE A · STEREO</small>
                <h2>{current?.title || "Your tape is empty"}</h2>
                <p>{current?.artist || "Search the crate and load a song."}</p>
                <i />
              </div>
              <div className="window">
                <div className="reel">
                  <i />
                </div>
                <div className="tape-track" />
                <div className="reel reverse">
                  <i />
                </div>
              </div>
              <footer>
                <span>RETROWAVE STUDIO</span>
                <span>{time(duration || current?.duration || 0)}</span>
              </footer>
            </div>
            <div className="progress">
              <span>{time(position)}</span>
              <input
                aria-label="Seek track"
                value={duration ? (position / duration) * 100 : 0}
                onChange={(e) => jump(Number(e.target.value))}
                type="range"
              />
              <span>{time(duration || current?.duration || 0)}</span>
            </div>
            <div className="volume-control">
              <span>VOL</span>
              <input
                aria-label="Volume"
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
              />
              <span>{volume}%</span>
            </div>
            <div className="transport">
              <button
                onClick={() => player.current?.previousTrack()}
                aria-label="Previous"
              >
                ◀◀
              </button>
              <button
                className="play"
                onClick={() => player.current?.togglePlay()}
                aria-label="Play or pause"
              >
                {playing ? "Ⅱ" : "▶"}
              </button>
              <button
                onClick={() => player.current?.nextTrack()}
                aria-label="Next"
              >
                ▶▶
              </button>
              <button
                className={`loop ${loop ? "on" : ""}`}
                onClick={repeat}
                aria-label="Repeat current song"
              >
                ↻
              </button>
            </div>
            <div className="meters">
              <div>
                {Array.from({ length: 16 }).map((_, i) => (
                  <i
                    key={i}
                    className={playing ? "bounce" : ""}
                    style={{ height: `${8 + ((i * 9) % 20)}px` }}
                  />
                ))}
              </div>
              <span>{ready ? "LIVE FROM SPOTIFY" : "WAITING"}</span>
            </div>
          </section>
          <aside className="crate">
            <div className="title">
              <div>
                <p>SEARCH SPOTIFY</p>
                <h2>Find a feeling</h2>
              </div>
              <b>{connected ? "ON" : "OFF"}</b>
            </div>
            <form className="search" onSubmit={search}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Track, artist, or album"
              />
              <button>SEARCH</button>
            </form>
            <p className="status">{notice}</p>
            {results.map((t) => (
              <article className="result search-result" key={t.id}>
                <i
                  className="art"
                  style={
                    t.image ? { backgroundImage: `url(${t.image})` } : undefined
                  }
                />
                <div className="result-info">
                  <b>{t.title}</b>
                  <small>
                    {t.artist} · {time(t.duration)}
                  </small>
                  <div className="result-actions">
                    <button onClick={() => play(t)}>PLAY</button>
                    <button onClick={() => queue(t)}>QUEUE</button>
                    <select
                      value={activeId}
                      onChange={(e) => setActiveId(e.target.value)}
                      aria-label="Playlist destination"
                    >
                      {drafts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => add(t)}>+ PLAYLIST</button>
                  </div>
                </div>
              </article>
            ))}
          </aside>
          <section className="mix tape-builder">
            <div className="title">
              <div>
                <p>YOUR RETROWAVE MIXTAPE</p>
                <h2>
                  Make it yours <b>✦</b>
                </h2>
              </div>
              <strong>{tape.length} TRACKS</strong>
            </div>
            <div className="save-row">
              <select
                value={activeId}
                onChange={(e) => setActiveId(e.target.value)}
                aria-label="Choose playlist"
              >
                {drafts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <input
                value={active.title}
                maxLength={80}
                onChange={(e) => rename(e.target.value)}
                placeholder="Mixtape title"
              />
              <button className="new-draft" onClick={newDraft}>
                + NEW
              </button>
              <button onClick={save}>SAVE TO ACCOUNT</button>
            </div>
            <ol>
              {tape.map((t, i) => (
                <li key={t.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <button onClick={() => play(t)}>
                    <b>{t.title}</b>
                    <small>{t.artist}</small>
                  </button>
                  <em>{time(t.duration)}</em>
                  <button
                    className="remove"
                    onClick={() =>
                      setDrafts((all) =>
                        all.map((p) =>
                          p.id === activeId
                            ? {
                                ...p,
                                tracks: p.tracks.filter((a) => a.id !== t.id),
                              }
                            : p,
                        ),
                      )
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            {!tape.length && (
              <p className="empty">
                Search Spotify and use “+ TAPE” to create your own playlist.
              </p>
            )}
          </section>
        </div>
        {connected && (
          <section className="library">
            <div className="library-head">
              <div>
                <p>FROM YOUR SPOTIFY</p>
                <h2>Your listening shelf</h2>
              </div>
              <button onClick={loadData}>REFRESH</button>
            </div>
            <div className="shelf">
              <Library
                title="Liked songs"
                tracks={liked}
                play={play}
                add={add}
              />
              <Library
                title="Your sound · top tracks"
                tracks={taste}
                play={play}
                add={add}
              />
              <div className="shelf-card">
                <h3>Your Spotify playlists</h3>
                {spotifyLists.map((p) => (
                  <div className="playlist-line" key={p.id}>
                    <i
                      style={
                        p.image
                          ? { backgroundImage: `url(${p.image})` }
                          : undefined
                      }
                    />
                    <span>
                      {p.title}
                      <small>{p.count} tracks</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="shelf-card">
                <h3>Saved in Retrowave</h3>
                {saved.map((p) => (
                  <button
                    className="saved-line"
                    key={p.id}
                    onClick={() =>
                      setDrafts((all) =>
                        all.map((d) =>
                          d.id === activeId ? { ...d, tracks: p.tracks } : d,
                        ),
                      )
                    }
                  >
                    {p.title}
                    <small>{p.tracks.length} tracks · load tape</small>
                  </button>
                ))}
                {!saved.length && (
                  <p className="empty">Your saved tapes will live here.</p>
                )}
              </div>
            </div>
          </section>
        )}
        <footer className="sitefooter">
          <span>© 2026 RETROWAVE</span>
          <span>POWERED BY SPOTIFY WEB PLAYBACK</span>
          <span>LISTEN SLOWLY</span>
        </footer>
      </div>
    </main>
  );
}
function Library({
  title,
  tracks,
  play,
  add,
}: {
  title: string;
  tracks: Track[];
  play: (t: Track) => void;
  add: (t: Track) => void;
}) {
  return (
    <div className="shelf-card">
      <h3>{title}</h3>
      {tracks.slice(0, 5).map((t) => (
        <div className="mini" key={t.id}>
          <i
            style={t.image ? { backgroundImage: `url(${t.image})` } : undefined}
          />
          <button onClick={() => play(t)}>
            {t.title}
            <small>{t.artist}</small>
          </button>
          <button onClick={() => add(t)}>+</button>
        </div>
      ))}
    </div>
  );
}
