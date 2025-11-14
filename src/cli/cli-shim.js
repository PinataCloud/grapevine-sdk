#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const plat = process.platform; // 'darwin' | 'linux' | 'win32'
const arch = process.arch;     // 'x64', 'arm64', etc.

let binaryName;

if (plat === "darwin") {
  if (arch === "arm64") {
    binaryName = "grapevine-darwin-arm64";
  } else {
    binaryName = "grapevine-darwin-x64";
  }
} else if (plat === "linux") {
  binaryName = "grapevine-linux-x64";
} else if (plat === "win32") {
  binaryName = "grapevine-win32-x64.exe";
} else {
  console.error(`Unsupported platform: ${plat} ${arch}`);
  process.exit(1);
}

const binaryPath = join(__dirname, "bin", binaryName);

const result = spawnSync(binaryPath, process.argv.slice(2), {
  stdio: "inherit"
});

process.exit(result.status ?? 1);