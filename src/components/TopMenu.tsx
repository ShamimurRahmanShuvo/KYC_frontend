import type { Dispatch, SetStateAction } from 'react'

type PageKey = 'home' | 'register' | 'login' | 'create-kyc'

interface TopMenuProps {
  activePage: PageKey
  setActivePage: Dispatch<SetStateAction<PageKey>>
  isLoggedIn: boolean
  onLogout: () => void
}

export function TopMenu({ activePage, setActivePage, isLoggedIn, onLogout }: TopMenuProps) {
  return (
    <nav className="navbar navbar-expand navbar-white bg-white border-bottom shadow-sm">
      <div className="container-fluid px-4">
        <span className="navbar-brand mb-0 h4 cursor-pointer" onClick={() => setActivePage('home')}>
          KYC Service
        </span>

        <ul className="navbar-nav ms-auto mb-0 flex-row align-items-center gap-2">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link btn btn-link${activePage === 'home' ? ' active fw-bold' : ''}`}
              onClick={() => setActivePage('home')}
            >
              Home
            </button>
          </li>
          {!isLoggedIn && (
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn btn-link${activePage === 'register' ? ' active fw-bold' : ''}`}
                onClick={() => setActivePage('register')}
              >
                Register
              </button>
            </li>
          )}
          {isLoggedIn ? (
            <li className="nav-item">
              <button
                type="button"
                className="nav-link btn btn-link"
                onClick={onLogout}
              >
                Logout
              </button>
            </li>
          ) : (
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn btn-link${activePage === 'login' ? ' active fw-bold' : ''}`}
                onClick={() => setActivePage('login')}
              >
                Login
              </button>
            </li>
          )}
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link btn btn-link${activePage === 'create-kyc' ? ' active fw-bold' : ''}`}
              onClick={() => setActivePage('create-kyc')}
            >
              Create KYC
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}
