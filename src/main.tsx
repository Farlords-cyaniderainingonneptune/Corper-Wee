import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initClientErrorReporting } from './utils/errorReporter';

initClientErrorReporting();

createRoot(document.getElementById('root')!).render(<App />);
