import { createConfig } from '@internal/docusaurus-theme/config';

import packageJson from '../package.json' with { type: 'json' };

const config = createConfig({
  tool: 'justify-disable',
  title: 'Justify-disable',
  tagline: packageJson.description,
  version: packageJson.version,
  logo: 'img/justify-disable.svg',
});

// shortcut: the Theme has no social card option yet; drop this once createConfig takes one (NEXT_STEPS.md).
export default {
  ...config,
  themeConfig: { ...config.themeConfig, image: 'img/og.png' },
};
