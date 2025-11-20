import { useState } from 'react'
import './index.css'

function App() {
  const [file, setFile] = useState(null)
  const [rules, setRules] = useState(['', '', ''])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please select a valid PDF file.')
      setFile(null)
    }
  }

  const handleRuleChange = (index, value) => {
    const newRules = [...rules]
    newRules[index] = value
    setRules(newRules)
  }

  const handleCheck = async () => {
    if (!file) {
      setError('Please upload a PDF file first.')
      return
    }

    const validRules = rules.filter((rule) => rule.trim().length > 0)
    if (validRules.length === 0) {
      setError('Please enter at least one rule.')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('rules', JSON.stringify(validRules))

      console.log('Sending request to check document...')
      
      let response
      try {
        response = await fetch('/api/check-document', {
          method: 'POST',
          body: formData,
        })
      } catch (networkError) {
        console.error('Network error:', networkError)
        throw new Error('Cannot connect to server. Make sure the backend is running on port 4000.')
      }

      // Get response text first to check if it's empty
      const responseText = await response.text()
      console.log('Response status:', response.status)
      console.log('Response text:', responseText.substring(0, 200))
      
      if (!response.ok) {
        // Try to parse JSON error, but handle cases where it might not be valid JSON
        let errorMessage = 'Failed to check document'
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.error || errorData.details || errorMessage
          } catch {
            // If not valid JSON, use the text as error message
            errorMessage = responseText || errorMessage
          }
        } else {
          errorMessage = `Server returned status ${response.status} with no error message`
        }
        throw new Error(errorMessage)
      }

      // Parse the successful response
      if (!responseText) {
        throw new Error('Empty response from server')
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        throw new Error('Invalid response format from server')
      }

      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response structure from server')
      }

      console.log('Successfully received results:', data.results.length)
      setResults(data.results)
    } catch (err) {
      console.error('Error in handleCheck:', err)
      setError(err.message || 'An error occurred while checking the document.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>📄 PDF Rule Checker</h1>

      <div className="upload-section">
        <label className="upload-label">Upload PDF Document</label>
        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="file-input"
            disabled={loading}
          />
        </div>
        {file && <div className="file-name">Selected: {file.name}</div>}
      </div>

      <div className="rules-section">
        <div className="rules-title">Enter 3 Rules to Check</div>
        {rules.map((rule, index) => (
          <input
            key={index}
            type="text"
            placeholder={`Rule ${index + 1} (e.g., "The document must mention at least one date.")`}
            value={rule}
            onChange={(e) => handleRuleChange(index, e.target.value)}
            className="rule-input"
            disabled={loading}
          />
        ))}
      </div>

      <button
        onClick={handleCheck}
        disabled={loading || !file}
        className="check-button"
      >
        {loading ? 'Checking Document...' : 'Check Document'}
      </button>

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">Analyzing document with AI...</div>}

      {results && results.length > 0 && (
        <div className="results-section">
          <div className="results-title">Results</div>
          <table className="results-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Reasoning</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td>{result.rule}</td>
                  <td>
                    <span
                      className={`status-badge status-${result.status}`}
                    >
                      {result.status}
                    </span>
                  </td>
                  <td>{result.evidence}</td>
                  <td>{result.reasoning}</td>
                  <td>
                    <div className="confidence-bar">
                      <div className="confidence-fill">
                        <div
                          className="confidence-fill-inner"
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                      <span className="confidence-text">
                        {result.confidence}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App

