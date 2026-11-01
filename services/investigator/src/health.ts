import http from "node:http";
import { logger } from "@deploysentinel/shared";

export function startHealthServer(port = 4002): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "@deploysentinel/investigator" }));
    } else if (req.url === "/readyz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ready", service: "@deploysentinel/investigator" }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    logger.info(`Investigator health server listening on port ${port}`);
  });

  return server;
}
