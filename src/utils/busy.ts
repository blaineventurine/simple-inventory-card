/** How long a button stays busy after its work ends, so a quick second tap is not a second run. */
const RELEASE_DELAY_MS = 200;

/**
 * Runs `work` with `button` busy: disabled, `aria-busy`, `data-processing` (the click handler
 * drops taps on it) and the `si-busy` look. Released shortly after `work` settles.
 */
export async function withBusy<T>(button: HTMLElement, work: () => Promise<T>): Promise<T> {
  button.setAttribute('data-processing', 'true');
  button.setAttribute('disabled', 'true');
  button.setAttribute('aria-busy', 'true');
  button.classList.add('si-busy');
  try {
    return await work();
  } finally {
    setTimeout(() => {
      button.removeAttribute('data-processing');
      button.removeAttribute('disabled');
      button.removeAttribute('aria-busy');
      button.classList.remove('si-busy');
    }, RELEASE_DELAY_MS);
  }
}
