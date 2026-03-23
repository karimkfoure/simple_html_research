import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const rootDir = resolve(process.cwd());
const port = 4317;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function resolvePath(urlPathname = "/") {
  const pathname = urlPathname === "/" ? "/index.html" : urlPathname.endsWith("/") ? `${urlPathname}index.html` : urlPathname;
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return join(rootDir, safePath);
}

createServer(async (request, response) => {
  const filePath = resolvePath(new URL(request.url, `http://${request.headers.host}`).pathname);

  if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const fileStats = await stat(filePath);

  if (!fileStats.isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream"
  });

  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Static server listening on http://127.0.0.1:${port}`);
});
