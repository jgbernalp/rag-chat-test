const { nodeExternalsPlugin } = require("esbuild-node-externals");

require("esbuild")
  .build({
    entryPoints: ["src/server.ts"],
    bundle: true,
    platform: "node",
    outdir: "build",
    plugins: [nodeExternalsPlugin()],
    logLevel: "info",
    minify: true,
    sourcemap: "external",
  })
  .catch(() => process.exit(1));
