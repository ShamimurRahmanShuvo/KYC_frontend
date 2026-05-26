interface HomePageProps {
  loggedIn: boolean
}

export function HomePage({ loggedIn }: HomePageProps) {
  return (
    <div className="card shadow-sm border-0 rounded-4">
      <div className="card-body p-4 p-md-5 text-center">
        <h1 className="display-6 fw-bold mb-3">Welcome to KYC service</h1>
        <p className="lead text-muted">
          {loggedIn
            ? 'Create your KYC application or check status of your application.'
            : 'Please register or login to check your status and manage your KYC application.'}
        </p>
      </div>
    </div>
  )
}
