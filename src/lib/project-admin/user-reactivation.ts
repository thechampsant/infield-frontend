import { ApiError } from "@/lib/api/api-client";
import { projectUsersService } from "@/lib/api/project-users-service";

export const USER_REACTIVATION_CONFLICT_MESSAGE =
  "Cannot reactivate this user because their email or phone number is already used by another active user.";

/** Return false only for the contact conflict handled by the user table. */
export async function reactivateProjectUser(
  userId: string,
  onConflict: (message: string) => void,
): Promise<boolean> {
  try {
    await projectUsersService.restore(userId);
    return true;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      (error.details?.code ?? error.errorCode) === "USER_ACTIVE_IN_PRODUCT"
    ) {
      onConflict(USER_REACTIVATION_CONFLICT_MESSAGE);
      return false;
    }
    throw error;
  }
}
