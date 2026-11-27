export interface HelloPageProps {
  readonly name?: string;
}

export function HelloPage({ name = "world" }: HelloPageProps) {
  return <h1>Hello, {name}!</h1>;
}
