import { expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
vi.mock("@/lib/api", () => ({ api: vi.fn() }));
import { api } from "@/lib/api";
it("persists files across queue reloads, retries a connection failure, and isolates accounts", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal(
    "FormData",
    class {
      data: any[] = [];
      append(...args: any[]) {
        this.data.push(args);
      }
    },
  );
  let queue = await import("@/lib/file-upload-queue");
  await queue.enqueueFiles("user-a", "case-a", "vis-to", [
    { name: "photo.jpg", bytes: "photo-content" } as any,
  ]);
  await queue.enqueueFiles("user-b", "case-b", "writ", [{ name: "writ.pdf" } as any]);
  expect(await queue.pendingUploads("user-a")).toHaveLength(1);
  vi.mocked(api).mockRejectedValueOnce(new Error("Connection lost"));
  await queue.processUploads(
    "user-a",
    () => true,
    () => {},
  );
  expect((await queue.pendingUploads("user-a"))[0].state).toBe("retry");
  vi.resetModules();
  queue = await import("@/lib/file-upload-queue");
  expect((await queue.pendingUploads("user-a"))[0].name).toBe("photo.jpg");
  const reloadedApi = (await import("@/lib/api")).api;
  vi.mocked(reloadedApi).mockResolvedValue({ ok: true });
  await queue.retryUploads("user-a");
  await queue.processUploads(
    "user-a",
    () => true,
    () => {},
  );
  expect(await queue.pendingUploads("user-a")).toHaveLength(0);
  expect(await queue.pendingUploads("user-b")).toHaveLength(1);
  expect(reloadedApi).toHaveBeenCalledWith(
    "/documents",
    expect.objectContaining({
      headers: expect.objectContaining({ "X-Upload-Id": expect.any(String) }),
    }),
  );
  vi.unstubAllGlobals();
});
