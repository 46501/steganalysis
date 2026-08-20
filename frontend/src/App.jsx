import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Search, FileText, Settings, FlaskConical, ShieldAlert, Activity, Moon, Bell, User } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import Compare from './pages/Compare';
import MLLab from './pages/ML_Lab';
import History from './pages/History';
import About from './pages/About';

function Layout({ children }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  const navLinkClass = (path) => `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
    isActive(path) 
      ? 'bg-gradient-to-r from-primary/20 to-neonPurple/20 text-textMain glow-border' 
      : 'text-textMuted hover:bg-surfaceHighlight/50 hover:text-textMain'
  }`;

  return (
    <div className="flex h-screen bg-background text-textMain overflow-hidden font-sans">
      
      {/* Background Decorative Gradient */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neonPurple/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <div className="w-64 bg-surface/80 backdrop-blur-xl border-r border-surfaceHighlight flex flex-col z-20 relative shadow-2xl hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-surfaceHighlight/50">
          <div className="p-2 bg-gradient-to-br from-primary to-neonPurple rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white glow-text">StegoDetect AI</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <Link to="/" className={navLinkClass('/')}>
            <LayoutDashboard size={20} className={isActive('/') ? 'text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]' : ''} />
            Dashboard
          </Link>
          <Link to="/compare" className={navLinkClass('/compare')}>
            <Search size={20} className={isActive('/compare') ? 'text-primary' : ''} />
            Image Comparison
          </Link>
          <Link to="/playground" className={navLinkClass('/playground')}>
            <FlaskConical size={20} className={isActive('/playground') ? 'text-neonPurple drop-shadow-[0_0_5px_rgba(139,92,246,0.8)]' : ''} />
            Steganography Playground
          </Link>
          <Link to="/ml" className={navLinkClass('/ml')}>
            <Activity size={20} className={isActive('/ml') ? 'text-primary' : ''} />
            ML Lab
          </Link>
          <Link to="/history" className={navLinkClass('/history')}>
            <FileText size={20} className={isActive('/history') ? 'text-primary' : ''} />
            Analysis History
          </Link>
          <Link to="/about" className={navLinkClass('/about')}>
            <ShieldAlert size={20} className={isActive('/about') ? 'text-primary' : ''} />
            About
          </Link>
        </nav>

        {/* Sidebar Footer Status */}
        <div className="p-6 border-t border-surfaceHighlight/50 text-sm">
          <div className="flex items-center gap-2 text-textMuted mb-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
            System Status
          </div>
          <div className="text-accent font-medium text-xs">All Systems Operational</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Top Header */}
        <header className="h-20 border-b border-surfaceHighlight/40 flex justify-between items-center px-8 bg-background/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button could go here */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surfaceHighlight/40 rounded-full border border-surfaceHighlight text-sm text-textMuted font-medium">
              <Shield className="w-4 h-4 text-primary" /> Digital Forensics Platform
            </div>
          </div>
          <div className="flex items-center gap-4 text-textMuted">
            <button className="p-2 hover:text-white hover:bg-surfaceHighlight rounded-full transition-colors">
              <Moon size={20} />
            </button>
            <button className="p-2 hover:text-white hover:bg-surfaceHighlight rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-surfaceHighlight mx-2"></div>
            <button className="flex items-center gap-2 hover:text-white transition-colors">
              <div className="w-8 h-8 rounded-full bg-surfaceHighlight border border-surfaceHighlight flex items-center justify-center">
                <User size={16} />
              </div>
              <span className="text-sm font-medium hidden md:block">Investigator Pro</span>
            </button>
          </div>
        </header>
        
        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/ml" element={<MLLab />} />
          <Route path="/history" element={<History />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
