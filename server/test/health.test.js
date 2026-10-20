import { test, describe } from 'node:test';
import assert from 'node:assert';
import { assessRoutes } from '../src/api/routes.js';

describe('health check route assessment', () => {
  test('assessRoutes inspects cached timetable files and returns categorized stats', () => {
    const stats = assessRoutes();
    assert.ok(typeof stats.totalFerries === 'number');
    assert.ok(typeof stats.cached === 'number');
    assert.ok(typeof stats.fresh === 'number');
    assert.ok(typeof stats.dormant === 'number');
    assert.ok(typeof stats.errors === 'number');
    assert.ok(Array.isArray(stats.failedSlugs));
    // Cached files should equal fresh + dormant + errors
    assert.strictEqual(stats.cached, stats.fresh + stats.dormant + stats.errors);
    // There shouldn't be parse errors in normal test data
    assert.strictEqual(stats.errors, 0);
  });
});
