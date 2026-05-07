export interface GenerateDraftInput {
  rawContent: string
  title?: string
  styleProfile?: string
  apiKey?: string
}

export interface GenerateDraftResult {
  suggestedTitle: string
  summary: string
  keyPoints: string[]
  draft: string
}

export interface MultipleDraftResult {
  title: string
  content: string
}

export interface AIProvider {
  generateLinkedInDraft(input: GenerateDraftInput): Promise<GenerateDraftResult>
  generateMultipleDrafts(input: GenerateDraftInput): Promise<MultipleDraftResult[]>
  summarizeContent(content: string, apiKey?: string): Promise<string>
  extractKeyPoints(content: string, apiKey?: string): Promise<string[]>
  analyzeWritingStyle(samples: string[], apiKey?: string): Promise<string>
  rewriteInUserStyle(draft: string, styleProfile: string, apiKey?: string): Promise<string>
  scoreDraftQuality(draft: string, apiKey?: string): Promise<number>
}
