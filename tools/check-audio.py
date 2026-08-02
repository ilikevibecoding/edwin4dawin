#!/usr/bin/env python3
"""Audits the voice track by running it back through speech recognition.

The point is to close the loop that Karpathy complains about: a model writing a
film cannot hear it. So instead of guessing, we transcribe what actually came
out and diff it against the screenplay.

    python3 tools/check-audio.py                 # every VO file on its own
    python3 tools/check-audio.py --mix build/track.wav   # the finished mix

A word error rate under ~0.2 means the line is comfortably intelligible.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
except ImportError:
    print("pip install vosk (in the tts venv) first", file=sys.stderr)
    raise


def norm(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    words = text.split()
    # Spoken-form normalisation so digits and symbols do not count as errors.
    subs = {
        "two": "2", "to": "2", "too": "2", "nine": "9", "six": "6", "thirty": "30",
        "hundred": "100", "s-foils": "sfoils",
    }
    return [subs.get(w, w) for w in words]


def wer(ref: list[str], hyp: list[str]) -> float:
    if not ref:
        return 0.0
    d = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
    for i in range(len(ref) + 1):
        d[i][0] = i
    for j in range(len(hyp) + 1):
        d[0][j] = j
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    return d[len(ref)][len(hyp)] / len(ref)


def to_pcm(path: Path, out: Path, start: float | None = None, dur: float | None = None):
    cmd = ["ffmpeg", "-y", "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    if dur is not None:
        cmd += ["-t", str(dur)]
    cmd += ["-i", str(path), "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(out)]
    subprocess.run(cmd, check=True)


def transcribe(model, path: Path) -> str:
    wf = wave.open(str(path), "rb")
    rec = KaldiRecognizer(model, wf.getframerate())
    rec.SetWords(False)
    out = []
    while True:
        data = wf.readframes(8000)
        if not data:
            break
        if rec.AcceptWaveform(data):
            out.append(json.loads(rec.Result()).get("text", ""))
    out.append(json.loads(rec.FinalResult()).get("text", ""))
    wf.close()
    return " ".join(x for x in out if x).strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=os.environ.get("VOSK_MODEL", "/tmp/vosk-model"))
    ap.add_argument("--mix", default=None, help="check lines inside a finished mix instead")
    ap.add_argument("--only", default=None)
    ap.add_argument("--threshold", type=float, default=0.34)
    args = ap.parse_args()

    SetLogLevel(-1)
    model = Model(args.model)

    script = json.loads((ROOT / "build" / "script.json").read_text())
    manifest_text = (ROOT / "src" / "data" / "vo-manifest.js").read_text()
    start = manifest_text.find("export const VO = ") + len("export const VO = ")
    depth = 0
    for i in range(start, len(manifest_text)):
        if manifest_text[i] == "{":
            depth += 1
        elif manifest_text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    durations = json.loads(manifest_text[start:end])

    cues = None
    if args.mix:
        cue_path = ROOT / "build" / "cues.json"
        if not cue_path.exists():
            print("run `node tools/export-cues.mjs` first to check the mix", file=sys.stderr)
            return 1
        cues = {c["id"]: c["t"] for c in json.loads(cue_path.read_text()) if c["kind"] == "vo"}

    tmp = ROOT / "build" / "asr"
    tmp.mkdir(parents=True, exist_ok=True)

    rows = []
    for line in script["all"]:
        lid = line["id"]
        if args.only and lid not in args.only.split(","):
            continue
        pcm = tmp / f"{lid}.wav"
        if args.mix:
            if lid not in cues:
                continue
            to_pcm(Path(args.mix), pcm, start=max(0, cues[lid] - 0.15), dur=durations[lid]["d"] + 0.4)
        else:
            src = ROOT / "assets" / "vo" / f"{lid}.mp3"
            if not src.exists():
                continue
            to_pcm(src, pcm)
        hyp = transcribe(model, pcm)
        ref_w = norm(line["text"])
        hyp_w = norm(hyp)
        e = wer(ref_w, hyp_w)
        rows.append((lid, line["who"], e, line["text"], hyp))

    rows.sort(key=lambda r: -r[2])
    bad = [r for r in rows if r[2] > args.threshold]
    print(f"{'id':5s} {'who':10s} {'WER':>6s}  heard")
    print("-" * 100)
    for lid, who, e, ref, hyp in rows:
        flag = "  <-- check" if e > args.threshold else ""
        print(f"{lid:5s} {who:10s} {e:6.2f}  {hyp[:70]}{flag}")
        if e > args.threshold:
            print(f"{'':5s} {'':10s} {'want':>6s}  {ref[:70]}")
    avg = sum(r[2] for r in rows) / max(1, len(rows))
    print("-" * 100)
    print(f"{len(rows)} lines, mean WER {avg:.3f}, {len(bad)} above {args.threshold}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
