import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { SearchPanel } from '../parts/SearchPanel'
import { Profile360 } from '../parts/Profile360'
import { AIInsights } from '../parts/AIInsights'
import { ActionsPanel } from '../parts/ActionsPanel'

export type CustomerBasic = {
  customer_id: number
  name: string
  age: number
}

export type Profile360Data = {
  basic_info: CustomerBasic
  hdbank_summary: {
    total_transactions?: number
    average_balance?: number
    total_credit_last_3m?: number
    total_debit_last_3m?: number
  }
  vietjet_summary: {
    total_flights_last_year?: number
    total_spending?: number
    is_business_flyer?: boolean
    favorite_route?: string
  }
  hdsaison_summary: {
    has_active_loan?: boolean
    total_loan_amount?: number
    most_frequent_product?: string
  }
}

export type Insight = {
  predicted_persona: string
  evidence: { label: string; value: string; ok: boolean }[]
  recommendations: { offer_code: string; title: string; description: string }[]
}

export const Dashboard: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [profile, setProfile] = useState<Profile360Data | null>(null)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    Promise.all([
      axios.get(`/api/customer/${selectedId}`),
      axios.get(`/api/customer/${selectedId}/insights`)
    ])
      .then(([pRes, iRes]) => {
        setProfile(pRes.data)
        setInsight(iRes.data)
      })
      .finally(() => setLoading(false))
  }, [selectedId])

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Search & Suggestions */}
        <div className="space-y-6">
          <SearchPanel onPickCustomer={setSelectedId} />
        </div>

        {/* Column 2: 360 + AI Insights */}
        <div className="space-y-6">
          <Profile360 profile={profile} loading={loading} />
          <AIInsights insight={insight} />
        </div>

        {/* Column 3: Actions & Phone Simulation */}
        <div className="space-y-6">
          <ActionsPanel insight={insight} customerId={selectedId ?? undefined} />
        </div>
      </div>
    </div>
  )
}
