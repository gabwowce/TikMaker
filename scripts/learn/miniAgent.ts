// MINI AGENTAS – mokymuisi.
//
// Tas pats, ką daro server/agent/agent.ts, tik be apsaugų, be tikro AI ir
// be tikro video: ~100 eilučių vietoj ~500. Pavadinimai tokie patys kaip
// tikrame kode, kad paskui galėtum juos ten atpažinti.
//
// Paleisti:   npx tsx scripts/learn/miniAgent.ts "mano video idėja"
// Stebėti:    run'o JSON'as rašomas į out/mini-run.json – atsidaryk jį šalia.

import fs from "node:fs";
import readline from "node:readline/promises";

// ── EIGA: kieno eilė kiekvienoje būsenoje ──────────────────────────────────
// Eilę nustato status run'o JSON'e. Ta pati lentelė – tikro agent.ts viršuje.
//
//   status              eilė      kas vyksta                 tada
//   created             AGENTO    3 hookai                   awaiting_hook
//   awaiting_hook       KŪRĖJOS   pasirenka hooką            writing_script
//   writing_script      AGENTO    scenarijus                 awaiting_approval
//   awaiting_approval   KŪRĖJOS   „Approve“                  generating_voice
//   generating_voice    AGENTO    balsas                     laying_out
//   laying_out          AGENTO    vaizdai kodu               done
//   done                –         video baigtas
//
// Taisyklė: AGENTO būsenoje dirba runAgent, KŪRĖJOS būsenoje runAgent jau
// sustojo (return), ir laukiama, kol kūrėja paspaus mygtuką → userAnswers.

// ── RUN'AS: vienas JSON failas su viskuo apie šį video ─────────────────────
type Run = {
  status: string; //                  kur dabar esame
  idea: string; //                    ką kūrėja įrašė formoje
  hooks?: string[]; //                3 AI pasiūlyti hookai
  hook?: string; //                   kūrėjos pasirinktas
  script?: { text: string; approved?: boolean };
  voice?: string; //                  balso failas
  code?: string; //                   vaizdų kodas
  steps: string[]; //                 žurnalas: kas buvo paklausta AI
};

const FILE = "out/mini-run.json";

// ── job.save: įrašyti pakeitimus į JSON failą ──────────────────────────────
function save(run: Run, changes: Partial<Run>) {
  Object.assign(run, changes);
  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(run, null, 2));
  console.log(`   💾 įrašyta į JSON: ${JSON.stringify(changes)}`);
}

// ── job.ai: paklausti AI (čia – netikras, atsako iškart) ───────────────────
async function ai<T>(run: Run, name: string, answer: T): Promise<T> {
  await new Promise((r) => setTimeout(r, 700)); // „AI galvoja“
  run.steps.push(name);
  console.log(`   🤖 AI atsakė (${name})`);
  return answer;
}

// ── runAgent: PAGAL status nuspręsti, ką daryti toliau ─────────────────────
// Kiekvienas case padaro savo darbą ir SUSTOJA (return) ten, kur reikia
// kūrėjos. Kitą kartą runAgent iškviečiamas, kai kūrėja ką nors paspaudžia.
async function runAgent(run: Run) {
  console.log(`   ⚙️  runAgent: AGENTO eilė (status = ${run.status})`);
  switch (run.status) {
    case "created": {
      // ką tik paspaustas Start → parašyti 3 hookus
      save(run, { status: "writing_hooks" });
      const hooks = await ai(run, "writeHooks", [
        `Ar žinojai, kad ${run.idea}?`,
        `3 dalykai apie ${run.idea}`,
        `Taip aš išmokau ${run.idea}`,
      ]);
      save(run, { hooks, steps: run.steps });
      save(run, { status: "awaiting_hook" });
      return; // ⏸ STOP – laukiam, kol kūrėja pasirinks hooką
    }

    case "awaiting_hook": {
      // kūrėja pasirinko hooką → parašyti scenarijų
      save(run, { status: "writing_script" });
      const text = await ai(run, "writeScript", `${run.hook} … (scenarijus apie ${run.idea})`);
      save(run, { script: { text }, steps: run.steps });
      save(run, { status: "awaiting_approval" });
      return; // ⏸ STOP – laukiam Approve
    }

    case "awaiting_approval": {
      // kūrėja patvirtino → balsas, vaizdai, baigta
      save(run, { status: "generating_voice" });
      const voice = await ai(run, "voice", "voice-1.mp3");
      save(run, { voice, steps: run.steps });

      save(run, { status: "laying_out" });
      const code = await ai(run, "writeCode", "scene-1.tsx");
      save(run, { code, steps: run.steps });

      save(run, { status: "done" });
      return; // ✅ video baigtas
    }
  }
}

// ── userAnswers: kūrėja paspaudė mygtuką ───────────────────────────────────
// 1) įrašyti, ką ji pasirinko  2) duoti run'ą agentui (runAgent)
async function userAnswers(
  run: Run,
  answer: { kind: "hook"; index: number } | { kind: "approve" },
) {
  console.log(`   👆 userAnswers: kūrėja atsakė (${answer.kind})`);
  switch (answer.kind) {
    case "hook":
      save(run, { hook: run.hooks![answer.index] });
      break;
    case "approve":
      save(run, { script: { ...run.script!, approved: true } });
      break;
  }
  await runAgent(run); // tikrame kode: continueRun(run) → fone runAgent(run)
}

// ── start: kūrėja užpildė formą ir paspaudė Start ──────────────────────────
async function start(idea: string): Promise<Run> {
  const run: Run = { status: "created", idea, steps: [] };
  save(run, run);
  await runAgent(run); // tikrame kode: continueRun(run)
  return run;
}

// ── REDAKTORIUS: čia tu esi kūrėja ─────────────────────────────────────────
// Ekranas rodo tai, kas yra JSON'e, ir siūlo mygtuką pagal status.
async function main() {
  const ask = await asker();
  const idea = process.argv[2] ?? "Claude Code";
  console.log(`\n▶ START (idėja: "${idea}")`);
  const run = await start(idea);

  while (run.status !== "done") {
    console.log(`\n⏸  runAgent sustojo – KŪRĖJOS eilė (status = ${run.status})`);
    if (run.status === "awaiting_hook") {
      console.log("🖥  EKRANAS: pasirink hooką");
      run.hooks!.forEach((h, i) => console.log(`   ${i + 1}. ${h}`));
      const n = Number(await ask("   Tavo pasirinkimas (1–3): ")) || 1;
      console.log(`\n▶ PASPAUSTAS hookas ${n}`);
      await userAnswers(run, { kind: "hook", index: n - 1 });
    } else if (run.status === "awaiting_approval") {
      console.log(`🖥  EKRANAS: scenarijus\n   „${run.script!.text}“`);
      await ask("   Spausk Enter = Approve ");
      console.log("\n▶ PASPAUSTAS Approve");
      await userAnswers(run, { kind: "approve" });
    }
  }
  console.log(`\n🎬 VIDEO BAIGTAS. Visas run'as: ${FILE}\n`);
  process.exit(0);
}

// Klausia terminale; jei atsakymai paduoti iš anksto (pvz. printf "2\n\n" |),
// ima juos iš eilės.
async function asker() {
  if (process.stdin.isTTY) {
    const io = readline.createInterface({ input: process.stdin, output: process.stdout });
    return (q: string) => io.question(q);
  }
  const lines = fs.readFileSync(0, "utf-8").split("\n");
  return async (q: string) => {
    const a = lines.shift() ?? "";
    console.log(q + a);
    return a;
  };
}

main();
