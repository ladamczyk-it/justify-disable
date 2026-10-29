// Every directive below is justified: justify-disable reports nothing for this file.

/**
 * @todo Legacy API returns untyped data; type it once the SDK ships types.
 */
// eslint-disable-next-line no-console
console.log('multi-line JSDoc reason');

// @todo Debug output kept until the logger lands.
// eslint-disable-next-line no-console
console.log('single-line reason');

/* @todo Generated code; regenerate it instead of fixing by hand. */
/* eslint-disable no-unused-vars */
const generated = 1;

// @todo [2999-01-01] Remove the shim once every consumer has migrated.
// eslint-disable-next-line no-undef
shim();

// @todo [cac@>=8, -semver] Revisit when cac 8 lands or semver is dropped.
// eslint-disable-next-line no-undef
legacyParse();

// @todo[engine:node@>=30, >=1.0.0] Use the native API once Node 30 is the floor.
// eslint-disable-next-line no-undef
polyfill();
