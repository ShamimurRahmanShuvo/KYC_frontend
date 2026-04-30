import { RegisterForm } from './components/RegisterForm'
import './App.css'

function App() {
  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5 col-xl-4">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}

export default App
