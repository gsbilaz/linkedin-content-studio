export interface GenerateDraftInput {
  rawContent: string
  title?: string
  styleProfile?: string
}

export interface GenerateDraftResult {
  suggestedTitle: string
  summary: string
  keyPoints: string[]
  draft: string
}

export interface AIProvider {
  generateLinkedInDraft(input: GenerateDraftInput): Promise<GenerateDraftResult>
  summarizeContent(content: string): Promise<string>
  extractKeyPoints(content: string): Promise<string[]>
  analyzeWritingStyle(samples: string[]): Promise<string>
  rewriteInUserStyle(draft: string, styleProfile: string): Promise<string>
  scoreDraftQuality(draft: string): Promise<number>
}
