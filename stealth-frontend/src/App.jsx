import { useState } from 'react';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('detect'); // 'detect' or 'humanize'

const handleProcess = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setResult(null);

    const endpoint = mode === 'detect' ? '/api/detect' : '/api/humanize';
    
    try {
      // Point directly to the new API subdomain
      const response = await fetch(`https://stealth-api.raunit.dpdns.org${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      
      if (!response.ok) throw new Error("Server error");
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ error: "Failed to connect to backend API." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto space-y-8 mt-10">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent pb-2">
            StealthEngine
          </h1>
          <p className="text-gray-400">AI Detection & Humanization toolkit.</p>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex space-x-2 bg-gray-900 p-1.5 rounded-lg w-max border border-gray-800">
          <button 
            className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all ${mode === 'detect' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            onClick={() => setMode('detect')}
          >
            AI Detector (Qwen)
          </button>
          <button 
            className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all ${mode === 'humanize' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            onClick={() => setMode('humanize')}
          >
            Humanizer (Llama)
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <textarea
            className="w-full h-56 p-5 bg-gray-900 rounded-xl border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none shadow-inner text-gray-200 placeholder-gray-600 text-lg"
            placeholder="Paste your generated text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button
            onClick={handleProcess}
            disabled={loading || !inputText.trim()}
            className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center animate-pulse">
                Processing on Local Server...
              </span>
            ) : mode === 'detect' ? (
              'Analyze Text'
            ) : (
              'Bypass AI Detection'
            )}
          </button>
        </div>

        {/* Results Area */}
        {result && !result.error && (
          <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl animate-fade-in">
            {mode === 'detect' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-medium text-gray-300">AI Probability Score:</h3>
                  <span className={`text-2xl font-bold ${result.score > 70 ? 'text-red-400' : result.score > 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {result.score}%
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-gray-800 rounded-full h-2.5 mt-4 mb-6">
                  <div className={`h-2.5 rounded-full ${result.score > 70 ? 'bg-red-500' : result.score > 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${result.score}%` }}></div>
                </div>
                <p className="text-gray-400 bg-gray-950 p-4 rounded-lg border border-gray-800">{result.reason}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-gray-300">Humanized Output:</h3>
                <div className="p-5 bg-gray-950 rounded-lg border border-gray-800 relative group">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{result.humanizedText}</p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(result.humanizedText)}
                    className="absolute top-4 right-4 p-2 bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {result?.error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg text-center">
            {result.error}
          </div>
        )}
      </div>
    </div>
  );
}