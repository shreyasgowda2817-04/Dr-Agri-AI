import { describe, it, expect } from 'vitest';
import i18n from '../i18n';

describe('i18n Multi-Language System', () => {
  it('loads English translation keys properly', () => {
    expect(i18n.getResource('en', 'translation', 'ai_disease_scan')).toBeTruthy();
    expect(i18n.getResource('en', 'translation', 'marketplace')).toBeTruthy();
  });

  it('loads Kannada translation keys properly', () => {
    const knScan = i18n.getResource('kn', 'translation', 'ai_disease_scan');
    expect(knScan).toBeTruthy();
  });

  it('loads Hindi translation keys properly', () => {
    const hiScan = i18n.getResource('hi', 'translation', 'ai_disease_scan');
    expect(hiScan).toBeTruthy();
  });
});
