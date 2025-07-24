const { nodeExternalsPlugin } = require("esbuild-node-externals");
const { spawn } = require("child_process");
const chokidar = require("chokidar");
const esbuild = require("esbuild");

let currentController;

const restartServer = () => {
  console.info("[watch:server] restarting server...");

  if (currentController) {
    currentController.abort();
  }

  const controller = new AbortController();
  const { signal } = controller;

  const server = spawn("node", ["./build/server.js"], { signal });

  server.stdout.on("data", (data) => {
    process.stdout.write(`${data}`);
  });

  server.stderr.on("data", (data) => {
    console.error(`${data}`);
  });

  server.on("error", (error) => {
    console.error(`[watch:server] ${error}`);
  });

  server.on("close", (code) => {
    console.log(`[watch:server] server exited with code '${code}'`);
  });

  currentController = controller;
};

chokidar.watch("./src/**/*", { ignoreInitial: true }).on("all", () => {
  esbuild
    .build({
      entryPoints: ["./src/server.ts"],
      bundle: true,
      platform: "node",
      outdir: "build",
      plugins: [nodeExternalsPlugin()],
      logLevel: "info",
    })
    .then(() => {
      restartServer();
    })
    .catch((error) => {
      if (currentController) {
        currentController.abort();
      }

      console.error(error);
      process.exit(1);
    });
});

restartServer();
