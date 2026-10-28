import { ApiError } from "@/lib/api/api-client";
import { projectUsersService } from "@/lib/api/project-users-service";

/** Backend codes for a deactivation the server refused because of pending requests. */
export const DEACTIVATION_BLOCKED_CODES = new Set([
  "USER_HAS_PENDING_REQUESTS",
  "NO_PROJECT_ADMIN_FOR_REROUTE",
  "INACTIVE_APPROVER_REROUTE_FAILED",
]);

/**
 * Deactivate a user. Return false when the server refused because of pending requests;
 * its message (which lists the request types and managers) goes to onBlocked.
 */
export async function deactivateProjectUser(
  userId: string,
  onBlocked: (message: string) => void,
): Promise<boolean> {
  try {
    await projectUsersService.delete(userId);
    return true;
  } catch (error) {
    const code = error instanceof ApiError
      ? String(error.details?.code ?? error.errorCode ?? "")
      : "";
    if (error instanceof ApiError && error.status === 409 && DEACTIVATION_BLOCKED_CODES.has(code)) {
      onBlocked(error.message);
      return false;
    }
    throw error;
  }
}
