import { useState, useRef } from 'react'
import { getAuthHeaders } from '../services/auth'

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

export function CreateKYCPage() {
  const [country, setCountry] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [kycApplication, setKycApplication] = useState<KYCApplication | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // File refs
  const frontIdRef = useRef<HTMLInputElement>(null)
  const backIdRef = useRef<HTMLInputElement>(null)

  // Upload states
  const [frontIdUploaded, setFrontIdUploaded] = useState(false)
  const [backIdUploaded, setBackIdUploaded] = useState(false)
  const [selfieUploaded, setSelfieUploaded] = useState(false)
  const [videoUploaded, setVideoUploaded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [cameraMode, setCameraMode] = useState<'selfie' | 'video' | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null)

  const videoElementRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  async function createKYCApplication() {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/kyc/create-kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          country: country || undefined,
          document_type: documentType || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to create KYC application: ${response.status}`)
      }

      const data = await response.json()
      setKycApplication(data)
      setSuccess('KYC application created successfully! Please upload your documents.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create KYC application')
    } finally {
      setIsCreating(false)
    }
  }

  async function uploadFile(file: File | Blob, endpoint: string, setUploaded: (value: boolean) => void) {
    if (!kycApplication) return

    const formData = new FormData()
    const uploadFile = file instanceof File ? file : new File([file], endpoint.includes('video') ? 'recording.webm' : 'capture.jpg', { type: file.type || 'application/octet-stream' })
    formData.append('file', uploadFile)

    try {
      const response = await fetch(`${API_BASE}/kyc/${kycApplication.id}/${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Upload failed: ${response.status}`)
      }

      const data: UploadResponse = await response.json()
      setUploaded(true)
      setSuccess(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  async function handleFileUpload(ref: React.RefObject<HTMLInputElement | null>, endpoint: string, setUploaded: (value: boolean) => void) {
    const file = ref.current?.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      await uploadFile(file, endpoint, setUploaded)
    } finally {
      setIsUploading(false)
    }
  }

  async function startCamera(mode: 'selfie' | 'video') {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === 'video' })
      streamRef.current = stream
      setCameraMode(mode)
      setCameraReady(false)
      setError(null)
      setSuccess(null)

      if (videoElementRef.current) {
        const videoEl = videoElementRef.current
        videoEl.srcObject = stream
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(() => {})
          setCameraReady(true)
        }
        if (videoEl.readyState >= 1) {
          videoEl.play().catch(() => {})
          setCameraReady(true)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access camera.')
    }
  }

  function stopCamera() {
    if (videoElementRef.current) {
      videoElementRef.current.pause()
      videoElementRef.current.srcObject = null
      videoElementRef.current.onloadedmetadata = null
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

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })
      await uploadFile(file, 'upload-selfie', setSelfieUploaded)
      stopCamera()
    } finally {
      setIsUploading(false)
    }
  }

  function startVideoRecording() {
    if (!streamRef.current) return

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

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const file = new File([recordedVideo], `video-${Date.now()}.webm`, { type: 'video/webm' })
      await uploadFile(file, 'upload-video', setVideoUploaded)
      stopCamera()
    } finally {
      setIsUploading(false)
    }
  }

  async function submitApplication() {
    if (!kycApplication) return

    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/kyc/${kycApplication.id}/evaluate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Evaluation failed: ${response.status}`)
      }

      const result = await response.json()
      setSuccess(`Application submitted successfully! Decision: ${result.decision}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setIsUploading(false)
    }
  }

  const canSubmit = kycApplication && frontIdUploaded && selfieUploaded

  return (
    <div className="card shadow-sm border-0 rounded-4">
      <div className="card-body p-4 p-md-5">
        <h1 className="card-title h2 mb-4">Create KYC Application</h1>

        {!kycApplication ? (
          <>
            <p className="text-muted mb-4">
              Start your KYC verification process by providing basic information.
            </p>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label htmlFor="country" className="form-label fw-semibold">
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Country</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                  <option value="IN">India</option>
                  <option value="BR">Brazil</option>
                  <option value="MX">Mexico</option>
                </select>
              </div>

              <div className="col-md-6">
                <label htmlFor="documentType" className="form-label fw-semibold">
                  Document Type
                </label>
                <select
                  id="documentType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Document Type</option>
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="national_id">National ID</option>
                  <option value="residence_permit">Residence Permit</option>
                </select>
              </div>
            </div>

            <button
              onClick={createKYCApplication}
              disabled={isCreating}
              className="btn btn-primary btn-lg"
            >
              {isCreating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Application…
                </>
              ) : (
                'Create KYC Application'
              )}
            </button>
          </>
        ) : (
          <>
            <div className="alert alert-info mb-4">
              <strong>Application Created:</strong> {kycApplication.case_reference}
              <br />
              <strong>Status:</strong> {kycApplication.status}
            </div>

            <h3 className="h4 mb-4">Upload Documents</h3>

            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Front ID</h5>
                    <p className="card-text text-muted small">
                      Upload a clear photo of the front of your ID document.
                    </p>
                    <input
                      ref={frontIdRef}
                      type="file"
                      accept="image/*"
                      className="form-control mb-2"
                      disabled={frontIdUploaded}
                    />
                    <button
                      onClick={() => handleFileUpload(frontIdRef, 'upload-document/front-id', setFrontIdUploaded)}
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
                    <p className="card-text text-muted small">
                      Upload a clear photo of the back of your ID document (if applicable).
                    </p>
                    <input
                      ref={backIdRef}
                      type="file"
                      accept="image/*"
                      className="form-control mb-2"
                      disabled={backIdUploaded}
                    />
                    <button
                      onClick={() => handleFileUpload(backIdRef, 'upload-document/back-id', setBackIdUploaded)}
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
                    <p className="card-text text-muted small">
                      Take a clear selfie using your camera.
                    </p>
                    {selfieUploaded ? (
                      <div className="alert alert-success py-2">
                        Selfie uploaded successfully.
                      </div>
                    ) : cameraMode === 'selfie' ? (
                      <>
                        <video
                          ref={videoElementRef}
                          className="w-100 rounded mb-3"
                          autoPlay
                          muted
                          playsInline
                          style={{ height: '320px', objectFit: 'cover' }}
                        />
                        {!cameraReady && (
                          <div className="text-muted small mb-2">
                            Starting camera preview... please allow access and wait a moment.
                          </div>
                        )}
                        <div className="d-flex gap-2">
                          <button
                            onClick={captureSelfie}
                            disabled={isUploading || !cameraReady}
                            className="btn btn-primary btn-sm"
                          >
                            Capture Selfie
                          </button>
                          <button
                            onClick={stopCamera}
                            disabled={isUploading}
                            className="btn btn-outline-secondary btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                      </>
                    ) : (
                      <button
                        onClick={() => startCamera('selfie')}
                        disabled={isUploading || selfieUploaded}
                        className="btn btn-outline-primary btn-sm"
                      >
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
                    <p className="card-text text-muted small">
                      Record a short video for enhanced liveness detection.
                    </p>
                    {videoUploaded ? (
                      <div className="alert alert-success py-2">
                        Video uploaded successfully.
                      </div>
                    ) : cameraMode === 'video' ? (
                      <>
                        <video
                          ref={videoElementRef}
                          className="w-100 rounded mb-3"
                          autoPlay
                          muted
                          playsInline
                          style={{ height: '320px', objectFit: 'cover' }}
                        />
                        {!cameraReady && (
                          <div className="text-muted small mb-2">
                            Starting camera preview... please allow access and wait.
                          </div>
                        )}
                        <div className="d-flex gap-2 mb-3">
                          <button
                            onClick={isRecording ? stopVideoRecording : startVideoRecording}
                            disabled={!cameraReady}
                            className={`btn btn-${isRecording ? 'danger' : 'primary'} btn-sm`}
                          >
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                          </button>
                          <button
                            onClick={stopCamera}
                            disabled={isUploading || isRecording}
                            className="btn btn-outline-secondary btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                        {recordedVideo && (
                          <>
                            <video
                              src={URL.createObjectURL(recordedVideo)}
                              controls
                              className="w-100 rounded mb-3"
                              style={{ maxHeight: '240px', objectFit: 'cover' }}
                            />
                            <button
                              onClick={uploadRecordedVideo}
                              disabled={isUploading}
                              className="btn btn-outline-primary btn-sm"
                            >
                              Upload Recorded Video
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => startCamera('video')}
                        disabled={isUploading || videoUploaded}
                        className="btn btn-outline-primary btn-sm"
                      >
                        Use Camera for Video
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                onClick={submitApplication}
                disabled={!canSubmit || isUploading}
                className="btn btn-success btn-lg"
              >
                {isUploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting…
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>

              {!canSubmit && (
                <small className="text-muted align-self-center">
                  Please upload at least Front ID and Selfie to submit.
                </small>
              )}
            </div>
          </>
        )}

        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
        {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}
      </div>
    </div>
  )
}
