// Builds the narration audio for the level intros from public/lessons.js.
//   node scripts/make-voice.mjs --en "Daniel" --ar "Majed"          (all levels, both languages)
//   node scripts/make-voice.mjs --samples                           (short samples of every candidate voice)
// Uses the macOS `say` command and ffmpeg. To use another text-to-speech service, replace speak() below:
// it only has to turn (text, voice) into an audio file.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "vo");
const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bqvo-"));

// Natural voices: a name ending in "Neural" (e.g. en-US-BrianNeural, ar-LB-RamiNeural) uses Microsoft neural TTS
// via edge-tts in .tts-venv; the rate is then a percentage such as "-15%" or "+0%". Other names use macOS `say`.
function speak(text, voice, rate, file) {
  if (/Neural$/.test(voice)) {
    const mp3 = path.join(tmp, "x.mp3");
    const r = String(rate).match(/^[+-]\d+%$/) ? String(rate) : "+0%";
    for (let tries = 0; ; tries++) {
      try { execFileSync(path.join(root, ".tts-venv", "bin", "edge-tts"), ["--voice", voice, "--rate=" + r, "--text", text, "--write-media", mp3], { stdio: "ignore" }); break; }
      catch (e) { if (tries >= 3) throw e; execFileSync("sleep", ["2"]); }
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3, "-af", "apad=pad_dur=0.15", "-ac", "1", "-c:a", "aac", "-b:a", "64k", file]);
    return;
  }
  const aiff = path.join(tmp, "x.aiff");
  execFileSync("say", ["-v", voice, "-r", String(rate), "-o", aiff, text]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,apad=pad_dur=0.15", "-ac", "1", "-c:a", "aac", "-b:a", "64k", file]);
}

globalThis.window = globalThis;
await import(path.join(root, "public", "lessons.js"));

if (process.argv.includes("--samples")) {
  const en = "Hi! I'm Bolt, your robot. Each move forward block makes me walk one tile. Let's write some code!";
  const ar = "مرحباً! أنا بولت، الروبوت الصغير. كل قطعة تحرك للأمام تجعلني أمشي مربعاً واحداً. هيا نكتب الكود!";
  const list = [["en", "Daniel", 175], ["en", "Reed (English (US))", 175], ["en", "Eddy (English (US))", 175], ["en", "Ralph", 175], ["en", "Fred", 175],
    ["ar", "Majed", 165], ["ar", "Majed", 140]];
  for (const [lang, voice, rate] of list) {
    const name = `${lang}_${voice.split(" ")[0]}_${rate}.m4a`;
    try { speak(lang === "en" ? en : ar, voice, rate, path.join(out, "samples", name)); console.log("sample", name); } catch (e) { console.log("skip", voice, String(e.message).split("\n")[0]); }
  }
} else {
  const voices = { en: [arg("en", "Daniel"), (/Neural$/.test(arg("en", "")) ? arg("en-rate", "+0%") : Number(arg("en-rate", 175)))], ar: [arg("ar", "Majed"), (/Neural$/.test(arg("ar", "")) ? arg("ar-rate", "+0%") : Number(arg("ar-rate", 160)))] };
  let n = 0;
  for (const [id, lesson] of Object.entries(window.LESSONS)) {
    for (const lang of ["en", "ar"]) {
      const lines = lang === "en" ? lesson.en : lesson.ar.vo;
      lines.forEach((text, i) => { speak(text, voices[lang][0], voices[lang][1], path.join(out, lang, `${id}_${i + 1}.m4a`)); n++; });
    }
    process.stdout.write(".");
  }
  fs.writeFileSync(path.join(out, "voices.json"), JSON.stringify({ en: voices.en[0], ar: voices.ar[0], made: new Date().toISOString() }, null, 2));
  console.log(`\n${n} narration files written to public/vo`);
}
fs.rmSync(tmp, { recursive: true, force: true });
