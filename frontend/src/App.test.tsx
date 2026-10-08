import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  )
}

describe('App shell', () => {
  it('renders the shell with all three navigation entries', () => {
    renderApp()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Räume' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tagesansicht' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Freie Räume' })).toBeInTheDocument()
  })

  it('shows the room list at "/"', () => {
    renderApp(['/'])
    expect(screen.getByRole('heading', { name: 'Raumliste' })).toBeInTheDocument()
  })

  it('reaches the day view directly via /rooms/:id', () => {
    renderApp(['/rooms/42'])
    expect(screen.getByRole('heading', { name: 'Tagesansicht' })).toBeInTheDocument()
  })

  it('navigates between all three screens', async () => {
    const user = userEvent.setup()
    renderApp(['/'])

    await user.click(screen.getByRole('link', { name: 'Tagesansicht' }))
    expect(screen.getByRole('heading', { name: 'Tagesansicht' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Freie Räume' }))
    expect(screen.getByRole('heading', { name: 'Freie Räume' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Räume' }))
    expect(screen.getByRole('heading', { name: 'Raumliste' })).toBeInTheDocument()
  })
})
