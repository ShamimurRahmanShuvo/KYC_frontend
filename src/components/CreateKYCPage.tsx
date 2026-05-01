export function CreateKYCPage() {
  return (
    <div className="card shadow-sm border-0 rounded-4">
      <div className="card-body p-4 p-md-5">
        <h1 className="card-title h2 mb-3">Create KYC</h1>
        <p className="text-muted mb-4">
          This section will allow you to start a new KYC application once you are logged in.
        </p>
        <div className="alert alert-info" role="alert">
          Please login first to create and manage your KYC request.
        </div>
      </div>
    </div>
  )
}
