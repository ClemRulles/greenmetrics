import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useTheme } from '../../components/providers/ThemeProvider';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function TestComponent() {
  const { theme, toggle, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggle}>
        Toggle
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset document class
    document.documentElement.classList.remove('dark');
    document.documentElement.className = '';
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('dark');
    document.documentElement.className = '';
  });

  it('initializes with light theme by default', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('loads saved theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
  });

  it('falls back to system preference when no saved theme', () => {
    localStorageMock.getItem.mockReturnValue(null);
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('persists theme changes to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByTestId('toggle'));
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('applies dark class to document when theme is dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByTestId('set-dark'));
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from document when theme is light', () => {
    // Start with dark theme
    document.documentElement.classList.add('dark');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByTestId('set-light'));
    
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles between light and dark themes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Start with light theme
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    
    // Toggle to dark
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    
    // Toggle back to light
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    
    // Should not crash
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByTestId('toggle'));
    
    // Should still work even if localStorage fails
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });
});
