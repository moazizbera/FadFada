import { describe, expect, it } from "vitest";
import { resolveWorkspaceIdentity } from "./workspaceIdentity";

describe("resolveWorkspaceIdentity", () => {
  it("uses parent identity in parent mode", () => {
    const result = resolveWorkspaceIdentity({
      sessionUser: {
        id: "parent-1",
        workspaceMode: "parent",
        name: "Parent One",
      },
      requestDisplayName: "Random Name",
    });

    expect(result.mode).toBe("parent");
    expect(result.effectiveDisplayName).toBe("Parent One");
    expect(result.leakGuards).toHaveLength(0);
  });

  it("forces child identity in child mode", () => {
    const result = resolveWorkspaceIdentity({
      sessionUser: {
        id: "parent-1",
        workspaceMode: "child",
        childProfileId: "child-77",
        childNickname: "Kid Hero",
        childBirthYear: 2018,
        name: "Parent One",
      },
      requestDisplayName: "Parent One",
      requestWorkspaceContext: { mode: "child", childId: "child-77" },
      requestChildProfileId: "child-77",
      referenceDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.mode).toBe("child");
    expect(result.effectiveDisplayName).toBe("Kid Hero");
    expect(result.childAge).toBe(8);
  });

  it("flags parent-mode payload in child workspace", () => {
    const result = resolveWorkspaceIdentity({
      sessionUser: {
        id: "parent-1",
        workspaceMode: "child",
        childProfileId: "child-77",
        childNickname: "Kid Hero",
        childBirthYear: 2018,
      },
      requestWorkspaceContext: { mode: "parent" },
    });

    expect(result.leakGuards.some((item) => item.reason === "request_mode_parent_in_child_workspace")).toBe(true);
  });

  it("flags child id mismatches in child workspace", () => {
    const result = resolveWorkspaceIdentity({
      sessionUser: {
        id: "parent-1",
        workspaceMode: "child",
        childProfileId: "child-77",
        childNickname: "Kid Hero",
        childBirthYear: 2018,
      },
      requestWorkspaceContext: { mode: "child", childId: "child-13" },
      requestChildProfileId: "child-19",
    });

    expect(result.leakGuards.some((item) => item.reason === "request_child_id_mismatch")).toBe(true);
  });

  it("flags parent name usage in child workspace payload", () => {
    const result = resolveWorkspaceIdentity({
      sessionUser: {
        id: "parent-1",
        workspaceMode: "child",
        childProfileId: "child-77",
        childNickname: "Kid Hero",
        childBirthYear: 2018,
        name: "Parent One",
      },
      requestDisplayName: "Parent One",
      requestWorkspaceContext: { mode: "child", childId: "child-77" },
      requestChildProfileId: "child-77",
    });

    expect(result.leakGuards.some((item) => item.reason === "parent_name_detected_in_child_workspace_request")).toBe(true);
  });
});
