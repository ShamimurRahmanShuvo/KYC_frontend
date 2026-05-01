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
  const selfieRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  // Upload states
  const [frontIdUploaded, setFrontIdUploaded] = useState(false)
  const [backIdUploaded, setBackIdUploaded] = useState(false)
  const [selfieUploaded, setSelfieUploaded] = useState(false)
  const [videoUploaded, setVideoUploaded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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

  async function uploadFile(file: File, endpoint: string, setUploaded: (value: boolean) => void) {
    if (!kycApplication) return

    const formData = new FormData()
    formData.append('file', file)

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
                      Take a clear selfie showing your face clearly.
                    </p>
                    <input
                      ref={selfieRef}
                      type="file"
                      accept="image/*"
                      className="form-control mb-2"
                      disabled={selfieUploaded}
                    />
                    <button
                      onClick={() => handleFileUpload(selfieRef, 'upload-selfie', setSelfieUploaded)}
                      disabled={isUploading || selfieUploaded}
                      className="btn btn-outline-primary btn-sm"
                    >
                      {selfieUploaded ? '✓ Uploaded' : 'Upload Selfie'}
                    </button>
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
                    <input
                      ref={videoRef}
                      type="file"
                      accept="video/*"
                      className="form-control mb-2"
                      disabled={videoUploaded}
                    />
                    <button
                      onClick={() => handleFileUpload(videoRef, 'upload-video', setVideoUploaded)}
                      disabled={isUploading || videoUploaded}
                      className="btn btn-outline-primary btn-sm"
                    >
                      {videoUploaded ? '✓ Uploaded' : 'Upload Video'}
                    </button>
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
