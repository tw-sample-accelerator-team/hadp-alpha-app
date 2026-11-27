export interface Greeting {
  readonly message: string;
}

export const greet = (name: string): Greeting => ({ message: `Hello, ${name}!` });
