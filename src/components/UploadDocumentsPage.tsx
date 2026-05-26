import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { getAuthHeaders } from '../services/auth'
import { uploadDocument, evaluateKYCApplication } from '../services/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

interface KYCApplication {
  id: number
  case_reference: string
  status: string
  created_at: string
}

interface UploadResponse {
  document_id: number
  message: string
}

interface UploadDocumentsPageProps {
  kycId: number
  onBack: () => void
}

export function UploadDocumentsPage({ kycId, onBack }: UploadDocumentsPageProps) {
  const [kycApplication, setKycApplication] = useState<KYCApplication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [frontIdUploaded, setFrontIdUploaded] = useState(false)
  const [backIdUploaded, setBackIdUploaded] = useState(false)
  const [selfieUploaded, setSelfieUploaded] = useState(false)
  const [videoUploaded, setVideoUploaded] = useState(false)
  const [cameraMode, setCameraMode] = useState<'selfie' | 'video' | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null)

  const frontIdRef = useRef<HTMLInputElement>(null)
  const backIdRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const previewAttachActiveRef = useRef(false)
  const previewCleanupRef = useRef<(() => void) | null>(null)

  const supportsMediaRecorder = typeof MediaRecorder !== 'undefined'

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const response = await fetch(`${API_BASE}/kyc/my-applications`, {
          headers: getAuthHeaders(),
        })
        if (!response.ok) {
          throw new Error(`Failed to load application: ${response.status}`)
        }
        const applications: KYCApplication[] = await response.json()
        const found = applications.find((app) => app.id === kycId)
        if (found) {
          setKycApplication(found)
        } else {
          setError('KYC application not found. Please create a new application first.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load application.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [kycId])

  function cleanupPreviewListeners() {
    previewCleanupRef.current?.()
    previewCleanupRef.current = null
    previewAttachActiveRef.current = false
  }

  function attachPreviewToVideo(stream: MediaStream) {
    if (previewAttachActiveRef.current) return
    previewAttachActiveRef.current = true

    const attach = () => {
      const videoEl = videoElementRef.current
      if (!videoEl) {
        window.requestAnimationFrame(attach)
        return
      }

      const video = videoEl
      video.srcObject = stream
      video.muted = true
      video.playsInline = true

      let readyFired = false

      function cleanupReadyListeners() {
        video.onloadedmetadata = null
        video.onloadeddata = null
        video.oncanplay = null
      }

      function onReady() {
        if (readyFired) return
        readyFired = true
        cleanupReadyListeners()
        video.play().catch(() => {})
        setCameraReady(true)
      }

      video.onloadedmetadata = onReady
      video.onloadeddata = onReady
      video.oncanplay = onReady

      previewCleanupRef.current = () => {
        cleanupReadyListeners()
        previewAttachActiveRef.current = false
      }

      if (video.readyState >= 2) {
        onReady()
      } else {
        window.setTimeout(() => {
          if (video.srcObject && !readyFired) {
            onReady()
          }
        }, 1800)
      }
    }

    attach()
  }

  async function uploadFile(file: File | Blob, endpoint: string, setUploaded: (value: boolean) => void) {
    if (!kycApplication) return

    const uploadFile = file instanceof File ? file : new File([file], endpoint.includes('video') ? 'recording.webm' : 'capture.jpg', { type: file.type || 'application/octet-stream' })
    try {
      setIsUploading(true)
      const response = await uploadDocument(kycApplication.id, uploadFile, endpoint, getAuthHeaders())
      setUploaded(true)
      setSuccess(response.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleFileUpload(ref: RefObject<HTMLInputElement | null>, endpoint: string, setUploaded: (value: boolean) => void) {
    const file = ref.current?.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)
    await uploadFile(file, endpoint, setUploaded)
  }

  async function startCamera(mode: 'selfie' | 'video') {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: mode === 'video',
      })
      streamRef.current = stream
      setCameraMode(mode)
      setCameraReady(false)
      setError(null)
      setSuccess(null)
      cleanupPreviewListeners()
      attachPreviewToVideo(stream)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access camera.')
    }
  }

  function stopCamera() {
    cleanupPreviewListeners()
    if (videoElementRef.current) {
      videoElementRef.current.pause()
      videoElementRef.current.srcObject = null
      videoElementRef.current.onloadedmetadata = null
      videoElementRef.current.onloadeddata = null
      videoElementRef.current.oncanplay = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraMode(null)
    setCameraReady(false)
    setIsRecording(false)
  }

  async function captureSelfie() {
    if (!videoElementRef.current) {
      setError('Camera preview is not available.')
      return
    }

    const video = videoElementRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera preview is still loading. Please wait a moment.')
      return
    }

    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Failed to initialize capture.')
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
    if (!blob) {
      setError('Failed to capture selfie.')
      return
    }

    setError(null)
    setSuccess(null)
    await uploadFile(blob, 'upload-selfie', setSelfieUploaded)
    stopCamera()
  }

  function startVideoRecording() {
    if (!streamRef.current) return
    if (!supportsMediaRecorder) {
      setError('Browser does not support direct video recording. Please upload a video file.')
      return
    }

    const recorder = new MediaRecorder(streamRef.current)
    mediaRecorderRef.current = recorder
    recordedChunksRef.current = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      setRecordedVideo(blob)
    }

    recorder.start()
    setIsRecording(true)
    setRecordedVideo(null)
  }

  async function stopVideoRecording() {
    if (!mediaRecorderRef.current) return
    mediaRecorderRef.current.stop()
    setIsRecording(false)
    stopCamera()
  }

  async function uploadRecordedVideo() {
    if (!recordedVideo) return
    setError(null)
    setSuccess(null)
    await uploadFile(recordedVideo, 'upload-video', setVideoUploaded)
    stopCamera()
  }

  async function submitApplication() {
    if (!kycApplication) return

    setIsUploading(true)
    setError(null)

    try {
      const result = await evaluateKYCApplication(kycApplication.id, getAuthHeaders())
      setSuccess(`Application submitted successfully! Decision: ${result.decision}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setIsUploading(false)
    }
  }

  const canSubmit = kycApplication && frontIdUploaded && selfieUploaded

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card shadow-sm border-0 rounded-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>Upload Documents</h2>
            <p className="text-muted mb-0">
              Use the form below to upload your documents for application <strong>{kycApplication?.case_reference || `#${kycId}`}</strong>.
            </p>
          </div>
          <button className="btn btn-outline-secondary" onClick={onBack}>
            ← Back
          </button>
        </div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="alert">{success}</div>}

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">Front ID</h5>
                <p className="card-text text-muted small">Upload a clear photo of the front of your ID document.</p>
                <input ref={frontIdRef} type="file" accept="image/*" className="form-control mb-2" disabled={frontIdUploaded} />
                <button
                  onClick={() => void handleFileUpload(frontIdRef, 'upload-document/front-id', setFrontIdUploaded)}
                  disabled={isUploading || frontIdUploaded}
                  className="btn btn-outline-primary btn-sm"
                >
                  {frontIdUploaded ? '✓ Uploaded' : 'Upload Front ID'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">Back ID</h5>
                <p className="card-text text-muted small">Upload a clear photo of the back of your ID document (if applicable).</p>
                <input ref={backIdRef} type="file" accept="image/*" className="form-control mb-2" disabled={backIdUploaded} />
                <button
                  onClick={() => void handleFileUpload(backIdRef, 'upload-document/back-id', setBackIdUploaded)}
                  disabled={isUploading || backIdUploaded}
                  className="btn btn-outline-primary btn-sm"
                >
                  {backIdUploaded ? '✓ Uploaded' : 'Upload Back ID'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">Selfie</h5>
                <p className="card-text text-muted small">Take a clear selfie using your camera.</p>
                {selfieUploaded ? (
                  <div className="alert alert-success py-2">Selfie uploaded successfully.</div>
                ) : cameraMode === 'selfie' ? (
                  <>
                    <video ref={videoElementRef} className="w-100 rounded mb-3" autoPlay muted playsInline style={{ height: '320px', objectFit: 'cover' }} />
                    {!cameraReady && (
                      <div className="text-muted small mb-2">Starting camera preview... please allow access and wait a moment.</div>
                    )}
                    <div className="d-flex gap-2">
                      <button onClick={() => void captureSelfie()} disabled={isUploading || !cameraReady} className="btn btn-primary btn-sm">
                        Capture Selfie
                      </button>
                      <button onClick={stopCamera} disabled={isUploading} className="btn btn-outline-secondary btn-sm">
                        Cancel
                      </button>
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </>
                ) : (
                  <button onClick={() => void startCamera('selfie')} disabled={isUploading || selfieUploaded} className="btn btn-outline-primary btn-sm">
                    Use Camera for Selfie
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">Video (Optional)</h5>
                <p className="card-text text-muted small">Record a short video for enhanced liveness detection.</p>
                {videoUploaded ? (
                  <div className="alert alert-success py-2">Video uploaded successfully.</div>
                ) : cameraMode === 'video' ? (
                  <>
                    <video ref={videoElementRef} className="w-100 rounded mb-3" autoPlay muted playsInline style={{ height: '320px', objectFit: 'cover' }} />
                    {!cameraReady && (
                      <div className="text-muted small mb-2">Starting camera preview... please allow access and wait.</div>
                    )}
                    <div className="d-flex gap-2 mb-3">
                      <button onClick={isRecording ? () => void stopVideoRecording() : () => void startVideoRecording()} disabled={!cameraReady} className={`btn btn-${isRecording ? 'danger' : 'primary'} btn-sm`}>
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                      </button>
                      <button onClick={stopCamera} disabled={isUploading || isRecording} className="btn btn-outline-secondary btn-sm">
                        Cancel
                      </button>
                    </div>
                    {recordedVideo && (
                      <>
                        <video src={URL.createObjectURL(recordedVideo)} controls className="w-100 rounded mb-3" style={{ maxHeight: '240px', objectFit: 'cover' }} />
                        <button onClick={() => void uploadRecordedVideo()} disabled={isUploading} className="btn btn-outline-primary btn-sm">
                          Upload Recorded Video
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-3">
                      <button onClick={() => void startCamera('video')} disabled={isUploading || videoUploaded} className="btn btn-outline-primary btn-sm">
                        Use Camera for Video
                      </button>
                    </div>
                    {!supportsMediaRecorder && (
                      <div className="alert alert-info py-2">Direct video recording is not supported in this browser. Upload a video file instead.</div>
                    )}
                    <input ref={videoFileRef} type="file" accept="video/*" capture="user" className="form-control mb-2" disabled={videoUploaded} />
                    <button onClick={() => void handleFileUpload(videoFileRef, 'upload-video', setVideoUploaded)} disabled={isUploading || videoUploaded} className="btn btn-outline-primary btn-sm">
                      {videoUploaded ? '✓ Uploaded' : 'Upload Video File'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 mt-4">
          <button onClick={() => void submitApplication()} disabled={!canSubmit || isUploading} className="btn btn-success btn-lg">
            {isUploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting…
              </>
            ) : (
              'Submit Application'
            )}
          </button>
          {!canSubmit && <small className="text-muted align-self-center">Please upload at least Front ID and Selfie to submit.</small>}
        </div>
      </div>
    </div>
  )
}
