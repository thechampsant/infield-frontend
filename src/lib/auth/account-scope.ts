/**
 * Account-scope resolution for Account Admins (INF2-1532).
 *
 * The live `GET /users/me` profile shape that identifies an Account Admin's
 * account is not yet confirmed (the super-admin profile carries no
 * account identifier). To avoid coupling the rest of the feature to that
 * single unknown, all the field-probing lives here. Once an Account Admin
 * login is available we lock this to the real field.
 */

export interface AccountScope {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Resolve the account an Account Admin is scoped to from their profile.
 * Probes the most likely field names, then a nested `account` object,
 * then an env override (`NEXT_PUBLIC_ACCOUNT_ADMIN_ACCOUNT_CODE`) for
 * local/staging testing.
 */
export function resolveAccountScope(profile: unknown): AccountScope {
  const p = (profile ?? {}) as Record<string, unknown>;
  const nested = (p.account ?? {}) as Record<string, unknown>;

  const accountId =
    str(p.accountId) ??
    str(nested._id) ??
    str(nested.id) ??
    str(p.accountObjectId);

  const accountCode =
    str(p.accountCode) ??
    str(nested.accountCode) ??
    str(nested.code) ??
    str(process.env.NEXT_PUBLIC_ACCOUNT_ADMIN_ACCOUNT_CODE);

  const accountName =
    str(p.accountName) ?? str(nested.accountName) ?? str(nested.name);

  return { accountId, accountCode, accountName };
}
