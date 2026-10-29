/** One tool's directives. Its key under `tools` is the tool name, reported as `violation.tool` and used in `IProvidedFile.tools`. */
export interface IToolDirectives {
  /** Run with matchAll over the whole file; capture group 1 is the directive name. A missing `g` flag is added when the config is resolved. */
  directive: RegExp;
  /** Tested against the full text of the comment ending on the line above, delimiters included. `g`/`y` flags are stripped when the config is resolved. */
  reason: RegExp;
}
/** `path`: posix, relative to cwd. `tools`: restricts which tools apply; when present the extension map is skipped. */
export interface IProvidedFile {
  path: string;
  tools?: string[];
}
/** `paths`: the positional CLI paths, `[]` when none. */
export interface IProviderContext {
  paths: string[];
}
export type TFileProvider = (
  context: IProviderContext
) => IProvidedFile[] | Promise<IProvidedFile[]>;

export interface IJustifyDisableConfig {
  tools?: Record<string, IToolDirectives>; // merged by key over DEFAULT_TOOLS
  extensions?: Record<string, string[]>; // key: extension without dot, lowercase; a key replaces that entry, others keep defaults
  ignorePatterns?: string[]; // path.matchesGlob; a pattern with no `/` matches at any depth (`**/` prepended)
  provider?: TFileProvider; // replaces the git provider
  concurrency?: number; // positive integer, default 64
  stats?: boolean; // consent; same three-state semantics as structurelint
}
export interface ILintOptions {
  paths?: string[];
  concurrency?: number; // overrides config.concurrency
  json?: boolean; // presentation only, ignored by lint()
  config?: IJustifyDisableConfig; // skips config-file discovery
  stats: boolean;
}
/** `line`/`column`: 1-based, at the directive's comment opener (`//` or `/*`). */
export interface IViolation {
  path: string;
  line: number;
  column: number;
  directive: string;
  tool: string;
  message: string;
}
export interface ILintResult {
  passed: boolean;
  scanned: number;
  violations: IViolation[];
}
