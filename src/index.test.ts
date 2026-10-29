import { describe, expect, it } from 'vitest';

import { run } from './index.ts';

describe('run', () => {
  it('echoes args', () => {
    expect(run(['a', 'b'])).toEqual({ code: 0, stdout: 'justify-disable a b\n' });
  });
});
