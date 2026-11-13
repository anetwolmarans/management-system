// Re-seed endpoint — spawns the seed script in a child process.
import { json } from "@/lib/api";
import { spawn } from "child_process";
import path from "path";

export async function POST() {
  return new Promise((resolve) => {
    const seedPath = path.join(process.cwd(), "scripts", "seed.ts");
    const child = spawn("bun", ["run", seedPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (d) => (output += d.toString()));
    child.stderr.on("data", (d) => (output += d.toString()));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(json({ ok: true, message: "Database re-seeded successfully", output: output.slice(-500) }));
      } else {
        resolve(json({ ok: false, error: "Seed failed", output: output.slice(-500) }, 500));
      }
    });
  });
}
