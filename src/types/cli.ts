import type { PackageManager } from "./package-manager.js";

export type CreateCliOptions = {
  readonly template?: string;
  readonly addons?: string;
  readonly install: boolean;
  readonly bun?: boolean;
  readonly pnpm?: boolean;
  readonly yarn?: boolean;
  readonly debug?: boolean;
};

export type ParsedCliCommand =
  | {
      readonly kind: "create";
      readonly projectName?: string;
      readonly options: CreateCliOptions;
    }
  | {
      readonly kind: "help";
    }
  | {
      readonly kind: "templates";
    }
  | {
      readonly kind: "version";
    };

export type CreateCommandOptions = {
  readonly projectName: string | undefined;
  readonly templateId: string | undefined;
  readonly addons: string | undefined;
  readonly install: boolean;
  readonly packageManager?: PackageManager | undefined;
};
