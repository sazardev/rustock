#!/usr/bin/env node
/**
 * release — versionador de Rustock (SemVer + Conventional Commits + git-cliff).
 *
 * Uso:
 *   node scripts/release.mjs patch   # 0.1.0 -> 0.1.1
 *   node scripts/release.mjs minor   # 0.1.0 -> 0.2.0
 *   node scripts/release.mjs major   # 0.1.0 -> 1.0.0
 *   node scripts/release.mjs 1.2.3   # versión explícita
 *   node scripts/release.mjs --tag   # además crea el tag git vX.Y.Z
 *   node scripts/release.mjs --changelog-only
 *
 * Sincroniza la versión en:
 *   - package.json          ("version")
 *   - src-tauri/Cargo.toml  (version = "X.Y.Z")
 *   - src-tauri/tauri.conf.json ("version")
 * Luego regenera CHANGELOG.md con git-cliff.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(new URL("..", import.meta.url).pathname);

function read(file) {
  return readFileSync(join(ROOT, file), "utf8");
}
function write(file, content) {
  writeFileSync(join(ROOT, file), content);
}
function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

// --- parse args ---
const args = process.argv.slice(2);
const wantTag = args.includes("--tag");
const changelogOnly = args.includes("--changelog-only");
const bump = args.find((a) => !a.startsWith("--"));

// --- current version (package.json is the source of truth) ---
const pkg = JSON.parse(read("package.json"));
const current = pkg.version;

// --- compute next version ---
let next;
if (changelogOnly) {
  next = current;
} else if (bump && /^\d+\.\d+\.\d+$/.test(bump)) {
  next = bump;
} else {
  const [maj, min, pat] = current.split(".").map(Number);
  if (bump === "major") next = `${maj + 1}.0.0`;
  else if (bump === "minor") next = `${maj}.${min + 1}.0`;
  else if (bump === "patch") next = `${maj}.${min}.${pat + 1}`;
  else {
    console.error("Uso: node scripts/release.mjs <patch|minor|major|X.Y.Z> [--tag]");
    process.exit(1);
  }
}

if (!changelogOnly) {
  // --- sync package.json ---
  pkg.version = next;
  write("package.json", JSON.stringify(pkg, null, 2) + "\n");

  // --- sync Cargo.toml ---
  let cargo = read("src-tauri/Cargo.toml");
  cargo = cargo.replace(/^version = "[^"]+"/m, `version = "${next}"`);
  write("src-tauri/Cargo.toml", cargo);

  // --- sync tauri.conf.json ---
  let conf = read("src-tauri/tauri.conf.json");
  conf = conf.replace(/"version": "[^"]+"/, `"version": "${next}"`);
  write("src-tauri/tauri.conf.json", conf);

  // --- sync Cargo.lock (package name = "rustock") ---
  let lock = read("src-tauri/Cargo.lock");
  lock = lock.replace(
    /^name = "rustock"\nversion = "[^"]+"/m,
    `name = "rustock"\nversion = "${next}"`,
  );
  write("src-tauri/Cargo.lock", lock);

  console.log(`Versión: ${current} -> ${next}`);
}

// --- regenerate changelog ---
// `--tag` le dice a git-cliff bajo qué versión agrupar los commits que todavía
// no tienen etiqueta. Sin esto acaban en «[Unreleased]», porque el tag de git
// no existe aún cuando se genera el changelog: el commit de release tiene que
// incluirlo ya escrito, y no se puede etiquetar antes de crear ese commit.
run(`npx git-cliff${wantTag ? ` --tag v${next}` : ""} --output CHANGELOG.md`);
console.log("CHANGELOG.md regenerado.");

// --- tag ---
if (wantTag) {
  const tag = `v${next}`;
  run(`git add CHANGELOG.md package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json`);
  run(`git commit -m "chore(release): prepare for ${next}"`);
  run(`git tag -a ${tag} -m "Rustock ${next}"`);
  console.log(`Tag ${tag} creado y commit de release hecho.`);
} else {
  console.log("Tip: usa --tag para crear también el tag git y el commit de release.");
}
