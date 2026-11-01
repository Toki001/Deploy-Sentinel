import http from "node:http";
import { logger } from "@deploysentinel/shared";
import { defaultMetrics } from "@deploysentinel/telemetry";

export function startHealthServer(port = 4002): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/health/live") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "@deploysentinel/investigator" }));
    } else if (req.url === "/readyz" || req.url === "/health/ready") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ready",
          service: "@deploysentinel/investigator",
        }),
      );
    } else if (req.url === "/metrics") {
      res.writeHead(200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      });
      res.end(defaultMetrics.toPrometheusText());
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
