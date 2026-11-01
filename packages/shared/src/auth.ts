import type { Role, UserContext } from "./types.js";
import { UnauthorizedError, ForbiddenError } from "./errors.js";

export const DEV_DEFAULT_USER: UserContext = {
  userId: "usr-dev-admin",
  email: "admin@deploysentinel.local",
  organizationId: "org-demo",
  role: "org_admin",
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  on_call: 2,
  org_admin: 3,
};

export function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function assertRole(user: UserContext | undefined, requiredRole: Role): void {
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }
  if (!hasRequiredRole(user.role, requiredRole)) {
    throw new ForbiddenError(
      `Insufficient permissions: requires role '${requiredRole}', got '${user.role}'`,
    );
  }
}

/**
 * Decode dev authentication or Bearer token into a typed UserContext.
 */
export function resolveUserContext(
  headers: Record<string, string | string[] | undefined>,
): UserContext {
  const authHeader = headers["authorization"] as string | undefined;
  const devBypass = process.env.DEV_AUTH_BYPASS !== "false";

  // 1. Check Bearer token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === "token-viewer") {
      return {
        userId: "usr-viewer-1",
        email: "viewer@company.internal",
        organizationId: "org-demo",
        role: "viewer",
      };
    }
    if (token === "token-oncall") {
      return {
        userId: "usr-oncall-1",
        email: "oncall@company.internal",
        organizationId: "org-demo",
        role: "on_call",
      };
    }
    if (token === "token-admin") {
      return {
        userId: "usr-admin-1",
        email: "admin@company.internal",
        organizationId: "org-demo",
        role: "org_admin",
      };
    }
    // Cross-tenant test token
    if (token === "token-other-org") {
      return {
        userId: "usr-other-1",
        email: "attacker@other-org.internal",
        organizationId: "org-other-tenant",
        role: "org_admin",
      };
    }
  }

  // 2. Dev Header Bypass (Local development / testing)
  if (devBypass) {
    const devUserId = headers["x-dev-user-id"] as string | undefined;
    const devOrgId = headers["x-dev-org-id"] as string | undefined;
    const devRole = (headers["x-dev-role"] as Role | undefined) || "org_admin";

    return {
      userId: devUserId || DEV_DEFAULT_USER.userId,
      email: `${devUserId || "admin"}@deploysentinel.local`,
      organizationId: devOrgId || DEV_DEFAULT_USER.organizationId,
      role: ["org_admin", "on_call", "viewer"].includes(devRole) ? devRole : "viewer",
    };
  }

  throw new UnauthorizedError("Missing or invalid authentication credentials");
}
