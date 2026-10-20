import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pickVariant, getHelsinkiDay } from '../../client/src/hooks/useFerrySelector.js';

describe('variant selection and midnight switching', () => {
  const barosundVariants = [
    { slug: 'barosund-ma-fre-1.6.2024-alkaen', dayPattern: 'mon-fri' },
    { slug: 'barosund-lo-so', dayPattern: 'sat-sun' },
  ];

  test('picks mon-fri variant on Friday at 23:59:59 Helsinki time', () => {
    // 2026-10-23 is Friday. 23:59:59 Helsinki time is 20:59:59 UTC
    const fridayNight = new Date('2026-10-23T20:59:59.000Z');
    assert.strictEqual(getHelsinkiDay(fridayNight), 5); // Friday
    const variant = pickVariant(barosundVariants, fridayNight);
    assert.strictEqual(variant.slug, 'barosund-ma-fre-1.6.2024-alkaen');
  });

  test('picks sat-sun variant on Saturday at 00:00:01 Helsinki time', () => {
    // 2026-10-24 is Saturday. 00:00:01 Helsinki time is 21:00:01 UTC on Oct 23
    const saturdayMorning = new Date('2026-10-23T21:00:01.000Z');
    assert.strictEqual(getHelsinkiDay(saturdayMorning), 6); // Saturday
    const variant = pickVariant(barosundVariants, saturdayMorning);
    assert.strictEqual(variant.slug, 'barosund-lo-so');
  });

  test('picks sat-sun variant on Sunday', () => {
    // 2026-10-25 is Sunday. 12:00:00 Helsinki time
    const sundayNoon = new Date('2026-10-25T09:00:00.000Z');
    assert.strictEqual(getHelsinkiDay(sundayNoon), 0); // Sunday
    const variant = pickVariant(barosundVariants, sundayNoon);
    assert.strictEqual(variant.slug, 'barosund-lo-so');
  });

  test('switches back to mon-fri on Monday at 00:00:01 Helsinki time', () => {
    // 2026-10-26 is Monday. 00:00:01 Helsinki time is 22:00:01 UTC on Oct 25
    const mondayMorning = new Date('2026-10-25T22:00:01.000Z');
    assert.strictEqual(getHelsinkiDay(mondayMorning), 1); // Monday
    const variant = pickVariant(barosundVariants, mondayMorning);
    assert.strictEqual(variant.slug, 'barosund-ma-fre-1.6.2024-alkaen');
  });
});
