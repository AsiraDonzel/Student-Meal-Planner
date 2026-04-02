/**
 * security.js – Handles Web Crypto API for full-app data encryption.
 * Uses PBKDF2 for key derivation and AES-GCM for encryption.
 */

const Security = (() => {
  const SALT_KEY = 'smp_vault_salt';
  const DATA_KEY = 'smp_vault_data';
  const VERIFY_KEY = 'smp_vault_verify'; // Stores a constant encrypted to verify password
  
  let masterKey = null;

  /**
   * Derives a cryptographic key from a password and salt.
   */
  async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import raw password as a key base
    const baseKey = await crypto.subtle.importKey(
      'raw', passwordBuffer, 'PBKDF2', false, ['deriveKey']
    );

    // Derive the final AES-GCM key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a string of data using the masterKey.
   */
  async function encrypt(plaintext) {
    if (!masterKey) throw new Error('No master key available');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      masterKey,
      data
    );

    // Combine IV and Ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts a base64 string using the masterKey.
   */
  async function decrypt(base64Data) {
    if (!masterKey) throw new Error('No master key available');

    const combined = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      masterKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Initializes the vault with a new password.
   */
  async function setup(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    masterKey = await deriveKey(password, salt);
    
    // Save salt
    localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
    
    // Create verification token (encrypt "VERIFIED")
    const verifyToken = await encrypt("VERIFIED");
    localStorage.setItem(VERIFY_KEY, verifyToken);

    // Save session unlock token for 1 hour
    sessionStorage.setItem('smp_session', JSON.stringify({ pass: password, time: Date.now() }));

    return true;
  }

  /**
   * Unlocks the vault with an existing password.
   */
  async function unlock(password) {
    const saltBase64 = localStorage.getItem(SALT_KEY);
    if (!saltBase64) return false;

    const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
    const potentialKey = await deriveKey(password, salt);
    
    // Verify key by attempting to decrypt the verification token
    const verifyToken = localStorage.getItem(VERIFY_KEY);
    if (!verifyToken) return false;

    try {
      // Temporarily set masterKey to test decryption
      const prevKey = masterKey;
      masterKey = potentialKey;
      const result = await decrypt(verifyToken);
      
      if (result === "VERIFIED") {
        sessionStorage.setItem('smp_session', JSON.stringify({ pass: password, time: Date.now() }));
        return true; // masterKey is already set to potentialKey
      } else {
        masterKey = prevKey;
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /**
   * Attempts to automatically unlock using the session token if within 1 hour.
   */
  async function autoUnlock() {
    try {
      const sessionData = sessionStorage.getItem('smp_session');
      if (!sessionData) return false;
      const { pass, time } = JSON.parse(sessionData);
      
      // Check 1-hour expiration
      if (Date.now() - time > 1000 * 60 * 60) {
        sessionStorage.removeItem('smp_session');
        return false;
      }

      // Refresh the timestamp and attempt unlock
      const success = await unlock(pass);
      if (success) {
        sessionStorage.setItem('smp_session', JSON.stringify({ pass, time: Date.now() }));
      }
      return success;
    } catch(err) {
      return false;
    }
  }

  /**
   * Save full app state to encrypted vault.
   */
  async function saveAppState(state) {
    if (!masterKey) return;
    const encrypted = await encrypt(JSON.stringify(state));
    localStorage.setItem(DATA_KEY, encrypted);
  }

  /**
   * Load full app state from encrypted vault.
   */
  async function loadAppState() {
    if (!masterKey) return null;
    const encrypted = localStorage.getItem(DATA_KEY);
    if (!encrypted) return null;

    try {
      const decrypted = await decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (e) {
      console.error('Decryption failed', e);
      return null;
    }
  }

  /**
   * Migration: Collects all legacy smp_* keys and wraps them into a state object.
   */
  function getLegacyData() {
    const legacyKeys = [
      'allowance', 'savingsGoal', 'foodItems', 
      'smp_spendingHistory', 'smp_savedWeeklyPlan', 
      'userProfile', 'smp_user'
    ];
    
    const state = {};
    let found = false;

    legacyKeys.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          state[key] = JSON.parse(val);
        } catch (e) {
          state[key] = val;
        }
        found = true;
      }
    });

    return found ? state : null;
  }

  function clearLegacyData() {
    const legacyKeys = [
      'allowance', 'savingsGoal', 'foodItems', 
      'smp_spendingHistory', 'smp_savedWeeklyPlan', 
      'userProfile', 'smp_user'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  }

  function resetVault() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  }

  return {
    isSetup: () => !!localStorage.getItem(SALT_KEY),
    setup,
    unlock,
    autoUnlock,
    saveAppState,
    loadAppState,
    getLegacyData,
    clearLegacyData,
    isUnlocked: () => masterKey !== null,
    resetVault
  };
})();
