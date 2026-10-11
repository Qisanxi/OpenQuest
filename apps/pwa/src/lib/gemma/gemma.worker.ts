/**
 * Web Worker that owns the Gemma 4 model instance.
 *
 * Why a worker:
 *   - WebGPU inference is synchronous from JS's POV — runs on the GPU
 *     queue, but the call doesn't yield. We can't block the main thread.
 *   - The worker can be terminated & restarted on WebGPU device loss.
 *   - The 3.4GB ONNX blob lives in the worker's heap, not the main
 *     thread's, so the main UI keeps a small footprint.
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

let model: any = null
let currentStatus: GemmaStatus = 'idle'

async function load(modelKey: ModelKey) {
  postStatus('loading')
  const config = MODELS[modelKey]
  // Lazy-load the transformers.js library — keeps the main bundle small.
  const { Gemma4ForConditionalGeneration, AutoTokenizer } = await import('@huggingface/transformers')

  const dtype = config.dtypes.f16
  model = await Gemma4ForConditionalGeneration.from_pretrained(config.repo, {
    dtype,
    device: 'webgpu',
    progress_callback: (p: any) => {
      if (typeof p.progress === 'number') {
        postMessage({ type: 'progress', progress: p.progress })
      }
    },
  })
  postStatus('ready')
}

async function generate(id: string, messages: ChatMessage[]) {
  if (!model) throw new Error('Model not loaded')
  postStatus('generating')
  try {
    const inputs = await model.tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      tokenize: false,
    })
    const streamer = {
      token_callback: (token: string) => postMessage({ type: 'token', id, token }),
    }
    const output = await model.generate({ ...inputs, ...GENERATE_PARAMS, streamer })
    const text = model.tokenizer.decode(output[0], { skip_special_tokens: true })
    postMessage({ type: 'done', id, text })
  } catch (e) {
    postMessage({ type: 'error', id, message: e instanceof Error ? e.message : String(e) })
  } finally {
    postStatus('ready')
  }
}

async function judge(id: string, messages: ChatMessage[], image: Uint8Array) {
  if (!model) throw new Error('Model not loaded')
  postStatus('generating')
  try {
    const inputs = await model.tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      tokenize: false,
    })
    const imageInputs = await model.processor(image)
    const output = await model.generate({
      ...inputs,
      ...imageInputs,
      max_new_tokens: JUDGE_MAX_NEW_TOKENS,
      do_sample: false,
    })
    const text = model.tokenizer.decode(output[0], { skip_special_tokens: true })
    postMessage({ type: 'done', id, text })
  } catch (e) {
    postMessage({ type: 'error', id, message: e instanceof Error ? e.message : String(e) })
  } finally {
    postStatus('ready')
  }
}

function postStatus(status: GemmaStatus) {
  currentStatus = status
  postMessage({ type: 'status', status })
}

self.onmessage = async (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data
  try {
    if (msg.type === 'load') await load(msg.model)
    else if (msg.type === 'generate') await generate(msg.id, msg.messages)
    else if (msg.type === 'judge') await judge(msg.id, msg.messages, msg.image)
  } catch (e) {
    postStatus('error')
    postMessage({
      type: 'error',
      id: msg.type === 'load' ? undefined : (msg as any).id,
      message: e instanceof Error ? e.message : String(e),
    })
  }
}

export {}
