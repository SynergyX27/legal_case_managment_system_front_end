# Development notes

Preserve published repository history. The frontend uses the separate JavaScript backend for every business record. Do not introduce browser-persisted business data, seeded accounts or authentication shortcuts. Only theme preferences belong in localStorage. Permissions must be enforced again by the API. Keep shared filtering, reporting and billing calculations browser-safe and testable. Await mutations before showing success or dismissing a form.
