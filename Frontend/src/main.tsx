import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { RouterProvider, createRouter } from '@tanstack/react-router';

import './index.css';
import { routeTree } from './routeTree.gen';

const routerBasePath =
  import.meta.env.BASE_URL === '/'
    ? '/'
    : import.meta.env.BASE_URL.replace(/\/$/, '');

const router = createRouter({ routeTree, basepath: routerBasePath });

// Đăng ký kiểu dữ liệu cho TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
