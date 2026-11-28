// Older-server and transport fallbacks. Keep business-specific guidance from the API.
export function userErrorMessage(message: unknown, status = 0) {
  const text = typeof message === "string" ? message : "";
  if (/Security token expired/.test(text))
    return "Your session needs refreshing. Refresh the page and try again. If it continues, sign out and sign in again.";
  if (
    /unreadable response|API endpoint not found|Request failed|Internal Server Error|^Input: Invalid$/.test(
      text,
    ) ||
    !text
  ) {
    if (status === 401) return "Please sign in again to continue.";
    if (status === 403)
      return "Your account cannot perform this action. Ask your administrator to check your role and case or community access.";
    return "LegalFlow could not finish this action. Refresh the item and check whether your change was saved before trying again. If it continues, contact your administrator.";
  }
  return text;
}
