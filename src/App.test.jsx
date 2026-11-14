import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App.jsx';

describe('App', () => {
  it('starts on the home screen', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Mission Link');
    expect(html).toContain('Play on one device');
  });
});
