import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Ensure TextEncoder/TextDecoder are available (usually available in Node env)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

// Basic ReadableStream polyfill or usage from node 'stream/web' if needed
// Vitest with jsdom environment might lack ReadableStream.
// We can use the one from node's stream/web or just rely on global if present.
// Let's check if it needs to be assigned.
import { ReadableStream } from 'stream/web';
// @ts-ignore
global.ReadableStream = ReadableStream;
