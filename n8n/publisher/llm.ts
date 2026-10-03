// The model behind the publisher, behind one small interface so it can be switched with an env
// var: LLM_PROVIDER=openai (default, Firas has OpenAI credits) or anthropic.
//   openai:    OPENAI_API_KEY, OPENAI_MODEL (Responses API, conversation via previous_response_id)
//   anthropic: ANTHROPIC_API_KEY, CLAUDE_MODEL (Messages API, adaptive thinking, refusal fallback)
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type Effort = 'medium' | 'high';

/** A conversation: each send() adds a user turn and returns the model's text answer. */
export interface Chat {
  send(text: string, images?: { label: string; jpegBase64: string }[]): Promise<string>;
}

export const PROVIDER = (process.env.LLM_PROVIDER ?? 'openai') as 'openai' | 'anthropic';
export const MODEL = PROVIDER === 'openai' ? process.env.OPENAI_MODEL ?? 'gpt-5.5' : process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';

let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

export function startChat(system: string, effort: Effort): Chat {
  return PROVIDER === 'openai' ? openaiChat(system, effort) : anthropicChat(system, effort);
}

function openaiChat(system: string, effort: Effort): Chat {
  openai ??= new OpenAI();
  let previous: string | null = null;
  return {
    async send(text, images = []) {
      const content: OpenAI.Responses.ResponseInputContent[] = [];
      for (const img of images) {
        content.push({ type: 'input_text', text: img.label });
        content.push({ type: 'input_image', image_url: `data:image/jpeg;base64,${img.jpegBase64}`, detail: 'high' });
      }
      content.push({ type: 'input_text', text });
      const r = await openai!.responses.create({
        model: MODEL,
        // Instructions are not carried over by previous_response_id: send them every turn.
        instructions: system,
        input: [{ role: 'user', content }],
        previous_response_id: previous,
        reasoning: { effort },
        max_output_tokens: 32000,
      });
      if (r.status === 'incomplete') throw new Error(`the model stopped early (${r.incomplete_details?.reason ?? 'incomplete'})`);
      if (r.error) throw new Error(`model error: ${r.error.message}`);
      previous = r.id;
      return r.output_text.trim();
    },
  };
}

function anthropicChat(system: string, effort: Effort): Chat {
  anthropic ??= new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  return {
    async send(text, images = []) {
      const content: Anthropic.Beta.BetaContentBlockParam[] = [];
      for (const img of images) {
        content.push({ type: 'text', text: img.label });
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.jpegBase64 } });
      }
      content.push({ type: 'text', text });
      messages.push({ role: 'user', content });
      const msg = await anthropic!.beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort },
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages,
      }).finalMessage();
      if (msg.stop_reason === 'refusal') throw new Error('the model declined this text (refusal)');
      if (msg.stop_reason === 'max_tokens') throw new Error('the model ran out of output space');
      messages.push({ role: 'assistant', content: msg.content });
      return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    },
  };
}
