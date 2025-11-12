import React, { useState, useRef } from 'react'
import './Upload.css'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  function onChoose(e) {
    const f = (e.target && e.target.files && e.target.files[0]) || null
    handleFile(f)
  }

  function handleFile(f) {
    setError(null)
    if (!f) return setFile(null)
    // basic client-side validation: size limit 10MB
    if (f.size > 10 * 1024 * 1024) {
      setError('Fișierul este prea mare (max 10 MB)')
      return
    }

    // Accept only PDF files: check MIME type and fallback to extension check
    const name = (f.name || '').toLowerCase()
    const isPdfMime = f.type === 'application/pdf'
    const hasPdfExt = name.endsWith('.pdf')
    if (!isPdfMime && !hasPdfExt) {
      setError('Doar fișiere PDF sunt permise')
      return
    }

    setFile(f)
  }

  function onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || null
    handleFile(f)
  }

  function onDragOver(e) { e.preventDefault(); e.stopPropagation() }

  async function onUpload() {
    if (!file) return setError('Alege un fișier înainte de upload')
    setUploading(true)
    setError(null)

    try {
      // Demo: we won't actually send the file unless you enable endpoint.
      // Example POST using FormData (uncomment & set URL to use):
      // const form = new FormData();
      // form.append('file', file);
      // const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: form });
      // const json = await res.json();

      // Simulate delay
      await new Promise((r) => setTimeout(r, 700))
      console.log('Uploaded (demo):', file.name, file.size, file.type)
      alert('Upload demo complet: ' + file.name)
      setFile(null)
    } catch (e) {
      console.error(e)
      setError('Eroare la upload (demo)')
    } finally {
      setUploading(false)
    }
  }

  // Only PDFs are allowed; no image preview

  return (
    <div className="upload-root">
      <div className="upload-card">
        <h2>Upload document</h2>

        <div
          className="dropzone"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => inputRef.current && inputRef.current.click()}
          role="button"
          tabIndex={0}
        >
          <input ref={inputRef} type="file" onChange={onChoose} accept="application/pdf,.pdf" hidden />
          {!file ? (
            <div className="dz-empty">
              <div className="dz-icon">📤</div>
              <div>Trage un fișier aici sau dă click pentru a alege</div>
              <div className="dz-note">Max 10 MB. Tipuri acceptate: PDF doar</div>
            </div>
          ) : (
            <div className="dz-hasfile">
              <div className="file-meta">
                <div className="file-name">{file.name}</div>
                <div className="file-info">{(file.size / 1024).toFixed(1)} KB — {file.type || 'unknown'}</div>
              </div>
              {/* PDF preview is not shown in demo; could add pdf.js preview later */}
            </div>
          )}
        </div>

        {error && <div className="upload-error">{error}</div>}

        <div className="upload-actions">
          <button className="btn" onClick={() => { inputRef.current && (inputRef.current.value = null); setFile(null) }}>Clear</button>
          <button className="btn primary" onClick={onUpload} disabled={!file || uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>

        <div style={{marginTop:12,color:'rgba(230,238,248,0.7)'}}>
          (Demo offline) — pentru upload real dezactivează simularea și setează endpoint-ul în cod.
        </div>
      </div>
    </div>
  )
}
