import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("Milestone 07: CI/CD, Container Hardening & Release Verification", () => {
  const rootDir = process.cwd();

  describe("Hardened Multi-Stage Dockerfiles", () => {
    const dockerfiles = [
      { path: "apps/web/Dockerfile", user: "nextjs", port: "3000" },
      { path: "services/api/Dockerfile", user: "deploysentinel", port: "4000" },
      { path: "services/processor/Dockerfile", user: "deploysentinel", port: "4001" },
      { path: "services/investigator/Dockerfile", user: "deploysentinel", port: "4002" },
    ];

    it.each(dockerfiles)(
      "should have valid non-root user and healthcheck in $path",
      ({ path, user, port }) => {
        const fullPath = join(rootDir, path);
        expect(existsSync(fullPath)).toBe(true);

        const content = readFileSync(fullPath, "utf-8");

        // Verify multi-stage build structure
        expect(content).toMatch(/FROM .* AS base/);
        expect(content).toMatch(/FROM .* AS runner/);

        // Verify non-root user enforcement
        expect(content).toMatch(new RegExp(`USER ${user}`));

        // Verify exposed port
        expect(content).toMatch(new RegExp(`EXPOSE ${port}`));

        // Verify healthcheck probe
        expect(content).toMatch(/HEALTHCHECK/);
        expect(content).toMatch(/wget --no-verbose/);
      },
    );

    it("should have .dockerignore ignoring sensitive and transient directories", () => {
      const dockerignorePath = join(rootDir, ".dockerignore");
      expect(existsSync(dockerignorePath)).toBe(true);

      const content = readFileSync(dockerignorePath, "utf-8");
      expect(content).toContain("node_modules");
      expect(content).toContain(".git");
      expect(content).toContain(".env");
      expect(content).toContain("dist");
    });
  });

  describe("GitHub Actions Workflows", () => {
    it("should have valid CI workflow with pinned actions and frozen lockfile", () => {
      const ciPath = join(rootDir, ".github/workflows/ci.yml");
      expect(existsSync(ciPath)).toBe(true);

      const content = readFileSync(ciPath, "utf-8");

      expect(content).toContain("name: DeploySentinel CI");
      expect(content).toContain("contents: read");

      // Verify jobs exist
      expect(content).toContain("format-and-lint:");
      expect(content).toContain("test-and-contracts:");
      expect(content).toContain("security-audit:");
      expect(content).toContain("docker-syntax-check:");

      // Check SHA-pinned action references
      expect(content).toMatch(/actions\/checkout@[a-f0-9]{40}/);
      expect(content).toMatch(/pnpm\/action-setup@[a-f0-9]{40}/);
      expect(content).toMatch(/actions\/setup-node@[a-f0-9]{40}/);

      // Check frozen lockfile requirement
      expect(content).toContain("--frozen-lockfile");
    });

    it("should have valid Release workflow with least-privilege permissions and GHCR matrix", () => {
      const releasePath = join(rootDir, ".github/workflows/release.yml");
      expect(existsSync(releasePath)).toBe(true);

      const content = readFileSync(releasePath, "utf-8");

      expect(content).toContain("name: DeploySentinel Release & Publish");
      expect(content).toContain("packages: write");
      expect(content).toContain("contents: read");

      // Verify matrix services
      expect(content).toContain("service: web");
      expect(content).toContain("service: api");
      expect(content).toContain("service: processor");
      expect(content).toContain("service: investigator");

      // Verify buildx SHA-pinned actions
      expect(content).toMatch(/docker\/setup-buildx-action@[a-f0-9]{40}/);
      expect(content).toMatch(/docker\/login-action@[a-f0-9]{40}/);
      expect(content).toMatch(/docker\/build-push-action@[a-f0-9]{40}/);
    });
  });

  describe("Production Compose & Release Manifests", () => {
    it("should have valid docker-compose.release.yml with replicas and healthchecks", () => {
      const composeReleasePath = join(rootDir, "docker-compose.release.yml");
      expect(existsSync(composeReleasePath)).toBe(true);

      const content = readFileSync(composeReleasePath, "utf-8");

      expect(content).toContain("api:");
      expect(content).toContain("processor:");
      expect(content).toContain("investigator:");
      expect(content).toContain("web:");

      // Check processor has independent scaling (replicas: 2)
      expect(content).toMatch(/replicas:\s*2/);

      // Check migration dependency ordering
      expect(content).toContain("db-migration:");
      expect(content).toContain("service_completed_successfully");
    });

    it("should have all release documentation and scripts present", () => {
      expect(existsSync(join(rootDir, "infra/release/deployment-manifest.yaml"))).toBe(true);
      expect(existsSync(join(rootDir, "infra/release/migration-ordering.md"))).toBe(true);
      expect(existsSync(join(rootDir, "infra/release/backup-restore.sh"))).toBe(true);
      expect(existsSync(join(rootDir, "infra/release/rollback-dlq-guide.md"))).toBe(true);
    });
  });
});
