// Every directive below is reported. Conditions resolve against the repo's package.json.

// --- missingReason ---

// eslint-disable-next-line no-console
console.log('no comment above');

// A plain note is not a reason.
// eslint-disable-next-line no-console
console.log('comment without @todo');

// @todo [2999-01-01]
// eslint-disable-next-line no-console
console.log('conditions alone are not a reason');

// @todo A blank line breaks the link to the directive.

// eslint-disable-next-line no-console
console.log('blank line in between');

console.log('same-line reason'); // eslint-disable-line no-console -- same-line reasons do not count

// --- expired ---

// @todo [2020-01-01] The date has passed.
// eslint-disable-next-line no-undef
expiredByDate();

// @todo [+semver] semver is now a dependency.
// eslint-disable-next-line no-undef
expiredByAddedDependency();

// @todo [-left-pad] left-pad is not a dependency.
// eslint-disable-next-line no-undef
expiredByRemovedDependency();

// @todo [cac@>=7] The declared cac range already allows 7.
// eslint-disable-next-line no-undef
expiredByDependencyVersion();

// @todo [engine:node@>=22] engines.node already requires 22 or later.
// eslint-disable-next-line no-undef
expiredByEngine();

// @todo [<1.0.0] The package is still below 1.0.0.
// eslint-disable-next-line no-undef
expiredByOwnVersion();

// --- invalidCondition ---

// @todo [2027-02-30, lodash@>4, *, 2999-01-01, 2999-06-01] Each bad token is reported.
// eslint-disable-next-line no-undef
invalidConditions();

/**
 * @todo [2999-01-01,
 *   +semver] A condition list must fit on one line.
 */
// eslint-disable-next-line no-undef
multiLineList();
