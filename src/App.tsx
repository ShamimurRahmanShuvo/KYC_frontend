import { useState } from 'react'
import { TopMenu } from './components/TopMenu'
import { HomePage } from './components/HomePage'
import { RegisterForm } from './components/RegisterForm'
import { LoginForm } from './components/LoginForm'
import { CreateKYCPage } from './components/CreateKYCPage'
import './App.css'

type PageKey = 'home' | 'register' | 'login' | 'create-kyc'

function App() {
  const [activePage, setActivePage] = useState<PageKey>('home')

  let pageContent = null
  if (activePage === 'register') {
    pageContent = <RegisterForm />
  } else if (activePage === 'login') {
    pageContent = <LoginForm />
  } else if (activePage === 'create-kyc') {
    pageContent = <CreateKYCPage />
  } else {
    pageContent = <HomePage />
  }

  return (
    <div className="app-shell bg-light min-vh-100">
      <TopMenu activePage={activePage} setActivePage={setActivePage} />
      <main className="container py-5">{pageContent}</main>
    </div>
  )
}

export default App
