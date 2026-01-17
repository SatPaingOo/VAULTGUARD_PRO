/**
 * TypeScript definitions for Google AI Studio browser extension API
 * This interface is used when the AI Studio extension is installed
 */

interface AIStudio {
  /**
   * Opens the API key selection dialog
   * @returns Promise that resolves when dialog is closed
   */
  openSelectKey?: () => Promise<void>;
  
  /**
   * Checks if an API key has been selected
   * @returns Promise<boolean> indicating if a key is available
   */
  hasSelectedApiKey?: () => Promise<boolean>;
  
  /**
   * Gets the currently selected API key (if available)
   * @returns Promise<string | null> The API key or null if not available
   */
  getSelectedApiKey?: () => Promise<string | null>;
}

interface Window {
  /**
   * Google AI Studio browser extension API
   * Available when AI Studio extension is installed
   */
  aistudio?: AIStudio;
}
