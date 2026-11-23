import { createConfig } from '@internal/docusaurus-theme/config';

import packageJson from '../package.json' with { type: 'json' };

export default createConfig({
  tool: 'justify-disable',
  title: 'Justify-disable',
  tagline: packageJson.description,
  version: packageJson.version,
  logo: 'img/justify-disable.svg',
});
