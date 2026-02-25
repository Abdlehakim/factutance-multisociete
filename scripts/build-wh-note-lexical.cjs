const path = require("path");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const entryFile = path.join(root, "src", "renderer", "modules", "wh-note-lexical-modal.entry.jsx");
const outFile = path.join(root, "src", "renderer", "modules", "wh-note-lexical-modal.js");

esbuild
  .build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2019"],
    sourcemap: false,
    minify: true,
    legalComments: "none",
    define: {
      "process.env.NODE_ENV": '"production"'
    }
  })
  .then(() => {
    console.log(`Built: ${path.relative(root, outFile)}`);
  })
  .catch((error) => {
    console.error("Failed to build Lexical modal bundle:", error);
    process.exitCode = 1;
  });
