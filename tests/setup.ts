// Vitest setup file to configure the test environment
// Ensures consistent behavior between command line and VS Code Vitest extension
import { vi, describe, it, expect } from 'vitest';

process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--experimental-vm-modules';
