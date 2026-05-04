import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import AddRudimentForm from './components/AddRudimentForm'
import Metronome from './components/Metronome'
import './App.css'

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleRudimentAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30">

        {/* Mobile overlay — tap outside sidebar to close */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Hamburger button — mobile only */}
        <button
          className="fixed top-4 left-4 z-30 md:hidden bg-slate-900 border border-slate-800 rounded-xl p-2.5"
          onClick={() => setSidebarOpen(prev => !prev)}
        >
          <div className="w-5 h-0.5 bg-slate-300 mb-1" />
          <div className="w-5 h-0.5 bg-slate-300 mb-1" />
          <div className="w-5 h-0.5 bg-slate-300" />
        </button>

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Rudiments page — form + dashboard */}
            <Route
              path="/"
              element={
                <>
                  <AddRudimentForm onRudimentAdded={handleRudimentAdded} />
                  <div className="p-8">
                    <Dashboard key={refreshKey} />
                  </div>
                </>
              }
            />

            {/* Metronome page */}
            <Route
              path="/metronome"
              element={
                <div className="p-8">
                  <Metronome />
                </div>
              }
            />

            {/* Placeholder pages */}
            <Route
              path="/analytics"
              element={
                <div className="p-8 flex items-center justify-center h-full">
                  <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-xs">ANALYTICS COMING SOON</p>
                </div>
              }
            />
            <Route
              path="/social"
              element={
                <div className="p-8 flex items-center justify-center h-full">
                  <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-xs">SOCIAL COMING SOON</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
