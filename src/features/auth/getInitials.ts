/**
 * Computes up to 2 uppercase initials from a display name or fallback email.
 *
 * Examples:
 * - "John Doe" -> "JD"
 * - "John" -> "J"
 * - "John Middle Doe" -> "JD"
 * - "  alex   smith  " -> "AS"
 * - null, "user@example.com" -> "U"
 * - null, null -> "?"
 */
export function getInitials(
  nameOrUser?:
    { displayName?: string | null; email?: string | null } | string | null,
  fallbackEmail?: string | null,
): string {
  let nameStr: string | null | undefined;
  let emailStr: string | null | undefined = fallbackEmail;

  if (typeof nameOrUser === 'object' && nameOrUser !== null) {
    nameStr = nameOrUser.displayName;
    emailStr = nameOrUser.email ?? fallbackEmail;
  } else {
    nameStr = nameOrUser;
  }

  const trimmedName = nameStr?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return (parts[0]?.[0] ?? '').toUpperCase();
    }
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }

  const trimmedEmail = emailStr?.trim();
  if (trimmedEmail) {
    return (trimmedEmail[0] ?? '').toUpperCase();
  }

  return '?';
}
