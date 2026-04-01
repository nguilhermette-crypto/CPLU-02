import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix for libraries (like jspdf) trying to overwrite window.fetch in environments where it's a getter-only
if (typeof window !== 'undefined') {
  // Try to redefine window.fetch with a no-op setter
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      Object.defineProperty(window, 'fetch', {
        get() { return originalFetch; },
        set() { /* ignore assignments */ },
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    // If we can't redefine it on window, we'll rely on the Proxy for 'global'
  }

  // Use a Proxy for 'global' to intercept and ignore assignments to 'fetch'
  // This prevents errors when libraries try to polyfill fetch on the global object
  const proxy = new Proxy(window, {
    set(target, prop, value) {
      if (prop === 'fetch') {
        return true; // Indicate success without doing anything
      }
      try {
        (target as any)[prop] = value;
      } catch (e) {
        // ignore errors on read-only properties
      }
      return true;
    },
    get(target, prop) {
      const value = (target as any)[prop];
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  });

  try {
    (window as any).global = proxy;
  } catch (e) {}
  
  try {
    (window as any).globalThis = proxy;
  } catch (e) {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
