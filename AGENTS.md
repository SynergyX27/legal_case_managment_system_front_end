<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Dashboard and Case Files derive their records from the existing Zustand demo store so all local edits stay synchronized.
- Keep case filtering, sorting, summaries and CSV formatting in a shared browser-safe module so their behavior can be tested independently.
- Keep client metrics and calendar scheduling calculations in a shared browser-safe module so page logic stays testable.
- Documents are flattened from case attachments; local upload content uses data URLs with a shared 2 MB budget to fit browser persistence, while fictional seed files are metadata-only.
