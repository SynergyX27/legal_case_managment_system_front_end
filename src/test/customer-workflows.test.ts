import { beforeEach, describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { canMessage, canReadConversation, visibleCasesFor } from "@/lib/access";
import { caseBilling } from "@/lib/billing";
describe("Customer portal and case billing", () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
    useStore.getState().logout();
  });
  it("limits customer cases to the linked client and refuses unlinked customers", async () => {
    const s = buildSeed(),
      me = s.users.find((u) => u.role === "customer")!;
    expect(visibleCasesFor(me, s.cases, s.clients).every((c) => c.clientId === me.clientId)).toBe(
      true,
    );
    expect(visibleCasesFor({ ...me, clientId: undefined }, s.cases, s.clients)).toEqual([]);
  });
  it("allows assigned staff and owner contacts but rejects unrelated customers", async () => {
    const s = buildSeed(),
      me = s.users.find((u) => u.role === "customer")!,
      c = s.cases.find((c) => c.clientId === me.clientId)!;
    expect(
      canMessage(
        me,
        s.users.find((u) => u.id === c.staffId),
        s.cases,
      ),
    ).toBe(true);
    expect(
      canMessage(
        me,
        s.users.find((u) => u.role === "owner"),
        s.cases,
      ),
    ).toBe(true);
    expect(canMessage(me, { ...me, id: "other", clientId: "another" }, s.cases)).toBe(false);
    const unrelated = s.users.find(
      (u) =>
        u.role === "staff" &&
        !s.cases.some((c) => c.clientId === me.clientId && c.staffId === u.id),
    );
    if (unrelated) expect(canMessage(me, unrelated, s.cases)).toBe(false);
    expect(canReadConversation(me, s.conversations[0], s.users, s.cases)).toBe(false);
  });
  it("aggregates many invoices without the last invoice overwriting earlier payment status", async () => {
    const s = useStore.getState();
    await s.login("owner@legalflow.demo", "password123");
    const c = s.cases[0],
      base = {
        ...s.invoices[0],
        caseId: c.id,
        clientId: c.clientId,
        lines: [{ description: "Service", qty: 1, price: 100 }],
        taxRate: 0,
      };
    useStore.setState({ invoices: [] });
    useStore.getState().upsertInvoice({ ...base, id: "a", number: "A", status: "Paid" });
    useStore.getState().upsertInvoice({ ...base, id: "b", number: "B", status: "Sent" });
    useStore.getState().upsertInvoice({ ...base, id: "c", number: "C", status: "Draft" });
    const b = caseBilling(useStore.getState().invoices, c.id);
    expect(b).toMatchObject({
      count: 3,
      balance: 100,
      totalPaid: 100,
      lastPayment: 100,
      paymentStatus: "Partial",
    });
    expect(useStore.getState().cases.find((x) => x.id === c.id)?.paymentStatus).toBe("Partial");
  });
  it("registers a separate customer profile and prevents claiming an existing email profile", async () => {
    const s = useStore.getState();
    expect(
      await s.registerCustomer({
        name: "New Customer",
        email: "new@example.test",
        company: "Example",
        username: "newcustomer",
        password: "password123",
      }),
    ).toBe("");
    const me = useStore.getState().users.find((u) => u.id === useStore.getState().sessionUserId)!;
    expect(me.role).toBe("customer");
    expect(me.clientId).toBeTruthy();
    expect(
      visibleCasesFor(me, useStore.getState().cases, useStore.getState().clients),
    ).toHaveLength(0);
    useStore.getState().logout();
    expect(
      await useStore
        .getState()
        .registerCustomer({
          name: "Claim",
          email: s.clients[1].email,
          username: "claim",
          password: "password123",
        }),
    ).not.toBe("");
  });
  it("lets owner link an existing client and prevents customer invoice edits", async () => {
    await useStore.getState().login("owner@legalflow.demo", "password123");
    const client = useStore.getState().clients[1];
    expect(
      await useStore
        .getState()
        .registerCustomer({
          name: client.name,
          email: "linked@example.test",
          company: client.company,
          clientId: client.id,
          username: "linked",
          password: "password123",
        }),
    ).toBe("");
    useStore.getState().logout();
    await useStore.getState().login("linked@example.test", "password123");
    const inv = useStore.getState().invoices[0],
      before = useStore.getState().invoices;
    useStore.getState().upsertInvoice({ ...inv, status: "Paid" });
    expect(useStore.getState().invoices).toBe(before);
  });
  it("persists chat replies and blocks access by another customer", async () => {
    await useStore.getState().login("customer@legalflow.demo", "password123");
    const id = useStore.getState().startChat("u1");
    expect(id).toBeTruthy();
    useStore.getState().sendMessage(id, "Customer question");
    useStore.getState().logout();
    await useStore.getState().login("owner@legalflow.demo", "password123");
    useStore.getState().sendMessage(id, "Owner reply");
    expect(
      useStore
        .getState()
        .conversations.find((c) => c.id === id)
        ?.messages.map((m) => m.text),
    ).toEqual(["Customer question", "Owner reply"]);
    useStore.getState().logout();
    await useStore
      .getState()
      .registerCustomer({
        name: "Other",
        email: "other@example.test",
        company: "Other",
        username: "other",
        password: "password123",
      });
    useStore.getState().sendMessage(id, "Forbidden");
    expect(useStore.getState().conversations.find((c) => c.id === id)?.messages).toHaveLength(2);
  });
});
