import type { ReactNode } from 'react';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import githubStyles from '@internal/docusaurus-theme/github-button.module.css';
import styles from '@internal/docusaurus-theme/hero.module.css';
import CodeBlock from '@theme/CodeBlock';
import Layout from '@theme/Layout';

import { DisableAnimation } from '../components/DisableAnimation';

import pageStyles from './index.module.css';

const FEATURES = [
  {
    title: 'Every disable explained',
    description: 'A @todo reason sits directly above each ESLint and Stylelint directive.',
  },
  {
    title: 'Todos that expire',
    description:
      'Date, version, engine and dependency conditions turn a stale excuse into a failing run.',
  },
  {
    title: 'Fits your toolchain',
    description:
      'Git-tracked files across JS, TS, CSS, Vue and Svelte, custom directives such as @ts-ignore, JSON output and a JavaScript API.',
  },
];

const OPENER =
  'A lint disable with no reason is debt nobody can pay back. Justify-disable fails the run until every eslint-disable and stylelint-disable carries a written @todo, and can expire that excuse on a date, a version or a dependency.';

const Home = (): ReactNode => {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout>
      <main>
        <header className={`${styles.hero} ${pageStyles.hero}`}>
          <div className={styles.heroContent}>
            <div className={pageStyles.heroTop}>
              <div className={pageStyles.heroText}>
                <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
                <p className={styles.heroTagline}>{OPENER}</p>
              </div>
              <div className={styles.heroActions}>
                <Link className={githubStyles.githubButton} to="/docs">
                  Get Started
                </Link>
              </div>
            </div>
            <div className={`${styles.heroInstall} ${pageStyles.install}`}>
              <CodeBlock language="bash">
                npm install --save-dev @ladamczyk/justify-disable
              </CodeBlock>
            </div>
          </div>
        </header>
        <DisableAnimation />
        <ul className={`${styles.features} ${pageStyles.features}`}>
          {FEATURES.map(({ title, description }) => (
            <li key={title} className={styles.feature}>
              <h2 className={styles.featureTitle}>{title}</h2>
              <p className={styles.featureDescription}>{description}</p>
            </li>
          ))}
        </ul>
      </main>
    </Layout>
  );
};

export default Home;
