/**
 * Chat Interface Entry Point
 * 
 * Standalone entry for the chat interface demonstration
 */

import { createRoot } from 'react-dom/client';
import { ChatInterface } from './ChatInterface';

// Bootstrap the chat interface
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<ChatInterface />);
}
