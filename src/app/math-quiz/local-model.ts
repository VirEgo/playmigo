import { computed, Injectable, signal } from '@angular/core';
import { MathQuestion } from './math-question';
import { QUIZ_TEXT } from './quiz-text';

type LocalModelStatus =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'generating'
  | 'success'
  | 'unavailable'
  | 'timeout'
  | 'invalid'
  | 'cancelled'
  | 'stale';
interface StoryContext {
  readonly name: string;
  readonly objects: string;
  readonly gender: 'm' | 'f';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStoryContexts(value: unknown): readonly StoryContext[] | null {
  if (!isRecord(value) || !Array.isArray(value['contexts']) || value['contexts'].length !== 5)
    return null;
  const contexts: StoryContext[] = [];
  for (const item of value['contexts']) {
    if (!isRecord(item)) return null;
    const name = item['name'];
    const objects = item['objects'];
    const gender = item['gender'];
    if (
      typeof name !== 'string' ||
      typeof objects !== 'string' ||
      !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,24}$/.test(name) ||
      !/^[a-záéíóúüñ ]{3,36}$/.test(objects) ||
      (gender !== 'm' && gender !== 'f')
    )
      return null;
    if (name.trim().length < 2 || objects.trim().length < 3) return null;
    contexts.push({ name: name.trim(), objects: objects.trim(), gender });
  }
  if (new Set(contexts.map((item) => `${item.name}:${item.objects}`)).size !== 5) return null;
  return contexts;
}

export function buildStoryRequest(model: string) {
  return {
    model,
    messages: [
      {
        role: 'system',
        content: 'Eres docente de primaria en España. Devuelve solo JSON.',
      },
      {
        role: 'user',
        content:
          'Propón 5 contextos distintos y sencillos para problemas de niños de 7 años. Cada contexto contiene name (nombre infantil ficticio en español), objects (sustantivo plural contable de objetos que un niño puede recibir o regalar, en minúsculas) y gender (m o f, género gramatical del sustantivo). Usa distintos nombres y objetos cotidianos. Sin números, cálculos, frases, explicaciones ni datos personales reales.',
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'school_contexts',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['contexts'],
          properties: {
            contexts: {
              type: 'array',
              minItems: 5,
              maxItems: 5,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'objects', 'gender'],
                properties: {
                  name: { type: 'string' },
                  objects: { type: 'string' },
                  gender: { type: 'string', enum: ['m', 'f'] },
                },
              },
            },
          },
        },
      },
    },
    temperature: 0.9,
    reasoning_effort: 'none',
    max_tokens: 650,
    stream: false,
  };
}

@Injectable({ providedIn: 'root' })
export class LocalModel {
  readonly status = signal<LocalModelStatus>('idle');
  readonly models = signal<readonly string[]>([]);
  readonly selectedModel = signal('');
  readonly busy = computed(() => this.status() === 'checking' || this.status() === 'generating');
  readonly message = computed(() => QUIZ_TEXT.localModel[this.status()]);
  private controller: AbortController | null = null;
  private requestNumber = 0;

  async checkConnection(): Promise<void> {
    this.cancelPending();
    const request = ++this.requestNumber;
    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    this.status.set('checking');
    try {
      const response = await fetch('/api/lm-studio/v1/models', { signal: controller.signal });
      if (!response.ok) throw new Error('unavailable');
      const payload: unknown = await response.json();
      if (request !== this.requestNumber) return;
      if (!isRecord(payload) || !Array.isArray(payload['data'])) throw new Error('invalid');
      const models = payload['data']
        .filter(isRecord)
        .map((item) => item['id'])
        .filter((id): id is string => typeof id === 'string' && !/embed|nomic/i.test(id));
      if (models.length === 0) throw new Error('no model');
      this.models.set(models);
      if (!models.includes(this.selectedModel())) this.selectedModel.set(models[0]);
      this.status.set('ready');
    } catch {
      if (request === this.requestNumber) {
        this.models.set([]);
        this.status.set('unavailable');
      }
    } finally {
      clearTimeout(timeout);
      if (request === this.requestNumber) this.controller = null;
    }
  }

  selectModel(value: string): void {
    if (this.models().includes(value) && !this.busy()) this.selectedModel.set(value);
  }

  async generateQuestions(bank: readonly MathQuestion[]): Promise<readonly MathQuestion[] | null> {
    if (this.busy() || !this.models().includes(this.selectedModel())) return null;
    const request = ++this.requestNumber;
    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 120000);
    this.status.set('generating');
    try {
      const response = await fetch('/api/lm-studio/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildStoryRequest(this.selectedModel())),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (request === this.requestNumber) this.status.set('unavailable');
        return null;
      }
      const payload: unknown = await response.json();
      if (request !== this.requestNumber) return null;
      if (
        !isRecord(payload) ||
        !Array.isArray(payload['choices']) ||
        !isRecord(payload['choices'][0]) ||
        !isRecord(payload['choices'][0]['message'])
      )
        throw new Error('invalid');
      const content = payload['choices'][0]['message']['content'];
      if (typeof content !== 'string') throw new Error('invalid');
      const contexts = parseStoryContexts(JSON.parse(content) as unknown);
      if (!contexts) throw new Error('invalid');
      let index = 0;
      const updated = bank.map((question): MathQuestion => {
        if (question.category !== 'word-problem' || !question.operation) return question;
        const context = contexts[index++];
        const { top, bottom, operator } = question.operation;
        const howMany = context.gender === 'f' ? 'Cuántas' : 'Cuántos';
        const story =
          operator === '+'
            ? `${context.name} tiene ${top} ${context.objects} y recibe ${bottom} más. ¿${howMany} tiene ahora?`
            : `${context.name} tiene ${top} ${context.objects} y regala ${bottom}. ¿${howMany} le quedan?`;
        return {
          ...question,
          question: story,
          explanation: `${top} ${operator} ${bottom} = ${question.correctAnswer}.`,
        };
      });
      if (index !== 5) throw new Error('invalid');
      this.status.set('success');
      return updated;
    } catch {
      if (request === this.requestNumber)
        this.status.set(controller.signal.aborted ? 'timeout' : 'invalid');
      return null;
    } finally {
      clearTimeout(timeout);
      if (request === this.requestNumber) this.controller = null;
    }
  }

  cancel(): void {
    const pending = this.busy();
    this.cancelPending();
    if (pending) this.status.set('cancelled');
  }
  markStale(): void {
    this.status.set('stale');
  }
  private cancelPending(): void {
    this.requestNumber++;
    this.controller?.abort();
    this.controller = null;
  }
}
