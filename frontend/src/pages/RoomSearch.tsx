import { useCallback, useState } from 'react'
import { ApiError, searchAvailableRooms } from '../api/client'
import AvailabilityForm from '../components/AvailabilityForm'
import type { AvailabilitySearchInput } from '../components/AvailabilityForm'
import AvailabilityResults from '../components/AvailabilityResults'
import type { SearchStatus } from '../components/AvailabilityResults'
import type { Room } from '../types'

const SEARCH_STYLES = `
.rs-header { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-4); }
.rs-title { font-size: 28px; line-height: 36px; }
.rs-subtitle { margin: 0; font-size: 14px; line-height: 20px; color: var(--color-fg_muted); }
.rs-card { background: var(--color-surface_raised); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 20px; }
.rs-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-3); }
.rs-field { display: flex; flex-direction: column; gap: 6px; }
.rs-label { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--color-fg); }
.rs-label-spacer { visibility: hidden; }
.rs-input { height: 44px; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border_strong); background: #FFFFFF; font-family: var(--font-sans); font-size: 14px; line-height: 20px; color: var(--color-fg); width: 100%; }
.rs-input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-focus_ring); }
.rs-input[aria-invalid="true"] { border-color: var(--color-danger); box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18); }
.rs-field-error { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 13px; line-height: 20px; color: var(--color-danger); }
.rs-field-submit { justify-content: flex-end; }
.rs-chips { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.rs-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 14px; border-radius: var(--radius-pill); border: 1px solid var(--color-border); background: #FFFFFF; color: var(--color-fg_muted); font-family: var(--font-sans); font-size: 13px; line-height: 20px; font-weight: 500; cursor: pointer; transition: background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out; }
.rs-chip:hover { background: var(--color-surface); color: var(--color-fg); }
.rs-chip:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-focus_ring); }
.rs-chip[aria-pressed="true"] { background: var(--color-accent_soft); color: var(--color-accent); border-color: var(--color-accent); }
.rs-chip .rs-chip-check { display: none; }
.rs-chip[aria-pressed="true"] .rs-chip-check { display: inline-flex; }
.rs-chip--readonly { min-height: 28px; padding: 2px 10px; background: var(--color-surface); color: var(--color-fg_muted); border-color: transparent; cursor: default; }
.rs-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-1); min-height: 44px; padding: 12px 20px; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 14px; line-height: 20px; font-weight: 500; border: 1px solid transparent; cursor: pointer; text-decoration: none; transition: background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out, transform 120ms ease-out; }
.rs-btn-primary { background: var(--color-accent); color: #FFFFFF; }
.rs-btn-primary:hover { background: var(--color-accent_hover); }
.rs-btn-primary:active { background: var(--color-accent_active); transform: translateY(1px); }
.rs-btn-primary:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-focus_ring); border-color: var(--color-accent); }
.rs-btn-secondary { background: #FFFFFF; color: var(--color-fg); border-color: var(--color-border_strong); }
.rs-btn-secondary:hover { background: var(--color-surface); }
.rs-btn-secondary:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-focus_ring); border-color: var(--color-accent); }
.rs-btn:disabled, .rs-btn[aria-disabled="true"] { background: var(--color-disabled_bg); color: var(--color-disabled_fg); border-color: transparent; cursor: not-allowed; transform: none; }
.rs-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--color-fg_muted); border-top-color: transparent; animation: rs-spin 0.7s linear infinite; }
@keyframes rs-spin { to { transform: rotate(360deg); } }
.rs-results-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-3); margin-top: var(--space-5); }
.rs-room-card { position: relative; display: flex; flex-direction: column; gap: var(--space-2); min-height: 88px; padding: 20px; background: var(--color-surface_raised); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); cursor: pointer; color: var(--color-fg); text-decoration: none; transition: border-color 120ms ease-out; }
.rs-room-card::before { content: ""; position: absolute; left: -1px; top: 16px; bottom: 16px; width: 2px; border-radius: 2px; background: transparent; transition: background-color 120ms ease-out; }
.rs-room-card:hover { border-color: var(--color-accent); }
.rs-room-card:hover::before { background: var(--color-accent); }
.rs-room-card:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-focus_ring); border-color: var(--color-accent); }
.rs-room-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-2); }
.rs-room-card-name { font-size: 16px; line-height: 24px; font-weight: 600; }
.rs-room-card-seats { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; line-height: 20px; color: var(--color-fg_muted); white-space: nowrap; }
.rs-pill--free { align-self: flex-start; display: inline-flex; align-items: center; padding: 2px 10px; border-radius: var(--radius-pill); font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; background: var(--color-success_soft); color: var(--color-success); }
.rs-skeleton { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-5); }
.rs-skeleton-row { height: 88px; background: var(--color-surface); border-radius: var(--radius-md); animation: rs-shimmer 1.2s ease-in-out infinite; }
@keyframes rs-shimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
.rs-empty { max-width: 420px; margin: 0 auto; padding: 48px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-2); }
.rs-empty-icon { width: 40px; height: 40px; color: var(--color-fg_muted); }
.rs-empty-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
.rs-empty-body { margin: 0; font-size: 14px; line-height: 20px; color: var(--color-fg_muted); }
.rs-error { position: relative; display: flex; flex-direction: column; gap: var(--space-1); margin-top: var(--space-5); padding: 12px 16px 12px 20px; border-radius: var(--radius-md); border: 1px solid #FDE68A; background: var(--color-warning_soft); color: #78350F; }
.rs-error::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; background: var(--color-warning); }
.rs-error-title { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
.rs-error-message { margin: 0; font-size: 14px; line-height: 20px; }
.rs-error-code { margin: 0; font-family: var(--font-mono); font-size: 12px; line-height: 16px; color: var(--color-fg_muted); }
.rs-error .rs-btn { align-self: flex-start; margin-top: var(--space-1); }
@media (min-width: 640px) { .rs-grid { grid-template-columns: 1fr 1fr; } .rs-field-span-2 { grid-column: 1 / -1; } .rs-results-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .rs-grid { grid-template-columns: repeat(4, 1fr); } .rs-field-span-2 { grid-column: span 2; } .rs-results-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 479px) { .rs-btn { width: 100%; } }
`

