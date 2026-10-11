import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuests } from '../../app/QuestProvider.js'
import { useLockout } from '../../app/LockoutProvider.js'
import { judgeService } from './judgeService.js'
import { Button } from '../../components/Button.js'

export function Camera() {
  const { questId } = useParams<{ questId: string }>()
  const navigate = useNavigate()
  const { submitPhoto } = useQuests()
  const { unlock } = useLockout()

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [judging, setJudging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not access camera')
    }
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (blob) {
      setCaptured(blob)
      setPreviewUrl(URL.createObjectURL(blob))
      stream?.getTracks().forEach((t) => t.stop())
    }
  }

  async function submit() {
    if (!questId || !captured) return
    setJudging(true)
    setError(null)
    try {
      await submitPhoto(questId, captured)
      const result = await judgeService.judge(questId, captured)
      if (result.passed) {
        await unlock('quest_completed')
      }
      navigate(`/quest/${questId}/result`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setJudging(false)
    }
  }

  function retake() {
    setCaptured(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    startCamera()
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Take your quest photo</h2>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
          {error}
        </div>
      )}

      {!captured && (
        <>
          <div className="overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="w-full" playsInline />
          </div>
          <Button variant="primary" className="w-full" onClick={startCamera}>
            Start camera
          </Button>
          {stream && (
            <Button variant="primary" className="w-full" onClick={capture}>
              Capture photo
            </Button>
          )}
        </>
      )}

      {captured && previewUrl && (
        <>
          <div className="overflow-hidden rounded-xl">
            <img src={previewUrl} alt="Captured" className="w-full" />
          </div>
          <Button variant="primary" className="w-full" disabled={judging} onClick={submit}>
            {judging ? 'Judging… (this takes ~10s on a laptop GPU)' : 'Submit photo'}
          </Button>
          <Button variant="secondary" className="w-full" onClick={retake}>
            Retake
          </Button>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
