// Ensure browser runtime has a minimal process polyfill for libraries that expect it.
if (typeof window !== 'undefined') {
  const makeNextTick = () => {
    return (fn, ...args) => {
      if (typeof fn !== 'function') {
        throw new TypeError('process.nextTick callback is not a function');
      }
      return Promise.resolve().then(() => fn(...args));
    };
  };

  if (typeof window.process === 'undefined') {
    window.process = {
      env: {
        NODE_ENV: 'development',
        REACT_APP_SERVER_URL: window.REACT_APP_SERVER_URL || 'http://localhost:4000',
      },
      browser: true,
      nextTick: makeNextTick(),
    };
  } else {
    if (typeof window.process.nextTick !== 'function') {
      window.process.nextTick = makeNextTick();
    }
    if (!window.process.env) {
      window.process.env = {
        NODE_ENV: 'development',
        REACT_APP_SERVER_URL: window.REACT_APP_SERVER_URL || 'http://localhost:4000',
      };
    }
    window.process.browser = true;
  }

  if (typeof globalThis !== 'undefined') {
    if (typeof globalThis.process === 'undefined') {
      globalThis.process = window.process;
    } else if (typeof globalThis.process.nextTick !== 'function') {
      globalThis.process.nextTick = makeNextTick();
    }
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
