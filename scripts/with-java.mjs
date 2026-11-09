// Runs a command with Java 21 on the PATH (the Firebase emulator needs it). Uses JAVA_HOME if set,
// otherwise a Temurin JDK unpacked under ~/.local/share/jdk. Usage: node scripts/with-java.mjs <cmd> [args]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function findJavaHome() {
  if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, "bin", "java"))) return process.env.JAVA_HOME;
  const root = join(homedir(), ".local", "share", "jdk");
  if (!existsSync(root)) return null;
  for (const dir of readdirSync(root).filter((d) => d.startsWith("jdk-")).sort().reverse()) {
    for (const home of [join(root, dir, "Contents", "Home"), join(root, dir)]) {
      if (existsSync(join(home, "bin", "java"))) return home;
    }
  }
  return null;
}

const javaHome = findJavaHome();
if (!javaHome) {
  console.error("Java 21 not found. Set JAVA_HOME, or unpack a Temurin 21 JDK under ~/.local/share/jdk.");
  process.exit(1);
}
const [cmd, ...args] = process.argv.slice(2);
const env = { ...process.env, JAVA_HOME: javaHome, PATH: `${join(javaHome, "bin")}:${process.env.PATH}` };
const result = spawnSync(cmd, args, { stdio: "inherit", env, shell: false });
process.exit(result.status ?? 1);
