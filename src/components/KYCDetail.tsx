import { useEffect, useState } from 'react'
import { getKYCDetail, approveKYC, rejectKYC } from '../services/api'
import { getAuthHeaders } from '../services/auth'
import type { AdminDocument, AdminKYCDetailResponse, AdminReviewRequest } from '../types/auth'

interface KYCDetailProps {
  kycId: number
  onBack: () => void
  onReviewComplete: () => void
}

export function KYCDetail({ kycId, onBack, onReviewComplete }: KYCDetailProps) {
  const [application, setApplication] = useState<AdminKYCDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<AdminDocument | null>(null)

  useEffect(() => {
    loadKYCDetail()
  }, [kycId])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPreviewDocument(null)
      }
    }

    if (previewDocument) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [previewDocument])

  async function loadKYCDetail() {
    try {
      setLoading(true)
      const data = await getKYCDetail(kycId, getAuthHeaders())
      setApplication(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KYC details')
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(action: 'approve' | 'reject') {
    if (!application) return

    try {
      setSubmitting(true)
      const payload: AdminReviewRequest = {
        action,
        notes: reviewNotes.trim() || undefined
      }

      if (action === 'approve') {
        await approveKYC(kycId, payload, getAuthHeaders())
      } else {
        await rejectKYC(kycId, payload, getAuthHeaders())
      }

      onReviewComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || 'Application not found'}
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>KYC Application Details</h2>
        <button className="btn btn-outline-secondary" onClick={onBack}>
          ← Back to List
        </button>
      </div>

      <div className="row">
        <div className="col-md-8">
          {/* Application Overview */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Application Overview</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Case Reference:</strong> {application.case_reference}</p>
                  <p><strong>Status:</strong>
                    <span className={`badge ms-2 ${getStatusBadgeClass(application.status)}`}>
                      {application.status.replace('_', ' ')}
                    </span>
                  </p>
                  <p><strong>Decision Source:</strong> {application.decision_source || 'N/A'}</p>
                  <p><strong>Model Version:</strong> {application.model_version || 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Submitted:</strong> {application.submitted_at ? new Date(application.submitted_at).toLocaleString() : 'N/A'}</p>
                  <p><strong>Reviewed:</strong> {application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : 'N/A'}</p>
                  <p><strong>Updated:</strong> {new Date(application.updated_at).toLocaleString()}</p>
                </div>
              </div>
              {application.user && (
                <div className="mt-4 border-top pt-3">
                  <h6>Applicant Information</h6>
                  <p><strong>Username:</strong> {application.user.username}</p>
                  <p><strong>Email:</strong> {application.user.email || 'N/A'}</p>
                  <p><strong>User ID:</strong> {application.user.id}</p>
                  <p><strong>Created:</strong> {new Date(application.user.created_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scores */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Verification Scores</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-2">
                  <div className="score-circle">
                    <div className="score-value">{application.overall_score.toFixed(1)}</div>
                    <div className="score-label">Overall</div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="score-circle">
                    <div className="score-value">{application.face_score.toFixed(1)}</div>
                    <div className="score-label">Face</div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="score-circle">
                    <div className="score-value">{application.liveness_score.toFixed(1)}</div>
                    <div className="score-label">Liveness</div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="score-circle">
                    <div className="score-value">{application.document_score.toFixed(1)}</div>
                    <div className="score-label">Document</div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="score-circle">
                    <div className="score-value">{application.fraud_score.toFixed(1)}</div>
                    <div className="score-label">Fraud</div>
                  </div>
                </div>
              </div>
              {application.reason_codes && (
                <div className="mt-3">
                  <strong>Reason Codes:</strong> {application.reason_codes}
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Documents</h5>
            </div>
            <div className="card-body">
              {application.documents && application.documents.length > 0 ? (
                <div className="row">
                  {application.documents.map((doc) => (
                    <div key={doc.id} className="col-md-6 mb-3">
                      <div className="card">
                        <div className="card-body">
                          <h6>{doc.side.toUpperCase()} - {doc.document_type || 'Unknown'}</h6>
                          <p><strong>Name:</strong> {doc.extracted_name || 'N/A'}</p>
                          <p><strong>ID Number:</strong> {doc.extracted_id_number || 'N/A'}</p>
                          <p><strong>DOB:</strong> {doc.extracted_dob || 'N/A'}</p>
                          <p><strong>Expiry:</strong> {doc.extracted_expiry_date || 'N/A'}</p>
                          <div className="row">
                            <div className="col-6">
                              <small>OCR: {doc.oce_confidence.toFixed(2)}</small>
                            </div>
                            <div className="col-6">
                              <small>Authenticity: {doc.authenticity_score.toFixed(2)}</small>
                            </div>
                          </div>
                          {doc.file_path ? (
                            <div className="mt-3">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setPreviewDocument(doc)}
                                type="button"
                              >
                                Preview Document
                              </button>
                              <div className="mt-3">
                                <small className="text-muted">Click preview to open the document image in a modal.</small>
                              </div>
                            </div>
                          ) : (
                            <button className="btn btn-sm btn-outline-secondary mt-2" disabled>
                              No Document URL
                            </button>
                          )}
                          {doc.is_expired && <div className="text-danger mt-2">⚠️ Document Expired</div>}
                          {doc.is_tampered && <div className="text-danger mt-2">⚠️ Document Tampered</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-secondary mb-0">No documents uploaded for this case yet.</div>
              )}
            </div>
          </div>

          {/* Biometric Sessions */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Biometric Verification</h5>
            </div>
            <div className="card-body">
              {application.biometric_sessions && application.biometric_sessions.length > 0 ? (
                application.biometric_sessions.map((session) => (
                  <div key={session.id} className="mb-3">
                    <h6>{session.capture_type} - {session.session_reference}</h6>
                    <div className="row">
                      <div className="col-md-3">
                        <strong>Passive Liveness:</strong> {session.passive_liveness_score.toFixed(2)}
                      </div>
                      <div className="col-md-3">
                        <strong>Active Liveness:</strong> {session.active_liveness_score.toFixed(2)}
                      </div>
                      <div className="col-md-3">
                        <strong>Combined:</strong> {session.combined_liveness_score.toFixed(2)}
                      </div>
                      <div className="col-md-3">
                        <strong>Face Match:</strong> {session.face_match_score.toFixed(2)}
                      </div>
                    </div>
                    {session.challenge_result !== undefined && (
                      <p><strong>Challenge Result:</strong> {session.challenge_result}</p>
                    )}
                    <button className="btn btn-sm btn-outline-primary">
                      View Media
                    </button>
                  </div>
                ))
              ) : (
                <div className="alert alert-secondary mb-0">No biometric sessions recorded for this case yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Review Actions */}
          {(application.status === 'manual_review' || application.status === 'pending') && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Review Actions</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="reviewNotes" className="form-label">Review Notes (Optional)</label>
                  <textarea
                    id="reviewNotes"
                    className="form-control"
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                  />
                </div>
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-success"
                    onClick={() => handleReview('approve')}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Approve Application'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleReview('reject')}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Reject Application'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="card mt-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Status Information</h5>
            </div>
            <div className="card-body">
              <p><strong>Current Status:</strong> {application.status.replace('_', ' ')}</p>
              {application.status === 'verified' && (
                <div className="alert alert-success">
                  ✓ This application has been approved
                </div>
              )}
              {application.status === 'rejected' && (
                <div className="alert alert-danger">
                  ✗ This application has been rejected
                </div>
              )}
              {application.status === 'manual_review' && (
                <div className="alert alert-warning">
                  ⚠️ This application requires manual review
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {previewDocument && (
        <div className="modal-backdrop show" style={{ zIndex: 1050 }} />
      )}
      {previewDocument && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ zIndex: 1055, backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{previewDocument.side.toUpperCase()} Document Preview</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setPreviewDocument(null)}
                />
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-8">
                    <img
                      src={previewDocument.file_path}
                      alt={`${previewDocument.side} document preview`}
                      className="img-fluid rounded"
                      style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                    />
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <p><strong>Type:</strong> {previewDocument.document_type || 'Unknown'}</p>
                      <p><strong>Side:</strong> {previewDocument.side}</p>
                      <p><strong>Name:</strong> {previewDocument.extracted_name || 'N/A'}</p>
                      <p><strong>ID Number:</strong> {previewDocument.extracted_id_number || 'N/A'}</p>
                      <p><strong>DOB:</strong> {previewDocument.extracted_dob || 'N/A'}</p>
                      <p><strong>Expiry:</strong> {previewDocument.extracted_expiry_date || 'N/A'}</p>
                      <p><strong>OCR Confidence:</strong> {previewDocument.oce_confidence.toFixed(2)}</p>
                      <p><strong>Authenticity:</strong> {previewDocument.authenticity_score.toFixed(2)}</p>
                      {previewDocument.is_expired && <div className="text-danger">⚠️ Document Expired</div>}
                      {previewDocument.is_tampered && <div className="text-danger">⚠️ Document Tampered</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewDocument(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'verified':
      return 'bg-success'
    case 'rejected':
      return 'bg-danger'
    case 'manual_review':
      return 'bg-warning text-dark'
    case 'pending':
      return 'bg-secondary'
    case 'processing':
      return 'bg-info'
    default:
      return 'bg-light text-dark'
  }
}