import { useEffect, useState } from 'react'
import { listKYCapplications, searchKYCapplications } from '../services/api'
import { getAuthHeaders } from '../services/auth'
import type { AdminKYCItem, AdminKYCListResponse } from '../types/auth'

interface KYCListProps {
  onSelectKYC: (kycId: number) => void
}

export function KYCList({ onSelectKYC }: KYCListProps) {
  const [applications, setApplications] = useState<AdminKYCItem[]>([])
  const [pagination, setPagination] = useState<AdminKYCListResponse['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchStatus, setSearchStatus] = useState('')
  const [searchIdNumber, setSearchIdNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!isSearching) {
      loadApplications(currentPage)
    }
  }, [currentPage, isSearching])

  async function loadApplications(page: number = 1) {
    try {
      setLoading(true)
      const data = await listKYCapplications(page, 10, getAuthHeaders())
      setApplications(data.items)
      setPagination(data.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    if (!searchStatus && !searchIdNumber) {
      setIsSearching(false)
      loadApplications(1)
      return
    }

    try {
      setLoading(true)
      setIsSearching(true)
      const results = await searchKYCapplications(
        getAuthHeaders(),
        searchStatus || undefined,
        searchIdNumber || undefined
      )
      setApplications(results)
      setPagination(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function handleClearSearch() {
    setSearchStatus('')
    setSearchIdNumber('')
    setIsSearching(false)
    setCurrentPage(1)
    loadApplications(1)
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
      <h2 className="mb-4">KYC Applications</h2>

      {/* Search Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="statusFilter" className="form-label">Status</label>
              <select
                id="statusFilter"
                className="form-select"
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="manual_review">Manual Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-md-4">
              <label htmlFor="idNumberFilter" className="form-label">ID Number</label>
              <input
                type="text"
                id="idNumberFilter"
                className="form-control"
                placeholder="Search by ID number"
                value={searchIdNumber}
                onChange={(e) => setSearchIdNumber(e.target.value)}
              />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button
                className="btn btn-primary me-2"
                onClick={handleSearch}
              >
                Search
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card">
        <div className="card-body">
          {applications.length === 0 ? (
            <p className="text-muted text-center py-4">No applications found</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Case Reference</th>
                    <th>Status</th>
                    <th>Overall Score</th>
                    <th>Face Score</th>
                    <th>Document Score</th>
                    <th>Fraud Score</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.case_reference}</strong>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(app.status)}`}>
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{app.overall_score.toFixed(2)}</td>
                      <td>{app.face_score.toFixed(2)}</td>
                      <td>{app.document_score.toFixed(2)}</td>
                      <td>{app.fraud_score.toFixed(2)}</td>
                      <td>{new Date(app.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => onSelectKYC(app.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
              <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage === pagination.total_pages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.total_pages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
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