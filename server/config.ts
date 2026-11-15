type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export const config = {
  port: Number(process.env.PORT) || 8787,
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  googleBooksKey: process.env.GOOGLE_BOOKS_API_KEY || '',
  model: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
  effort: (EFFORTS.includes(process.env.CLAUDE_EFFORT as Effort) ? process.env.CLAUDE_EFFORT : 'low') as Effort,
  get mock(): boolean {
    return process.env.MOCK === '1' || !this.anthropicKey;
  },
};
