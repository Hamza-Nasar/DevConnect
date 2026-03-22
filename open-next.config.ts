// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

const cloudflareConfig = defineCloudflareConfig({
	// Avoid recursive builds by telling OpenNext to run the original app build script.
	// For best results consider enabling R2 caching
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache
});

export default {
	...cloudflareConfig,
	buildCommand: "npm run build:app",
};
