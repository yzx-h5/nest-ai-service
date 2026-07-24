import { ConfigService } from '@nestjs/config';
import { lookup } from 'node:dns/promises';
import type { KnowledgeSourceDto } from '../interfaces/knowledge/knowledge.interface';
import { DocumentParserService } from './document-parser.service';
import { KnowledgeService } from './knowledge.service';
import { LangchainService } from '../langchain/langchain.service';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

type KnowledgeServiceInternals = {
  initPromise: Promise<void> | null;
  vectorStore: unknown;
  retrieveContext(question: string): Promise<{
    sources: KnowledgeSourceDto[];
    systemPrompt: string;
  }>;
  keywordBoost(content: string, terms: string[], question: string): number;
  isUsefulChunk(content: string, minimumLength?: number): boolean;
};

describe('KnowledgeService', () => {
  const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;

  afterEach(() => {
    jest.restoreAllMocks();
    mockedLookup.mockReset();
  });

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

  it('keeps short standalone content while rejecting page-only chunks', () => {
    const internals = createService() as unknown as KnowledgeServiceInternals;

    expect(internals.isUsefulChunk('简短正文', 1)).toBe(true);
    expect(internals.isUsefulChunk('Page 1 of 2', 1)).toBe(false);
  });

  it('extracts a public web page and reuses text import', async () => {
    const service = createService();
    const importText = jest.spyOn(service, 'importText').mockResolvedValue({
      chunksAdded: 1,
      chunksSkipped: 0,
      charsExtracted: 42,
      source: 'https://example.com/docs',
    });
    mockedLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ] as never);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          '<html><head><title>Nest &amp; Docs</title><script>ignore()</script></head><body><main><h1>Welcome</h1><p>Useful <strong>knowledge</strong> content.</p></main></body></html>',
          { headers: { 'content-type': 'text/html; charset=utf-8' } },
        ),
      );

    await expect(
      service.importWebPage('https://example.com/docs'),
    ).resolves.toEqual({
      chunksAdded: 1,
      chunksSkipped: 0,
      charsExtracted: 42,
      source: 'https://example.com/docs',
    });
    expect(importText).toHaveBeenCalledWith(
      'Nest & Docs\nWelcome\nUseful knowledge content.',
      expect.objectContaining({
        source: 'https://example.com/docs',
        title: 'Nest & Docs',
        contentType: 'text/html',
      }),
    );
  });

  it('rejects local web page addresses before requesting them', async () => {
    const service = createService();
    const fetchMock = jest.spyOn(global, 'fetch');

    await expect(
      service.importWebPage('http://localhost:3000'),
    ).rejects.toThrow('不允许访问本地或内网网页地址');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
