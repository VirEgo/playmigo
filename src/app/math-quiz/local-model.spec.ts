import { TestBed } from '@angular/core/testing';
import { LocalModel, parseStoryContexts } from './local-model';
import { generateQuestionBank } from './question-generator';

const contexts = [
  { name: 'Lucía', objects: 'pelotas', gender: 'f' },
  { name: 'Hugo', objects: 'coches', gender: 'm' },
  { name: 'Sofía', objects: 'muñecas', gender: 'f' },
  { name: 'Diego', objects: 'cromos', gender: 'm' },
  { name: 'Elena', objects: 'canicas', gender: 'f' },
];

describe('LocalModel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts five simple Spanish contexts and rejects markup, digits, missing items and duplicates', () => {
    expect(parseStoryContexts({ contexts })).toHaveLength(5);
    expect(parseStoryContexts({ contexts: contexts.slice(1) })).toBeNull();
    expect(
      parseStoryContexts({ contexts: [contexts[0], contexts[0], ...contexts.slice(2)] }),
    ).toBeNull();
    expect(
      parseStoryContexts({
        contexts: [{ ...contexts[0], objects: '<script>' }, ...contexts.slice(1)],
      }),
    ).toBeNull();
    expect(
      parseStoryContexts({
        contexts: [{ ...contexts[0], objects: '3 canicas' }, ...contexts.slice(1)],
      }),
    ).toBeNull();
    expect(
      parseStoryContexts({ contexts: [{ ...contexts[0], name: '   ' }, ...contexts.slice(1)] }),
    ).toBeNull();
  });

  it('discovers text models and changes only the wording and mathematical explanation of word problems', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'local-school-model' }, { id: 'text-embedding-model' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ contexts }) } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const model = TestBed.inject(LocalModel);
    await model.checkConnection();
    expect(model.models()).toEqual(['local-school-model']);
    expect(model.status()).toBe('ready');
    const bank = generateQuestionBank(123);
    const updated = (await model.generateQuestions(bank))!;
    expect(model.status()).toBe('success');
    expect(updated).toHaveLength(50);
    expect(
      updated.filter((question) => question.category === 'word-problem')[0].question,
    ).toContain('Lucía');
    for (const [index, question] of bank.entries()) {
      expect(updated[index].correctAnswer).toBe(question.correctAnswer);
      expect(updated[index].options).toEqual(question.options);
      expect(updated[index].operation).toEqual(question.operation);
      if (question.category !== 'word-problem') expect(updated[index]).toEqual(question);
    }
    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.reasoning_effort).toBe('none');
    expect(body.messages[1].content).not.toContain(bank[0].id);
  });

  it('does not replace the ordinary bank when model JSON is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'local-model' }] }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: { content: '{broken' } }] }),
        }),
    );
    const model = TestBed.inject(LocalModel);
    await model.checkConnection();
    expect(await model.generateQuestions(generateQuestionBank(5))).toBeNull();
    expect(model.status()).toBe('invalid');
  });

  it('handles a stopped LM Studio server and can cancel a pending connection check', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const model = TestBed.inject(LocalModel);
    await model.checkConnection();
    expect(model.status()).toBe('unavailable');
    expect(model.busy()).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('Cancelled', 'AbortError')),
            );
          }),
      ),
    );
    const pending = model.checkConnection();
    model.cancel();
    await pending;
    expect(model.status()).toBe('cancelled');
    expect(model.busy()).toBe(false);
  });
});
