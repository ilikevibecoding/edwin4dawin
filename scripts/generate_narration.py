#!/usr/bin/env python3
"""Generate the original narration audio for 'Starfall: The Stolen Design'.

Reads src/content/narration.json, synthesises every cue with Piper (a local,
open, neutral text-to-speech engine), applies a light cinematic treatment with
ffmpeg, and writes:

    public/audio/narration/<id>.mp3
    public/audio/narration/manifest.json   (durations + text, consumed by the app)

No network service, API key, or proprietary asset is involved at runtime: the
mp3 files are committed and served from the app's own origin.

Usage:
    python3 scripts/generate_narration.py [--force]
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_PATH = ROOT / "src" / "content" / "narration.json"
OUT_DIR = ROOT / "public" / "audio" / "narration"
VOICE_DIR = Path(os.environ.get("PIPER_VOICE_DIR", ROOT / "scripts" / ".voices"))

# Per-treatment ffmpeg filter chains. All processing is generic mastering:
# high-pass, gentle EQ, compression, a short room, and loudness normalisation.
TREATMENTS = {
    "narrator": (
        "highpass=f=75,"
        "equalizer=f=170:t=q:w=1.1:g=2.0,"
        "equalizer=f=380:t=q:w=1.4:g=-2.0,"
        "equalizer=f=5200:t=q:w=1.2:g=2.5,"
        "acompressor=threshold=0.08:ratio=3.2:attack=12:release=260:makeup=1.6,"
        "aecho=0.86:0.9:55|110:0.11|0.05,"
        "loudnorm=I=-17:TP=-2.0:LRA=10"
    ),
    # Diegetic lines heard "in the room" / over a comm channel: narrower band.
    "comm": (
        "highpass=f=180,lowpass=f=7200,"
        "equalizer=f=2400:t=q:w=1.4:g=3.0,"
        "acompressor=threshold=0.10:ratio=4:attack=8:release=180:makeup=2.0,"
        "aecho=0.9:0.85:38|72:0.09|0.04,"
        "loudnorm=I=-18:TP=-2.0:LRA=9"
    ),
    # Protocol-droid timbre: band limited with a metallic resonance so it reads
    # as a machine rather than as any particular performance.
    "droid": (
        "asetrate=22050*1.06,aresample=22050,"
        "highpass=f=240,lowpass=f=6200,"
        "equalizer=f=1150:t=q:w=2.2:g=6.0,"
        "equalizer=f=2900:t=q:w=2.0:g=4.0,"
        "acompressor=threshold=0.12:ratio=5:attack=5:release=120:makeup=2.2,"
        "aecho=0.9:0.8:26|48:0.10|0.05,"
        "loudnorm=I=-18:TP=-2.0:LRA=9"
    ),
}


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def ensure_voice(model: str) -> Path:
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    onnx = VOICE_DIR / f"{model}.onnx"
    if not onnx.exists():
        print(f"  downloading voice {model} ...", flush=True)
        run([sys.executable, "-m", "piper.download_voices", model, "--data-dir", str(VOICE_DIR)])
    return onnx


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def mp3_duration(path: Path) -> float:
    out = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ])
    return float(out.stdout.strip())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="regenerate clips that already exist")
    args = ap.parse_args()

    if shutil.which("ffmpeg") is None:
        print("ffmpeg is required", file=sys.stderr)
        return 2

    data = json.loads(SCRIPT_PATH.read_text())
    voices = data["voices"]
    cues = data["cues"]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / "scripts" / ".tmp-narration"
    tmp.mkdir(parents=True, exist_ok=True)

    # Pre-fetch each distinct voice model once.
    models = {v["model"] for v in voices.values()}
    onnx_for = {m: ensure_voice(m) for m in models}

    manifest = []
    total_words = 0
    for cue in cues:
        voice = voices[cue["voice"]]
        mp3 = OUT_DIR / f"{cue['id']}.mp3"
        total_words += len(cue["text"].split())

        if args.force or not mp3.exists():
            raw = tmp / f"{cue['id']}.wav"
            print(f"  [{cue['id']}] {cue['voice']}: {cue['text'][:64]}...", flush=True)
            proc = subprocess.run(
                [
                    sys.executable, "-m", "piper",
                    "-m", str(onnx_for[voice["model"]]),
                    "-f", str(raw),
                    "--length-scale", str(voice.get("lengthScale", 1.0)),
                    "--noise-scale", str(voice.get("noiseScale", 0.667)),
                    "--sentence-silence", "0.35",
                ],
                input=cue["text"], text=True, capture_output=True,
            )
            if proc.returncode != 0:
                print(proc.stderr, file=sys.stderr)
                return 1
            chain = TREATMENTS[voice.get("treatment", "narrator")]
            run([
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
                "-af", chain, "-ar", "44100", "-ac", "1",
                "-codec:a", "libmp3lame", "-b:a", "96k", str(mp3),
            ])
            print(f"        raw {wav_duration(raw):.2f}s -> mp3 {mp3_duration(mp3):.2f}s", flush=True)

        manifest.append({
            "id": cue["id"],
            "chapter": cue["chapter"],
            "time": cue["time"],
            "speaker": cue["speaker"],
            "text": cue["text"],
            "duration": round(mp3_duration(mp3), 3),
            "file": f"audio/narration/{cue['id']}.mp3",
        })

    manifest.sort(key=lambda c: c["time"])

    # Sanity: report overlaps so the timeline can be re-paced if a clip runs long.
    overlaps = []
    for a, b in zip(manifest, manifest[1:]):
        end = a["time"] + a["duration"]
        if end > b["time"] - 0.15:
            overlaps.append((a["id"], b["id"], round(end - b["time"], 2)))

    (OUT_DIR / "manifest.json").write_text(json.dumps({
        "generator": "piper-tts (local, open voices) + ffmpeg mastering",
        "note": "Original narration written for this fan project. No film dialogue, crawl text, or actor imitation.",
        "words": total_words,
        "cues": manifest,
    }, indent=2) + "\n")

    span = manifest[-1]["time"] + manifest[-1]["duration"]
    print(f"\n{len(manifest)} clips, {total_words} words, last cue ends at {span:.1f}s")
    if overlaps:
        print("OVERLAPS (cue, next cue, seconds of collision):")
        for o in overlaps:
            print(f"   {o[0]} -> {o[1]}: {o[2]}s")
        return 3
    print("No narration overlaps.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
