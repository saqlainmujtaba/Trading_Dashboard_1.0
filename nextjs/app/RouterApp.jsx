'use client';

import { BrowserRouter } from 'react-router-dom';
import App from '../src/App';

export default function RouterApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
