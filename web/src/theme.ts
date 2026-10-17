const KEY = "borderless-theme";

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function currentTheme(): "light" | "dark" {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Light/dark toggle. Follows the OS until the user picks one. */
export function setupTheme(button: HTMLButtonElement, onChange: () => void): void {
  const stored = readStored();
  if (stored === "light" || stored === "dark") document.documentElement.dataset.theme = stored;
  const render = () => {
    const theme = currentTheme();
    button.textContent = theme === "dark" ? "☀" : "☾";
    button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  };
  render();
  button.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    render();
    onChange();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    render();
    onChange();
  });
}
