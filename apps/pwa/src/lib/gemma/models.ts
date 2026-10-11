/**
 * Gemma 4 E2B model configuration.
 *
 * We ship two quantizations:
 *   - e2b-mobile: 2-bit QAT, ~2.57 GB. For phones / older laptops.
 *   - e2b:       4-bit,    ~3.38 GB. For laptops with a real GPU.
 *
 * Both run via Transformers.js on WebGPU inside a dedicated Web Worker.
 */

export type ModelKey = 'e2b-mobile' | 'e2b'

export interface GemmaModel {
  label: string
  repo: string
  dtypes: {
    f16: Record<string, string>
    fallback: Record<string, string> | null
  }
  approxBytes: number
}

export const MODELS: Record<ModelKey, GemmaModel> = {
  'e2b-mobile': {
    label: 'Gemma 4 E2B mobile (QAT, 2-bit)',
    repo: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
    dtypes: {
      f16: {
        embed_tokens: 'q2f16',
        decoder_model_merged: 'q2f16',
        vision_encoder: 'fp16',
        audio_encoder: 'q2f16',
      },
      fallback: null,
    },
    approxBytes: 2.57e9,
  },
  e2b: {
    label: 'Gemma 4 E2B (4-bit)',
    repo: 'onnx-community/gemma-4-E2B-it-ONNX',
    dtypes: {
      f16: {
        embed_tokens: 'q4f16',
        decoder_model_merged: 'q4f16',
        vision_encoder: 'fp16',
        audio_encoder: 'q4f16',
      },
      fallback: {
        embed_tokens: 'q4',
        decoder_model_merged: 'q4',
        vision_encoder: 'fp16',
        audio_encoder: 'q4',
      },
    },
    approxBytes: 3.38e9,
  },
}

/**
 * Pick the best model for this device. Phones get the 2-bit mobile variant
 * (smaller, but more aggressively quantized). Laptops/desktops with a real
 * GPU get the 4-bit variant (better quality, still fits in 4GB VRAM).
 */
export function pickModel(): ModelKey {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return 'e2b'
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /android|iphone|ipad|mobile/.test(ua)
  return isMobile ? 'e2b-mobile' : 'e2b'
}

export const GENERATE_PARAMS = {
  max_new_tokens: 512,
  do_sample: true,
  temperature: 1.0,
  top_p: 0.95,
  top_k: 64,
} as const

export const JUDGE_MAX_NEW_TOKENS = 384
