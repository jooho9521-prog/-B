
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Vercel 등 브라우저 환경에서 process.env 접근 시 크래시 방지를 위한 폴리필
// window 객체에 process 프로퍼티가 정의되어 있지 않은 경우 발생하는 ReferenceError를 방지합니다.
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
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
