export interface IRunResult {
  code: number;
  stdout: string;
}

export function run(args: string[]): IRunResult {
  return { code: 0, stdout: `justify-disable ${args.join(' ')}\n` };
}
