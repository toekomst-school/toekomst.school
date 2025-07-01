declare module 'papaparse' {
  export interface ParseResult<T> {
    data: T[];
    errors: object[];
    meta: object;
  }
  export interface ParseConfig {
    header?: boolean;
    delimiter?: string;
    complete?: (results: ParseResult<unknown>) => void;
    [key: string]: unknown;
  }
  const Papa: {
    parse(file: File, config: ParseConfig): void;
  };
  export default Papa;
} 