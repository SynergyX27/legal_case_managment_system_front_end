import * as React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./select";
import { cn } from "@/lib/utils";

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size">;
// Keeps existing form values and handlers while rendering an accessible themed menu.
export function ModernSelect({children, value, defaultValue, onChange, disabled, required, name, id, className, ...props}: Props) {
  const [local, setLocal] = React.useState(String(defaultValue ?? ""));
  const selected = value === undefined ? local : String(value);
  const encode = (v: string) => `option:${v}`;
  function options(nodes: React.ReactNode): React.ReactNode {
    return React.Children.map(nodes, node => {
      if (!React.isValidElement<{value?: string | number; disabled?: boolean; children?: React.ReactNode; label?: string}>(node)) return null;
      if (node.type === React.Fragment) return options(node.props.children);
      if (node.type === "optgroup") return <SelectGroup><SelectLabel>{node.props.label}</SelectLabel>{options(node.props.children)}</SelectGroup>;
      if (node.type !== "option") return null;
      const v = String(node.props.value ?? node.props.children ?? "");
      return <SelectItem value={encode(v)} disabled={node.props.disabled}>{node.props.children}</SelectItem>;
    });
  }
  function emptyLabel(nodes: React.ReactNode): React.ReactNode {
    for (const node of React.Children.toArray(nodes)) {
      if (!React.isValidElement<{value?: string; children?: React.ReactNode}>(node)) continue;
      if (node.type === "option" && node.props.value === "") return node.props.children;
      if (node.type === React.Fragment || node.type === "optgroup") {
        const label = emptyLabel(node.props.children);
        if (label) return label;
      }
    }
    return null;
  }
  return <Select value={selected === "" ? "" : encode(selected)} onValueChange={v => {
    const next = v.slice(7);
    setLocal(next);
    const target = {value: next, name: name || "", id: id || ""} as HTMLSelectElement;
    onChange?.({target, currentTarget: target, type: "change"} as React.ChangeEvent<HTMLSelectElement>);
  }} disabled={disabled} required={required} name={name}>
    <SelectTrigger id={id} aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]} aria-invalid={props["aria-invalid"]} title={props.title} className={cn(className, "min-h-10 rounded-xl border-input bg-card px-3 text-left shadow-sm transition-colors hover:border-primary/50 focus:ring-2")}>
      <SelectValue placeholder={emptyLabel(children) || "Select an option"} />
    </SelectTrigger>
    <SelectContent position="popper" className="max-h-80 rounded-xl border-border p-1 shadow-xl">{options(children)}</SelectContent>
  </Select>;
}
