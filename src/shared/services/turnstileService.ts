/**
 * Cloudflare Turnstile CAPTCHA Integration
 * Prevent spam form submissions
 */

export interface TurnstileConfig {
  siteKey: string;
}

export interface TurnstileOptions {
  theme?: 'light' | 'dark';
  tabindex?: number;
  responseFieldName?: string;
}

/**
 * Initialize Turnstile on page load
 * This function should be called in your main layout component
 */
export function initializeTurnstile(): void {
  // Load Turnstile script
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

/**
 * Render Turnstile widget
 * Call this after DOM element with id is ready
 */
export function renderTurnstile(
  containerId: string,
  siteKey: string,
  options: TurnstileOptions = {}
): void {
  const { theme = 'light', tabindex = 0 } = options;

  if (!(window as any).turnstile) {
    console.error('Turnstile script not loaded');
    return;
  }

  (window as any).turnstile.render(`#${containerId}`, {
    siteKey,
    theme,
    tabindex,
  });
}

/**
 * Reset Turnstile widget
 */
export function resetTurnstile(containerId?: string): void {
  if (!(window as any).turnstile) return;

  if (containerId) {
    (window as any).turnstile.reset(`#${containerId}`);
  } else {
    (window as any).turnstile.reset();
  }
}

/**
 * Remove Turnstile widget
 */
export function removeTurnstile(containerId: string): void {
  if (!(window as any).turnstile) return;
  (window as any).turnstile.remove(`#${containerId}`);
}

/**
 * Get Turnstile response token
 * Call this when user submits the form
 */
export function getTurnstileToken(): string | null {
  if (!(window as any).turnstile) return null;
  return (window as any).turnstile.getResponse();
}

/**
 * Verify token on backend
 * Note: Verification should be done on server side for security
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string
): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return false;
  }
}

/**
 * Turnstile configuration for different form types
 */
export const TURNSTILE_CONFIGS = {
  forms: {
    siteKey: process.env.REACT_APP_TURNSTILE_SITE_KEY || '',
  },
};

/**
 * Check if Turnstile is configured
 */
export function isTurnstileConfigured(): boolean {
  return TURNSTILE_CONFIGS.forms.siteKey !== '';
}
