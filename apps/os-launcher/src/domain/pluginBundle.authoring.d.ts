declare function defineRuntimeBundle(factory: (api: { ui: any }) => any): void;
declare function defineRuntimeSurface(cardId: string, definitionOrFactory: any, packId?: string): void;
declare function __package__(metadata: any): void;
declare function __doc__(nameOrMetadata: any, metadata?: any): void;
declare function __example__(metadata: any): void;
declare function __card__(metadata: any): void;
declare function doc(strings: TemplateStringsArray, ...values: any[]): string;
