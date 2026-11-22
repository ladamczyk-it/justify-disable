import type { CSSProperties, ReactNode } from 'react';

import styles from './styles.module.css';

/**
 * Rows of the mock `src/app.ts` in the final frame; `--i` staggers each row's
 * entry and check. The `inserted` row is the fix that slides in, the `flagged`
 * row the directive it justifies.
 */
const ROWS = [
  { line: '/**', checked: true },
  { line: ' * @todo Legacy API returns `any`; type it once the SDK is upgraded.', checked: true },
  { line: ' */', checked: true },
  { line: '// eslint-disable-next-line @typescript-eslint/no-explicit-any', checked: true },
  { line: 'const response: any = await legacyCall();', checked: true },
  { line: '' },
  {
    line: '/** @todo Debug output for the legacy call; drop it after the SDK upgrade. */',
    variant: 'inserted',
  },
  { line: '// eslint-disable-next-line no-console', variant: 'flagged' },
  { line: 'console.log(response);' },
];

/** A const, not JSX text: Prettier would collapse the two spaces the real output has after `7:1`. */
const FAILURE = '✖ src/app.ts:7:1  eslint-disable-next-line has no @todo reason above it';

const LABEL =
  'Animation: justify-disable scans src/app.ts, flags the eslint-disable directive with no @todo reason above it, then passes once a @todo comment explains it.';

export const DisableAnimation = (): ReactNode => (
  <section className={styles.wrapper}>
    <div className={styles.panel} role="img" aria-label={LABEL}>
      <div aria-hidden="true">
        <div className={styles.titleBar}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.titleText}>src/app.ts</span>
        </div>
        <div className={styles.code}>
          <span className={styles.scan} />
          {ROWS.map(({ line, checked, variant }, i) => (
            <div
              key={line || 'blank'}
              className={variant ? `${styles.row} ${styles[variant]}` : styles.row}
              style={{ '--i': i } as CSSProperties}
            >
              <span className={styles.line}>{line}</span>
              {checked && <span className={styles.markOk}>✔</span>}
              {variant === 'flagged' && (
                <span className={styles.flagMark}>
                  <span className={styles.flagBad}>✖</span>
                  <span className={styles.flagOk}>✔</span>
                </span>
              )}
            </div>
          ))}
        </div>
        <div className={styles.terminal}>
          <div className={styles.prompt}>$ npx justify-disable</div>
          <div className={styles.output}>
            <div className={styles.fail}>
              <div>{FAILURE}</div>
              <div>1 unjustified disable directive(s) found.</div>
            </div>
            <div className={styles.pass}>
              ✔ No unjustified disable directives (24 files scanned).
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
