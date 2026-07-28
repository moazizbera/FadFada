import { getChildWorkspaceContext, readAuthenticatedUserId, type FadFadaSessionUser } from "./auth";

type WorkspaceMode = "parent" | "child";

type RequestWorkspaceContext = {
  mode?: WorkspaceMode;
  childId?: string;
  childName?: string;
  childBirthYear?: number;
};

export type SessionWorkspaceUser = FadFadaSessionUser & {
  name?: string | null;
  email?: string | null;
};

export type WorkspaceIdentityInput = {
  sessionUser?: SessionWorkspaceUser;
  requestDisplayName?: string | null;
  requestWorkspaceContext?: RequestWorkspaceContext;
  requestChildProfileId?: string | null;
  referenceDate?: Date;
};

export type LeakGuardEvent = {
  reason: string;
  details: Record<string, string | boolean | number | null | undefined>;
};

export type WorkspaceIdentityResolution = {
  authenticatedUserId: string | null;
  mode: WorkspaceMode;
  isChildWorkspace: boolean;
  sessionChildProfileId: string;
  childAge: number | null;
  parentDisplayName: string | null;
  childDisplayName: string | null;
  effectiveDisplayName: string | null;
  leakGuards: LeakGuardEvent[];
};

export function normalizeDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const cleanedName = value.replace(/[<>()[\]{}]/g, "").replace(/\s+/g, " ").trim();
  return cleanedName ? cleanedName.slice(0, 32) : null;
}

export function resolveWorkspaceIdentity(input: WorkspaceIdentityInput): WorkspaceIdentityResolution {
  const sessionUser = input.sessionUser;
  const childContext = getChildWorkspaceContext(sessionUser);
  const isChildWorkspace = Boolean(childContext);
  const sessionChildProfileId = childContext?.childProfileId || "";
  const mode: WorkspaceMode = isChildWorkspace ? "child" : "parent";
  const referenceDate = input.referenceDate ?? new Date();
  const childAge = childContext?.birthYear ? Math.max(0, referenceDate.getUTCFullYear() - childContext.birthYear) : null;
  const authenticatedUserId = readAuthenticatedUserId(sessionUser);

  const parentDisplayName = normalizeDisplayName(sessionUser?.name || sessionUser?.email || null);
  const childDisplayName = normalizeDisplayName(typeof sessionUser?.childNickname === "string" ? sessionUser.childNickname : null);
  const requestDisplayName = normalizeDisplayName(input.requestDisplayName);
  const effectiveDisplayName = isChildWorkspace ? (childDisplayName || requestDisplayName) : (parentDisplayName || requestDisplayName);

  const requestWorkspaceMode = input.requestWorkspaceContext?.mode;
  const requestChildId = typeof input.requestWorkspaceContext?.childId === "string" ? input.requestWorkspaceContext.childId.trim() : "";
  const requestChildProfileId = typeof input.requestChildProfileId === "string" ? input.requestChildProfileId.trim() : "";

  const leakGuards: LeakGuardEvent[] = [];

  if (isChildWorkspace) {
    const requestSaysParent = requestWorkspaceMode === "parent";
    const childIdMismatch = Boolean((requestChildId && requestChildId !== sessionChildProfileId) || (requestChildProfileId && requestChildProfileId !== sessionChildProfileId));

    if (requestSaysParent || childIdMismatch) {
      leakGuards.push({
        reason: requestSaysParent ? "request_mode_parent_in_child_workspace" : "request_child_id_mismatch",
        details: {
          sessionChildId: sessionChildProfileId,
          requestChildId,
          requestChildProfileId,
          requestWorkspaceMode: requestWorkspaceMode ?? null,
        },
      });
    }

    if (requestDisplayName && parentDisplayName && requestDisplayName === parentDisplayName) {
      leakGuards.push({
        reason: "parent_name_detected_in_child_workspace_request",
        details: {
          parentDisplayName,
          requestDisplayName,
          sessionChildId: sessionChildProfileId,
        },
      });
    }
  }

  return {
    authenticatedUserId,
    mode,
    isChildWorkspace,
    sessionChildProfileId,
    childAge,
    parentDisplayName,
    childDisplayName,
    effectiveDisplayName,
    leakGuards,
  };
}
