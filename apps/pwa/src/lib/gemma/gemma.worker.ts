/**
 * Web Worker that owns the Gemma 4 model instance.
 *
 * Why a worker:
 *   - Keeps the multi-GB ONNX weights and WebGPU work off the main thread.
 *   - The worker can be terminated & restarted on WebGPU device loss.
 *
 * Message protocol (postMessage):
 *
 *   Main -> Worker:
 *     { type: 'load', model: ModelKey }
 *     { type: 'generate', id: string, messages: ChatMessage[] }
 *     { type: 'judge',   id: string, messages: ChatMessage[], image: Uint8Array }
 *
 *   Worker -> Main:
 *     { type: 'status', status: GemmaStatus }
 *     { type: 'progress', progress: number }   // 0..1, download progress
 *     { type: 'token', id: string, token: string } // streamed token
 *     { type: 'done', id: string, text: string }
 *     { type: 'error', id?: string, message: string }
 */

import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
  RawImage,
  TextStreamer,
  type Tensor,
} from '@huggingface/transformers'
import { MODELS, GENERATE_PARAMS, JUDGE_MAX_NEW_TOKENS, type ModelKey } from './models.js'

export type GemmaStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type LoadMsg = { type: 'load'; model: ModelKey }
type GenerateMsg = { type: 'generate'; id: string; messages: ChatMessage[] }
type JudgeMsg = {
  type: 'judge'
  id: string
  messages: ChatMessage[]
  image: Uint8Array
}
type WorkerInbound = LoadMsg | GenerateMsg | JudgeMsg

let model: Awaited<ReturnType<typeof Gemma4ForConditionalGeneration.from_pretrained>> | null = null
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null

// Requests are serialised: two concurrent generate() calls on one WebGPU
// session interleave badly and the second one's status flips 'ready' early.
let queue: Promise<void> = Promise.resolve()

async function load(modelKey: ModelKey) {
  postStatus('loading')
  const config = MODELS[modelKey]
  processor = await AutoProcessor.from_pretrained(config.repo)
  model = await Gemma4ForConditionalGeneration.from_pretrained(config.repo, {
    dtype: config.dtypes.f16 as never,
    device: 'webgpu',
    progress_callback: (p) => {
      if ('progress' in p && typeof p.progress === 'number') {
        // transformers.js reports 0..100; the protocol is 0..1
        postMessage({ type: 'progress', progress: p.progress / 100 })
      }
    },
  })
  postStatus('ready')
}

/** The judge sends the image alongside the last user message. */
function withImagePlaceholder(messages: ChatMessage[]) {
  const lastUser = messages.map((m) => m.role).lastIndexOf('user')
  return messages.map((m, i) =>
    i === lastUser
      ? { role: m.role, content: [{ type: 'image' }, { type: 'text', text: m.content }] }
      : m,
  )
}

async function run(id: string, messages: ChatMessage[], image: Uint8Array | null) {
  if (!model || !processor) throw new Error('Model not loaded')
  postStatus('generating')
  try {
    const prompt = processor.apply_chat_template(
      image ? withImagePlaceholder(messages) : messages,
      { add_generation_prompt: true },
    )
    const raw = image ? await RawImage.fromBlob(new Blob([image as BlobPart], { type: 'image/jpeg' })) : null
    const inputs = await processor(prompt, raw, null, { add_special_tokens: false })

    const streamer = new TextStreamer(processor.tokenizer!, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token: string) => postMessage({ type: 'token', id, token }),
    })

    const params = image
      ? { max_new_tokens: JUDGE_MAX_NEW_TOKENS, do_sample: false }
      : GENERATE_PARAMS
    const output = (await model.generate({ ...inputs, ...params, streamer })) as Tensor

    const promptLen = inputs.input_ids.dims.at(-1)
    const [text] = processor.batch_decode(output.slice(null, [promptLen, null]), {
      skip_special_tokens: true,
    })
    postMessage({ type: 'done', id, text })
  } catch (e) {
    postMessage({ type: 'error', id, message: e instanceof Error ? e.message : String(e) })
  } finally {
    postStatus('ready')
  }
}

function postStatus(status: GemmaStatus) {
  postMessage({ type: 'status', status })
}

self.onmessage = (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data
  queue = queue.then(async () => {
    try {
      if (msg.type === 'load') await load(msg.model)
      else if (msg.type === 'generate') await run(msg.id, msg.messages, null)
      else if (msg.type === 'judge') await run(msg.id, msg.messages, msg.image)
    } catch (err) {
      postStatus('error')
      postMessage({
        type: 'error',
        id: msg.type === 'load' ? undefined : msg.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  })
}

export {}
