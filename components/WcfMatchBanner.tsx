'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface WcfPlayer {
  id: string
  wcf_first_name: string
  wcf_last_name: string
  country: string
  dgrade: number
  world_ranking: number
  wcf_profile_url: string
}

interface Props {
  userId: string
  firstName: string
  lastName: string
  onLinked: () => void
}

export default function WcfMatchBanner({ userId, firstName, lastName, onLinked }: Props) {
  const [matches, setMatches] = useState<WcfPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [searchFirst, setSearchFirst] = useState('')
  const [searchLast, setSearchLast] = useState('')
  const [searchResults, setSearchResults] = useState<WcfPlayer[]>([])
  const [searching, setSearching] = useState(false)
  const [linked, setLinked] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!firstName || !lastName) {
      setLoading(false)
      return
    }
    findMatches(firstName, lastName)
  }, [firstName, lastName])

  const findMatches = async (first: string, last: string) => {
    setLoading(true)
    const firstLetter = first.charAt(0).toLowerCase()
    const { data } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, wcf_profile_url')
      .ilike('wcf_last_name', last)
      .order('world_ranking', { ascending: true })

    if (data) {
      const filtered = data.filter(p =>
        p.wcf_first_name.charAt(0).toLowerCase() === firstLetter
      )
      setMatches(filtered)
      if (filtered.length === 0) setShowSearch(true)
    }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!searchLast) return
    setSearching(true)
    const { data } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, wcf_profile_url')
      .ilike('wcf_last_name', `%${searchLast}%`)
      .order('world_ranking', { ascending: true })
      .limit(20)

    if (data) {
      const filtered = searchFirst
        ? data.filter(p => p.wcf_first_name.charAt(0).toLowerCase() === searchFirst.charAt(0).toLowerCase())
        : data
      setSearchResults(filtered)
    }
    setSearching(false)
  }

  const handleLink = async (player: WcfPlayer) => {
    await supabase
      .from('profiles')
      .update({
        wcf_player_id: player.id,
        dgrade: player.dgrade,
        wcf_profile_url: player.wcf_profile_url,
      })
      .eq('id', userId)

    await supabase
      .from('wcf_players')
      .update({ linked_user_id: userId })
      .eq('id', player.id)

    setLinked(true)
    onLinked()
  }

  const handleNotMe = () => {
    setMatches([])
    setSearchResults([])
    setShowSearch(true)
  }

  if (loading || dismissed || linked) return null
  if (!firstName || !lastName) return null

  const playersToShow = searchResults.length > 0 ? searchResults : matches

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-blue-800">Are you on the WCF rankings?</h3>
          <p className="text-sm text-blue-600">Link your account to your WCF record to auto-update your dGrade.</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-400 hover:text-blue-600 text-lg leading-none ml-4"
        >
          ×
        </button>
      </div>

      {!showSearch && playersToShow.length > 0 && (
        <div className="space-y-2 mb-3">
          {playersToShow.map(player => (
            <div key={player.id} className="bg-white rounded-md p-3 flex items-center justify-between border border-blue-100">
              <div>
                <p className="font-medium text-gray-800">{player.wcf_first_name} {player.wcf_last_name}</p>
                <p className="text-sm text-gray-500">{player.country} · dGrade {player.dgrade} · World #{player.world_ranking}</p>
              </div>
              <button
                onClick={() => handleLink(player)}
                className="bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 transition"
              >
                That's me
              </button>
            </div>
          ))}
          <button
            onClick={handleNotMe}
            className="text-sm text-blue-500 hover:underline"
          >
            None of these are me — search manually
          </button>
        </div>
      )}

      {(showSearch || playersToShow.length === 0) && (
        <div className="space-y-2">
          <p className="text-sm text-blue-700 mb-2">Search for your name on the WCF rankings:</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="First name"
              value={searchFirst}
              onChange={(e) => setSearchFirst(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-900 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Last name"
              value={searchLast}
              onChange={(e) => setSearchLast(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-900 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 mt-3">
              {searchResults.map(player => (
                <div key={player.id} className="bg-white rounded-md p-3 flex items-center justify-between border border-blue-100">
                  <div>
                    <p className="font-medium text-gray-800">{player.wcf_first_name} {player.wcf_last_name}</p>
                    <p className="text-sm text-gray-500">{player.country} · dGrade {player.dgrade} · World #{player.world_ranking}</p>
                  </div>
                  <button
                    onClick={() => handleLink(player)}
                    className="bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 transition"
                  >
                    That's me
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searching === false && searchLast && (
            <p className="text-sm text-gray-500 mt-2">No players found — check the spelling or try a partial last name.</p>
          )}
        </div>
      )}
    </div>
  )
}