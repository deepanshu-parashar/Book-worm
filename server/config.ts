export const config = {
  port: Number(process.env.PORT) || 8787,
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  googleBooksKey: process.env.GOOGLE_BOOKS_API_KEY || '',
  get mock(): boolean {
    return process.env.MOCK === '1' || !this.anthropicKey;
  },
};
