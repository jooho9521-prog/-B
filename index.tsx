
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Vercel 등 브라우저 환경에서 process.env 접근 시 크래시 방지를 위한 폴리필
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  // LocalStorage에 저장된 키가 있다면 초기값으로 설정
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey) {
    win.process.env.API_KEY = savedKey;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
