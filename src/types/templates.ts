export type BaseTemplateManifest = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly default?: boolean;
};

export type BaseTemplateInfo = BaseTemplateManifest & {
  readonly directory: string;
};

export type AddonManifest = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
};

export type AddonInfo = AddonManifest & {
  readonly directory: string;
};
