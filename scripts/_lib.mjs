import fs from "node:fs";
import path from "node:path";

export function walk(dir, exts = [".ts", ".tsx"]) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".next", ".data", ".git"].includes(e.name)) continue;
      out.push(...walk(p, exts));
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}

export function read(p) {
  return fs.readFileSync(p, "utf8");
}

export function done(name, problems) {
  if (problems.length === 0) {
    console.log(`✅ ${name}`);
    process.exit(0);
  }
  console.error(`❌ ${name}`);
  for (const p of problems) console.error(`   ・${p}`);
  process.exit(1);
}
