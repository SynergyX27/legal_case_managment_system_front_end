import { permissionActions, eligiblePermission } from "@/lib/role-profiles";
export function PermissionChecklist({
  defaults,
  overrides,
  onChange,
  disabled = false,
  ceiling = false,
  baseRole,
}: {
  defaults: Record<string, boolean>;
  overrides: Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
  disabled?: boolean;
  ceiling?: boolean;
  baseRole?: string;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="mb-2 text-sm font-semibold">Permissions</legend>
      <p className="text-xs text-muted-foreground">
        Checked permissions are allowed within the person's case access. Uncheck to remove access.
        Individual exceptions take priority over role defaults.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {permissionActions.map(([key, label]) => (
          <label key={key} className="flex gap-2 items-start rounded-lg border p-3 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={overrides[key] ?? defaults[key] ?? false}
              disabled={
                disabled || !eligiblePermission(baseRole, key) || (ceiling && !defaults[key])
              }
              onChange={(e) => {
                const next = { ...overrides };
                if (e.target.checked === !!defaults[key]) delete next[key];
                else next[key] = e.target.checked;
                onChange(next);
              }}
            />
            <span>
              {label}
              {overrides[key] !== undefined && (
                <span className="block text-muted-foreground">Personal exception</span>
              )}
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="text-xs text-primary underline"
        disabled={disabled}
        onClick={() => onChange({})}
      >
        Reset to role defaults
      </button>
    </fieldset>
  );
}
