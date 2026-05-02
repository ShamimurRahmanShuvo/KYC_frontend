import { useEffect, useState } from 'react'
import { getReviewQueue, listKYCapplications } from '../services/api'
import { getAuthHeaders } from '../services/auth'
import type { AdminKYCItem } from '../types/auth'

export function AdminDashboard() {
  const [reviewQueue, setReviewQueue] = useState<AdminKYCItem[]>([])
  const [recentApplications, setRecentApplications] = useState<AdminKYCItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const [queueData, recentData] = await Promise.all([
        getReviewQueue(getAuthHeaders()),
        listKYCapplications(1, 5, getAuthHeaders())
      ])
      setReviewQueue(queueData)
      setRecentApplications(recentData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
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

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-4">Admin Dashboard</h1>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Review Queue</h5>
            </div>
            <div className="card-body">
              {reviewQueue.length === 0 ? (
                <p className="text-muted">No applications in review queue</p>
              ) : (
                <div className="list-group list-group-flush">
                  {reviewQueue.slice(0, 5).map((item) => (
                    <div key={item.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{item.case_reference}</strong>
                          <br />
                          <small className="text-muted">
                            Overall Score: {item.overall_score.toFixed(2)}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Recent Applications</h5>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                {recentApplications.map((item) => (
                  <div key={item.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{item.case_reference}</strong>
                        <br />
                        <small className="text-muted">
                          {new Date(item.created_at).toLocaleDateString()}
                        </small>
                      </div>
                      <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Quick Stats</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3">
                  <h3 className="text-primary">{reviewQueue.length}</h3>
                  <p className="text-muted mb-0">Pending Review</p>
                </div>
                <div className="col-md-3">
                  <h3 className="text-success">
                    {recentApplications.filter(item => item.status === 'verified').length}
                  </h3>
                  <p className="text-muted mb-0">Approved Today</p>
                </div>
                <div className="col-md-3">
                  <h3 className="text-danger">
                    {recentApplications.filter(item => item.status === 'rejected').length}
                  </h3>
                  <p className="text-muted mb-0">Rejected Today</p>
                </div>
                <div className="col-md-3">
                  <h3 className="text-warning">
                    {recentApplications.filter(item => item.status === 'manual_review').length}
                  </h3>
                  <p className="text-muted mb-0">Manual Review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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