import type { Translate } from "../i18n/I18n";

/** An address with something before the @, a dot in the domain and no spaces: what a person can mistype, not RFC 5322. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The sign-in and sign-up forms keep their button active and say what is missing when it is pressed, instead of a
 * grey button that cannot be focused and does not say why. The server checks again; this only saves a round trip.
 */
export function credentialErrors(email: string, password: string, t: Translate, minLength = 0): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!email.trim()) errors.email = t("auth.needEmail");
  else if (!looksLikeEmail(email)) errors.email = t("auth.badEmail");
  if (!password) errors.password = t("auth.needPassword");
  else if (password.length < minLength) errors.password = t("auth.short");
  return errors;
}

/** Moves focus to the first field marked invalid once React has drawn the errors. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
}
