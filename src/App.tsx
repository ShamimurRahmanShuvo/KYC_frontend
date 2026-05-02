import { useEffect, useState } from 'react'
import { TopMenu } from './components/TopMenu'
import { HomePage } from './components/HomePage'
import { RegisterForm } from './components/RegisterForm'
import { LoginForm } from './components/LoginForm'
import { CreateKYCPage } from './components/CreateKYCPage'
import { AdminDashboard } from './components/AdminDashboard'
import { KYCList } from './components/KYCList'
import { KYCDetail } from './components/KYCDetail'
import type { CurrentUserResponse } from './types/auth'
import { clearAuthToken, ensureCurrentUser, isLoggedIn } from './services/auth'
import './App.css'

type PageKey = 'home' | 'register' | 'login' | 'create-kyc' | 'admin-dashboard' | 'admin-kyc-list' | 'admin-kyc-detail'

function App() {
  const [activePage, setActivePage] = useState<PageKey>('home')
  const [loggedIn, setLoggedIn] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null)
  const [selectedKYCId, setSelectedKYCId] = useState<number | null>(null)

  useEffect(() => {
    async function initAuth() {
      if (!isLoggedIn()) {
        setLoggedIn(false)
        return
      }

      const user = await ensureCurrentUser()
      setCurrentUser(user)
      setLoggedIn(Boolean(user))
      if (user && user.roles.some((role) => role === 'admin' || role === 'reviewer')) {
        setActivePage('admin-dashboard')
      }
    }

    initAuth()
  }, [])

  async function handleLoginSuccess() {
    const user = await ensureCurrentUser()
    setCurrentUser(user)
    setLoggedIn(Boolean(user))

    if (user && user.roles.some((role) => role === 'admin' || role === 'reviewer')) {
      setActivePage('admin-dashboard')
    } else if (user) {
      setActivePage('create-kyc')
    } else {
      setActivePage('login')
    }
  }

  function handleRegisterSuccess() {
    setActivePage('login')
  }

  function handleLogout() {
    clearAuthToken()
    setLoggedIn(false)
    setSelectedKYCId(null)
    setActivePage('home')
  }

  function handleSelectKYC(kycId: number) {
    setSelectedKYCId(kycId)
    setActivePage('admin-kyc-detail')
  }

  function handleBackToList() {
    setSelectedKYCId(null)
    setActivePage('admin-kyc-list')
  }

  function handleReviewComplete() {
    setSelectedKYCId(null)
    setActivePage('admin-kyc-list')
  }

  let pageContent = null
  if (activePage === 'register') {
    pageContent = <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
  } else if (activePage === 'login') {
    pageContent = <LoginForm onLoginSuccess={handleLoginSuccess} />
  } else if (activePage === 'create-kyc') {
    pageContent = loggedIn ? <CreateKYCPage /> : <LoginForm onLoginSuccess={handleLoginSuccess} />
  } else if (activePage === 'admin-dashboard') {
    pageContent = loggedIn && currentUser && currentUser.roles.some((role) => role === 'admin' || role === 'reviewer') ? (
      <AdminDashboard />
    ) : (
      <LoginForm onLoginSuccess={handleLoginSuccess} />
    )
  } else if (activePage === 'admin-kyc-list') {
    pageContent = loggedIn && currentUser && currentUser.roles.some((role) => role === 'admin' || role === 'reviewer') ? (
      <KYCList onSelectKYC={handleSelectKYC} />
    ) : (
      <LoginForm onLoginSuccess={handleLoginSuccess} />
    )
  } else if (activePage === 'admin-kyc-detail') {
    pageContent = loggedIn && currentUser && currentUser.roles.some((role) => role === 'admin' || role === 'reviewer') && selectedKYCId ? (
      <KYCDetail
        kycId={selectedKYCId}
        onBack={handleBackToList}
        onReviewComplete={handleReviewComplete}
      />
    ) : (
      <LoginForm onLoginSuccess={handleLoginSuccess} />
    )
  } else {
    pageContent = <HomePage />
  }

  return (
    <div className="app-shell bg-light min-vh-100">
      <TopMenu
        activePage={activePage}
        setActivePage={setActivePage}
        isLoggedIn={loggedIn}
        showAdmin={currentUser ? currentUser.roles.some((role) => role === 'admin' || role === 'reviewer') : false}
        onLogout={handleLogout}
      />
      <main className="container py-5">{pageContent}</main>
    </div>
  )
}

export default App
