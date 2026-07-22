import { ConfigService } from '@nestjs/config';
import { DocumentParserService } from './document-parser.service';
import { KnowledgeService, KnowledgeSourceDto } from './knowledge.service';
import { LangchainService } from '../langchain/langchain.service';

type KnowledgeServiceInternals = {
  initPromise: Promise<void> | null;
  vectorStore: unknown;
  retrieveContext(question: string): Promise<{
    sources: KnowledgeSourceDto[];
    systemPrompt: string;
  }>;
  keywordBoost(content: string, terms: string[], question: string): number;
};

describe('KnowledgeService', () => {
  const createService = (): KnowledgeService => {
    const configService = {
      get: jest.fn(() => undefined),
      getOrThrow: jest.fn(() => 'http://qdrant:6333'),
    } as unknown as ConfigService;

    return new KnowledgeService(
      configService,
      {} as LangchainService,
      {} as DocumentParserService,
    );
  };

  it('re-ranks vector candidates without scrolling the entire collection', async () => {
    const service = createService();
    const internals = service as unknown as KnowledgeServiceInternals;
    const similaritySearchWithScore = jest.fn().mockResolvedValue([
      [
        {
          pageContent: 'APAC allocation policy',
          metadata: { source: 'regional.md' },
        },
        0.8,
      ],
      [
        {
          pageContent: 'APA allocation policy',
          metadata: { source: 'apa.md' },
        },
        0.3,
      ],
      [
        {
          pageContent: 'APA allocation policy',
          metadata: { source: 'duplicate.md' },
        },
        0.2,
      ],
    ]);
    const scroll = jest.fn();

    internals.initPromise = Promise.resolve();
    internals.vectorStore = {
      similaritySearchWithScore,
      client: { scroll },
    };

    const result = await internals.retrieveContext('What is APA?');

    expect(similaritySearchWithScore).toHaveBeenCalledWith('What is APA?', 24);
    expect(scroll).not.toHaveBeenCalled();
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].content).toBe('APA allocation policy');
    expect(result.systemPrompt).toContain('[1] APA allocation policy');
  });

  it('matches short English abbreviations as whole words', () => {
    const internals = createService() as unknown as KnowledgeServiceInternals;

    expect(internals.keywordBoost('APAC allocation', ['apa'], '')).toBe(0);
    expect(internals.keywordBoost('APA allocation', ['apa'], '')).toBe(0.85);
  });
});
