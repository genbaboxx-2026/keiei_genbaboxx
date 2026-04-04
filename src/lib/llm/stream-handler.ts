// Stream handler for LLM responses - will be implemented in Phase 4
export function createStreamHandler() {
  return {
    onToken: (_token: string) => {},
    onComplete: (_fullText: string) => {},
    onError: (_error: Error) => {},
  };
}
