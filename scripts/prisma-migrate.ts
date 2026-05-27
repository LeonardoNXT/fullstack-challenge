const baselineMigration = process.env.PRISMA_BASELINE_MIGRATION ?? "202605270001_init";
const prisma = ["bun", "node_modules/prisma/build/index.js"];

const deploy = run(["migrate", "deploy", "--schema", "prisma/schema.prisma"]);
if (deploy.ok) {
  process.exit(0);
}

const output = `${deploy.stdout}\n${deploy.stderr}`;
if (!output.includes("P3005")) {
  writeResult(deploy);
  process.exit(deploy.exitCode);
}

console.warn(
  `Prisma found a non-empty schema without migration history. Baselining ${baselineMigration}.`,
);

const migrationFile = `prisma/migrations/${baselineMigration}/migration.sql`;
const execute = run([
  "db",
  "execute",
  "--file",
  migrationFile,
]);
writeResult(execute);
if (!execute.ok) {
  process.exit(execute.exitCode);
}

const resolve = run([
  "migrate",
  "resolve",
  "--applied",
  baselineMigration,
  "--schema",
  "prisma/schema.prisma",
]);
writeResult(resolve);
if (!resolve.ok) {
  process.exit(resolve.exitCode);
}

const retry = run(["migrate", "deploy", "--schema", "prisma/schema.prisma"]);
writeResult(retry);
process.exit(retry.exitCode);

interface CommandResult {
  readonly ok: boolean;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function run(args: readonly string[]): CommandResult {
  const command = [...prisma, ...args];
  const result = Bun.spawnSync(command, {
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    ok: result.success,
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function writeResult(result: CommandResult): void {
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
}
