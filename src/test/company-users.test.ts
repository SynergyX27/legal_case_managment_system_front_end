import { beforeEach, describe, expect, it } from "vitest";
import { useStore, canAccess } from "@/lib/store";
import { COMPANY_ID } from "@/lib/company";
const customer = {
  name: "New Customer",
  email: "new.customer@example.test",
  username: "new.customer",
  password: "Customer123!",
  company: "Customer Business",
  phone: "123456789",
  address: "12 Test Road",
};
beforeEach(() => {
  useStore.getState().resetDemo();
  useStore.getState().logout();
});
describe("Single company and customer access", () => {
  it("normalizes old organization records without losing cases or assignments", async () => {
    const s = useStore.getState();
    const old = {
      ...s,
      accounts: [{ id: "old", name: "Old company" }],
      activeAccountId: "old",
      users: s.users.map((u) => ({ ...u, accountId: "old", username: undefined })),
      clients: s.clients.map((c) => ({ ...c, accountId: "old" })),
      cases: s.cases.map((c) => ({ ...c, accountId: "old" })),
    };
    const migrated = (await useStore.persist.getOptions().migrate!(old, 2)) as typeof s;
    expect(migrated.accounts).toHaveLength(1);
    expect(migrated.activeAccountId).toBe(COMPANY_ID);
    expect(migrated.cases.map((c) => c.id)).toEqual(s.cases.map((c) => c.id));
    expect(migrated.cases.every((c) => c.accountId === COMPANY_ID)).toBe(true);
    expect(migrated.users.every((u) => u.accountId === COMPANY_ID)).toBe(true);
    expect(migrated.clients.every((c) => c.accountId === COMPANY_ID)).toBe(true);
  });
  it("supports chosen credentials, stores hashes and gives self-registered customers the same profile fields", async () => {
    expect(await useStore.getState().registerCustomer({ ...customer, role: "owner" })).toBe("");
    const me = useStore.getState().users.find((u) => u.username === customer.username)!;
    const c = useStore.getState().clients.find((c) => c.id === me.clientId)!;
    expect(me.role).toBe("customer");
    expect(c).toMatchObject({
      phone: customer.phone,
      address: customer.address,
      company: customer.company,
    });
    expect(me.passwordRecord?.hash).toHaveLength(64);
    expect(JSON.stringify(me)).not.toContain(customer.password);
    useStore.getState().logout();
    expect(await useStore.getState().login(customer.username, "wrongpass")).toBe(false);
    expect(
      await useStore.getState().login(customer.username.toUpperCase(), customer.password),
    ).toBe(true);
  });
  it("lets only an owner create users and assigns customer profiles through the same path", async () => {
    expect(await useStore.getState().createUser({ ...customer, role: "staff" })).not.toBe("");
    await useStore.getState().login("owner", "password123");
    expect(await useStore.getState().createUser({ ...customer, role: "customer" })).toBe("");
    expect(useStore.getState().sessionUserId).toBe("u1");
    const u = useStore.getState().users.find((u) => u.username === customer.username)!;
    expect(useStore.getState().clients.find((c) => c.id === u.clientId)).toMatchObject({
      phone: customer.phone,
      address: customer.address,
    });
    expect(
      await useStore.getState().createUser({
        ...customer,
        email: "staff@example.test",
        username: "newstaff",
        role: "staff",
      }),
    ).toBe("");
    await useStore.getState().login("newstaff", customer.password);
    expect(
      await useStore.getState().createUser({
        ...customer,
        email: "forbidden@example.test",
        username: "forbidden",
        role: "owner",
      }),
    ).not.toBe("");
  });
  it("validates duplicate usernames and controls role/password updates", async () => {
    await useStore.getState().login("owner", "password123");
    expect(await useStore.getState().createUser({ ...customer, role: "staff" })).toBe("");
    expect(
      await useStore
        .getState()
        .createUser({ ...customer, email: "other@example.test", role: "staff" }),
    ).not.toBe("");
    const id = useStore.getState().users.find((u) => u.username === customer.username)!.id;
    expect(
      await useStore.getState().updateUserAccess("u1", { role: "staff", status: "Active" }),
    ).not.toBe("");
    expect(
      await useStore
        .getState()
        .updateUserAccess(id, { role: "manager", status: "Active", password: "Changed123!" }),
    ).toBe("");
    expect(await useStore.getState().login(customer.username, customer.password)).toBe(false);
    expect(await useStore.getState().login(customer.username, "Changed123!")).toBe(true);
  });
  it("stores company documents separately and restricts upload/deletion to owners", async () => {
    const file = {
      id: "company-file",
      name: "Policy.txt",
      type: "other" as const,
      size: "1 KB",
      uploadedAt: "2026-11-07",
      uploadedBy: "Owner",
      url: "data:text/plain;base64,SGVsbG8=",
    };
    const count = useStore.getState().cases.flatMap((c) => c.attachments).length;
    expect(useStore.getState().addCompanyDocuments([file])).not.toBe("");
    await useStore.getState().login("owner", "password123");
    expect(useStore.getState().addCompanyDocuments([file])).toBe("");
    expect(useStore.getState().cases.flatMap((c) => c.attachments)).toHaveLength(count);
    await useStore.getState().login("staff", "password123");
    useStore.getState().deleteCompanyDocument(file.id);
    expect(useStore.getState().companyDocuments).toHaveLength(1);
    expect(canAccess("staff", "company-documents")).toBe(false);
    await useStore.getState().login("owner", "password123");
    useStore.getState().deleteCompanyDocument(file.id);
    expect(useStore.getState().companyDocuments).toHaveLength(0);
  });
});
