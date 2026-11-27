type FileInfo = { name?: string; mime?: string; type?: string };
export function fileTypeInfo(file: FileInfo) {
  const ext = file.name?.split(".").pop()?.toLowerCase(),
    mime = file.mime?.toLowerCase() || "";
  if (ext === "pdf" || file.type === "pdf" || mime === "application/pdf")
    return { kind: "pdf", label: "PDF", name: "PDF document", color: "#dc3545" };
  if (
    ["xls", "xlsx", "xlsm", "xlsb", "csv"].includes(ext || "") ||
    file.type === "excel" ||
    mime.includes("spreadsheet") ||
    mime.includes("ms-excel") ||
    mime === "text/csv"
  )
    return {
      kind: "excel",
      label: ["csv", "xls", "xlsm", "xlsb"].includes(ext || "") ? ext!.toUpperCase() : "XLSX",
      name: "Excel spreadsheet",
      color: "#16834b",
    };
  if (["doc", "docx"].includes(ext || "") || file.type === "word" || mime.includes("word"))
    return { kind: "word", label: "DOC", name: "Word document", color: "#2867bd" };
  if (file.type === "video" || mime.startsWith("video/"))
    return { kind: "video", label: "VIDEO", name: "Video file", color: "#7c3aed" };
  return {
    kind: "other",
    label: ext && ext.length <= 6 ? ext.toUpperCase() : "FILE",
    name: "Document file",
    color: "#64748b",
  };
}
export function FileTypeBadge({ file, compact = false }: { file: FileInfo; compact?: boolean }) {
  const info = fileTypeInfo(file);
  return (
    <span className={`fm-file-badge ${compact ? "is-compact" : ""}`} data-kind={info.kind}>
      <svg
        viewBox="0 0 100 116"
        width={compact ? 44 : 86}
        height={compact ? 51 : 100}
        role="img"
        aria-label={info.name}
      >
        <path
          d="M26 7h39l20 20v74a7 7 0 0 1-7 7H26a7 7 0 0 1-7-7V14a7 7 0 0 1 7-7Z"
          fill="var(--card)"
          stroke={info.color}
          strokeWidth="2"
        />
        <path d="M65 8v15a5 5 0 0 0 5 5h14" fill="none" stroke={info.color} strokeWidth="2" />
        {info.kind === "excel" ? (
          <g fill="none" stroke={info.color} strokeWidth="2" opacity=".8">
            <rect x="36" y="39" width="34" height="28" rx="2" />
            <path d="M36 48h34M36 57h34M48 39v28M59 39v28" />
          </g>
        ) : info.kind === "video" ? (
          <path d="m44 38 22 13-22 13Z" fill={info.color} />
        ) : (
          <g stroke={info.color} strokeWidth="2.5" strokeLinecap="round" opacity=".65">
            <path d="M36 42h33M36 52h25M36 62h29" />
          </g>
        )}
        <rect x="8" y="75" width="76" height="26" rx="5" fill={info.color} />
        <text
          x="46"
          y="92.5"
          textAnchor="middle"
          fontFamily="Arial,sans-serif"
          fontWeight="700"
          fontSize={info.label.length > 4 ? 12 : 15}
          letterSpacing="1"
          fill="white"
        >
          {info.label}
        </text>
      </svg>
    </span>
  );
}
