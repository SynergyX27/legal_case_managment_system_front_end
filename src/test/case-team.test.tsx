import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
vi.mock("@/lib/api", () => ({ api: vi.fn(async () => ({ ok: true })) }));
import { CaseTeam } from "@/components/lf/case-team";
const rows = [
  {
    id: "case-a",
    updatedAt: "2026-11-26T00:00:00.000Z",
    staffId: "primary",
    managerId: "manager",
    teamMemberIds: ["extra"],
  },
] as any;
function setup(role = "owner") {
  useStore.setState({
    sessionUserId: "actor",
    refresh: vi.fn(async () => {}),
    users: [
      { id: "actor", name: "Actor", role, status: "Active" },
      { id: "extra", name: "Extra staff", role: "staff", status: "Active", managerId:"actor" },
      { id: "another", name: "Another manager", role: "manager", status: "Active" },
      { id: "customer", name: "Customer", role: "customer", status: "Active" },
    ] as any,
  });
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("preserves selected members and replaces only the additional team on a single case", async () => {
  setup();
  render(<CaseTeam rows={rows} />);
  fireEvent.click(screen.getByRole("button", { name: "Assign team" }));
  expect(screen.getByRole("checkbox", { name: /Extra staff/ })).toBeChecked();
  expect(screen.queryByRole("checkbox", { name: /Customer/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: /Another manager/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save team" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith("/cases/team", {
      method: "PATCH",
      body: {
        cases: [{ id: "case-a", updatedAt: rows[0].updatedAt }],
        memberIds: ["extra", "another"],
        mode: "replace",
      },
    }),
  );
});
it("adds team members to multiple cases without replacing existing teams", async () => {
  setup("manager");
  render(<CaseTeam rows={[...rows, { ...rows[0], id: "case-b" }]} />);
  fireEvent.click(screen.getByRole("button", { name: /Assign team/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Extra staff/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save team" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/cases/team",
      expect.objectContaining({
        body: expect.objectContaining({ mode: "add", memberIds: ["extra"] }),
      }),
    ),
  );
});
it("does not offer assignment controls to staff", () => {
  setup("staff");
  render(<CaseTeam rows={rows} />);
  expect(screen.queryByRole("button", { name: "Assign team" })).not.toBeInTheDocument();
});

it('locks owner-assigned managers and foreign staff while sending only editable staff IDs',async()=>{
 setup('manager');useStore.setState({users:[...useStore.getState().users,{id:'foreign',name:'Other staff',role:'staff',managerId:'another',status:'Active'}] as any});
 render(<CaseTeam rows={[{...rows[0],teamMemberIds:['extra','another','foreign']}]}/>);
 fireEvent.click(screen.getByRole('button',{name:'Assign team'}));
 expect(screen.getByRole('checkbox',{name:/Another manager/})).toBeDisabled();
 expect(screen.getByRole('checkbox',{name:/Other staff/})).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox',{name:/Extra staff/}));
 fireEvent.click(screen.getByRole('button',{name:'Save team'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/cases/team',expect.objectContaining({body:expect.objectContaining({memberIds:[],mode:'replace'})})));
});
