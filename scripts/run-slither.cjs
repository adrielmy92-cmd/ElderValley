const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const bundledPython = path.join(
  process.env.USERPROFILE || "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe"
);

const candidates = [
  process.env.PYTHON,
  fs.existsSync(bundledPython) ? bundledPython : null,
  "python",
  "py",
].filter(Boolean);

let lastResult = null;

for (const candidate of candidates) {
  const slitherArgs = [".", "--exclude-dependencies", ...process.argv.slice(2)];
  const args = candidate === "py"
    ? ["-3", "-m", "slither", ...slitherArgs]
    : ["-m", "slither", ...slitherArgs];

  const result = spawnSync(candidate, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  lastResult = result;

  if (!result.error || result.error.code !== "ENOENT") {
    process.exit(result.status ?? 1);
  }
}

console.error("Unable to find Python with slither-analyzer installed.");
console.error("Install Python and run: python -m pip install slither-analyzer");
if (lastResult?.error) {
  console.error(lastResult.error.message);
}
process.exit(1);
