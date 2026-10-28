import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

const feature = await loadFeature(
  join(import.meta.dirname, '../../features/smoke.feature'),
);

describeFeature(feature, ({ Scenario }) => {
  Scenario('Smoke test passes', ({ Given, When, Then }) => {
    let ran = false;

    Given('the converter package exists', () => {
      expect(feature).toBeDefined();
    });

    When('the smoke check runs', () => {
      ran = true;
    });

    Then('the smoke check succeeds', () => {
      expect(ran).toBe(true);
    });
  });
});