export default function RoomSearch() {
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [rooms, setRooms] = useState<Room[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [lastSearch, setLastSearch] = useState<AvailabilitySearchInput | null>(null)

  const runSearch = useCallback(async (input: AvailabilitySearchInput) => {
    setLastSearch(input)
    setStatus('loading')
    setError(null)
    try {
      const result = await searchAvailableRooms({
        start: input.start,
        end: input.end,
        minSeats: input.minSeats,
        amenities: input.amenities,
      })
      setRooms(result)
      setStatus('success')
    } catch (caught) {
      setRooms([])
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError('unknown_error', 'Die Suche ist fehlgeschlagen. Bitte erneut versuchen.'),
      )
      setStatus('error')
    }
  }, [])

  const handleSearch = (input: AvailabilitySearchInput) => {
    void runSearch(input)
  }

  const handleRetry = () => {
    if (lastSearch) {
      void runSearch(lastSearch)
    }
  }

  return (
    <section className="rs-page">
      <style>{SEARCH_STYLES}</style>
      <header className="rs-header">
        <h1 className="rs-title">Freie Räume</h1>
        <p className="rs-subtitle">
          Finde Räume, die in einem Zeitraum frei sind und deine Ausstattung bieten.
        </p>
      </header>

      <AvailabilityForm onSearch={handleSearch} busy={status === 'loading'} />

      <AvailabilityResults
        status={status}
        rooms={rooms}
        error={error}
        date={lastSearch?.date ?? null}
        onRetry={handleRetry}
      />
    </section>
  )
}
