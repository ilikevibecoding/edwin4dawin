#!/usr/bin/env python3
"""Offline transcription check used to verify processed VO is still intelligible.

Not part of the film build; called by hand (or by tools/check-vo.mjs) to compare
what the words were with what a recogniser hears after the voice treatment.

    /tmp/tts-venv/bin/python tools/lib/asr.py file1.wav file2.wav ...

Prints one JSON object per line: {"file": ..., "text": ...}
"""
import json
import os
import subprocess
import sys
import wave

MODEL_DIR = os.environ.get("VOSK_MODEL", "/tmp/vosk/vosk-model-small-en-us-0.15")


def to_16k_mono(path):
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000",
         "-f", "wav", "-"],
        stdout=subprocess.PIPE, check=True).stdout
    return out


def main():
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    model = Model(MODEL_DIR)
    import io
    for path in sys.argv[1:]:
        data = to_16k_mono(path)
        wf = wave.open(io.BytesIO(data), "rb")
        rec = KaldiRecognizer(model, wf.getframerate())
        words = []
        while True:
            chunk = wf.readframes(4000)
            if len(chunk) == 0:
                break
            if rec.AcceptWaveform(chunk):
                words.append(json.loads(rec.Result()).get("text", ""))
        words.append(json.loads(rec.FinalResult()).get("text", ""))
        text = " ".join(w for w in words if w).strip()
        print(json.dumps({"file": path, "text": text}), flush=True)


if __name__ == "__main__":
    main()
