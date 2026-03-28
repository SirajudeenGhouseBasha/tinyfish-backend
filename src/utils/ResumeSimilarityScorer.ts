import { SimilarityResult } from '../types';

export class ResumeSimilarityScorer {
  constructor(private resumeText: string) {}

  async computeSimilarity(jobDescription: string): Promise<SimilarityResult> {
    try {
      // Handle empty or malformed resume text
      if (!this.resumeText || this.resumeText.trim().length === 0) {
        return {
          score: 0,
          similarity: 0
        };
      }

      // Handle empty job description
      if (!jobDescription || jobDescription.trim().length === 0) {
        return {
          score: 0,
          similarity: 0
        };
      }

      // Build combined vocabulary from both texts
      const combinedVocabulary = this.buildVocabulary([this.resumeText, jobDescription]);

      // Vectorize both texts using the same vocabulary
      const resumeVector = this.vectorizeWithVocabulary(this.resumeText, combinedVocabulary);
      const jobVector = this.vectorizeWithVocabulary(jobDescription, combinedVocabulary);

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(resumeVector, jobVector);

      // Normalize to 0-25 point scale
      const score = this.normalizeToPoints(similarity);

      return {
        score,
        similarity
      };
    } catch (error) {
      console.error('Error computing resume similarity:', error);
      return {
        score: 0,
        similarity: 0
      };
    }
  }

  private vectorizeWithVocabulary(text: string, vocabulary: string[]): number[] {
    const words = this.preprocessText(text);
    const vector: number[] = new Array(vocabulary.length).fill(0);

    // Calculate term frequency
    const termFreq: { [key: string]: number } = {};
    for (const word of words) {
      termFreq[word] = (termFreq[word] || 0) + 1;
    }

    // Create TF vector using the provided vocabulary
    for (let i = 0; i < vocabulary.length; i++) {
      const word = vocabulary[i];
      const tf = termFreq[word] || 0;
      vector[i] = words.length > 0 ? tf / words.length : 0; // Normalize by document length
    }

    return vector;
  }

  private preprocessText(text: string): string[] {
    // Convert to lowercase, remove punctuation, split into words
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // Remove very short words
      .filter(word => !this.isStopWord(word)); // Remove stop words
  }

  private buildVocabulary(texts: string[]): string[] {
    const wordSet = new Set<string>();
    
    for (const text of texts) {
      const words = this.preprocessText(text);
      words.forEach(word => wordSet.add(word));
    }

    return Array.from(wordSet).sort();
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);
    
    return stopWords.has(word);
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0; // Avoid division by zero
    }

    return dotProduct / (normA * normB);
  }

  private normalizeToPoints(similarity: number): number {
    // Map 0-1 similarity to 0-25 points
    // Apply a slight curve to make higher similarities more valuable
    const curved = Math.pow(similarity, 0.8); // Slight curve
    const points = curved * 25;
    
    return Math.round(points * 100) / 100; // Round to 2 decimal places
  }
}