import { execSync } from "node:child_process";

const env = process.env;

const isVercel = env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
const isCloudflareBuild =
  env.WORKERS_CI === "1" ||
  env.CF_PAGES === "1" ||
  Boolean(env.CLOUDFLARE_ACCOUNT_ID && !isVercel);

const explicitTarget = env.DEPLOY_TARGET?.toLowerCase();

function resolveBuildCommand() {
  if (explicitTarget === "cloudflare") {
    return "npm run build:cf";
  }

  if (explicitTarget === "vercel" || explicitTarget === "app") {
    return "npm run build:app";
  }

  if (isCloudflareBuild) {
    return "npm run build:cf";
  }

  return "npm run build:app";
}

const command = resolveBuildCommand();

console.log(`[build-dispatch] Selected command: ${command}`);

if (env.BUILD_DISPATCH_DRY_RUN === "1") {
  process.exit(0);
}

execSync(command, {
  stdio: "inherit",
  env,
});
