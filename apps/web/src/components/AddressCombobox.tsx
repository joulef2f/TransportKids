import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface AddressOption {
  label: string
  sublabel?: string
  address: string
  type: 'client' | 'child-pickup' | 'child-school'
}

interface AddressComboboxProps {
  value: string
  onChange: (address: string) => void
  options: AddressOption[]
  placeholder?: string
}

const typeColors: Record<AddressOption['type'], string> = {
  'client': '#00d4ff',
  'child-pickup': '#a855f7',
  'child-school': '#22c55e',
}
const typeLabels: Record<AddressOption['type'], string> = {
  'client': 'Client',
  'child-pickup': 'Ramassage',
  'child-school': 'École',
}

export function AddressCombobox({ value, onChange, options, placeholder }: AddressComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Check if click is inside the portal dropdown
        const portal = document.getElementById('address-combobox-portal')
        if (portal && portal.contains(e.target as Node)) return
        setOpen(false)
        setSearch('')
      }
    }
    const scrollHandler = () => updatePosition()
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', scrollHandler, true)
    window.addEventListener('resize', scrollHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', scrollHandler, true)
      window.removeEventListener('resize', scrollHandler)
    }
  }, [open, updatePosition])

  const filtered = options.filter(o =>
    search === '' ||
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.address.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (opt: AddressOption) => {
    onChange(opt.address)
    setOpen(false)
    setSearch('')
  }

  const dropdown = open ? (
    <div
      id="address-combobox-portal"
      style={{
        position: 'absolute',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
        maxHeight: '260px',
        overflowY: 'auto',
        borderRadius: '10px',
        border: '1px solid rgba(0,212,255,0.2)',
        background: 'rgba(8,12,24,0.98)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,255,0.08)',
        padding: '4px',
      }}
    >
      {/* Free text option */}
      {search && (
        <div
          onMouseDown={e => { e.preventDefault(); handleSelect({ label: search, address: search, type: 'client' }) }}
          style={{
            padding: '8px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '2px',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Utiliser : <span style={{ color: '#fff' }}>{search}</span>
        </div>
      )}

      {filtered.length === 0 && !search && (
        <p style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          Aucun résultat
        </p>
      )}

      {filtered.map((opt, i) => (
        <div
          key={i}
          onMouseDown={e => { e.preventDefault(); handleSelect(opt) }}
          style={{
            padding: '9px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{
            flexShrink: 0,
            marginTop: '2px',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: `${typeColors[opt.type]}18`,
            color: typeColors[opt.type],
            border: `1px solid ${typeColors[opt.type]}30`,
            whiteSpace: 'nowrap',
          }}>
            {typeLabels[opt.type]}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opt.label}
            </p>
            {opt.sublabel && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {opt.sublabel}
              </p>
            )}
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opt.address}
            </p>
          </div>
        </div>
      ))}
    </div>
  ) : null

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? search : value}
          placeholder={open ? 'Rechercher un client ou une personne...' : (placeholder || 'Sélectionner ou saisir une adresse...')}
          onChange={e => { setSearch(e.target.value); if (!open) { setOpen(true); updatePosition() } }}
          onFocus={() => { setOpen(true); setSearch(''); updatePosition() }}
          style={{
            width: '100%',
            padding: '8px 36px 8px 12px',
            borderRadius: '8px',
            border: `1px solid ${open ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.2)'}`,
            background: 'rgba(5,8,15,0.8)',
            color: (open || value) ? '#fff' : 'rgba(255,255,255,0.35)',
            fontSize: '14px',
            outline: 'none',
            boxShadow: open ? '0 0 0 2px rgba(0,212,255,0.15)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        <svg
          style={{ position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.2s', cursor: 'pointer', color: 'rgba(0,212,255,0.5)', flexShrink: 0 }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          onMouseDown={e => { e.preventDefault(); if (open) { setOpen(false); setSearch('') } else { setOpen(true); updatePosition(); inputRef.current?.focus() } }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  )
}
