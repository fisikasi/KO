import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CompetitionsPage from './pages/CompetitionsPage'
import CompetitionPage from './pages/CompetitionPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/saioa" replace />} />
      <Route path="/saioa" element={<LoginPage />} />
      <Route path="/kontua-sortu" element={<RegisterPage />} />
      <Route path="/lehiaketak" element={<CompetitionsPage />} />
      <Route path="/lehiaketak/:competitionId" element={<CompetitionPage />} />
    </Routes>
  )
}
