"use server";

import { updateUserRoles } from "../lib/api";

export async function updateUserRolesAction(userId: string, roleCodes: string[]) {
  return updateUserRoles(userId, roleCodes);
}
