'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { StarRating } from '@/components/reviews/StarRating'
import { rateLawyer } from '@/lib/actions/reviews'

interface LawyerRatingWidgetProps {
  lawyerId:    string
  lawyerName:  string
  ratingAvg:   number
  ratingCount: number
}

export function LawyerRatingWidget({
  lawyerId,
  lawyerName,
  ratingAvg,
  ratingCount,
}: LawyerRatingWidgetProps) {
  const router                          = useRouter()
  const [open,     setOpen]             = useState(false)
  const [selected, setSelected]         = useState(0)
  const [body,     setBody]             = useState('')
  const [pending,  startTransition]     = useTransition()
  const [feedback, setFeedback]         = useState<{
    type: 'success' | 'error' | 'auth'
    message: string
  } | null>(null)

  const displayValue = Math.round(ratingAvg)

  function handleOpen() {
    setOpen(o => !o)
    setFeedback(null)
  }

  function handleSubmit() {
    if (selected < 1) return
    setFeedback(null)

    startTransition(async () => {
      const result = await rateLawyer(lawyerId, selected, body)

      if (result.error === 'Not authenticated.') {
        setFeedback({ type: 'auth', message: 'Sign in to rate this lawyer.' })
        return
      }
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
        return
      }

      setFeedback({ type: 'success', message: 'Rating submitted — thank you!' })
      setOpen(false)
      setSelected(0)
      setBody('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">

      {/* ── Display row: read-only stars + count + Rate toggle ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <StarRating value={displayValue} readOnly size="sm" />
        <span className="text-[12px] text-gray-500">
          {ratingAvg > 0
            ? <><span className="font-medium text-gray-700">{ratingAvg.toFixed(1)}</span></>
            : 'No rating yet'}
          {ratingCount > 0 && (
            <span className="text-gray-400">
              {' '}({ratingCount} review{ratingCount !== 1 ? 's' : ''})
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={handleOpen}
          className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-[#B71C1C] hover:underline bg-transparent border-none cursor-pointer p-0 leading-none"
        >
          Rate
          {open
            ? <ChevronUp   className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          }
        </button>
      </div>

      {/* ── Success/auth feedback shown when form is closed ── */}
      {feedback && !open && (
        <div className={`flex items-center gap-1 text-[11px] ${
          feedback.type === 'success'
            ? 'text-emerald-600'
            : feedback.type === 'auth'
              ? 'text-[#B71C1C]'
              : 'text-red-600'
        }`}>
          {feedback.type === 'success' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
          <span>{feedback.message}</span>
          {feedback.type === 'auth' && (
            <Link href="/login" className="underline font-semibold ml-0.5">
              Sign in →
            </Link>
          )}
        </div>
      )}

      {/* ── Inline rating form ── */}
      {open && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2.5">
          <p className="text-[11px] font-semibold text-gray-700 leading-tight">
            Rate {lawyerName}
          </p>

          <StarRating value={selected} onChange={setSelected} size="md" />

          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share your experience (optional)"
            maxLength={500}
            rows={2}
            disabled={pending}
            className="w-full text-[12px] border border-gray-200 rounded-md px-2.5 py-2 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-[#B71C1C]/40 placeholder:text-gray-400 disabled:opacity-60"
          />

          {/* Inline feedback */}
          {feedback && (
            <div className={`flex items-center gap-1 text-[11px] ${
              feedback.type === 'success'
                ? 'text-emerald-600'
                : feedback.type === 'auth'
                  ? 'text-[#B71C1C]'
                  : 'text-red-600'
            }`}>
              {feedback.type === 'success' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
              <span>{feedback.message}</span>
              {feedback.type === 'auth' && (
                <Link href="/login" className="underline font-semibold ml-0.5">
                  Sign in →
                </Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || selected < 1}
              className="rounded-md bg-[#B71C1C] hover:bg-[#9b1515] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold px-3 py-1.5 transition-colors"
            >
              {pending ? 'Saving…' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setFeedback(null) }}
              className="text-[11px] text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer p-0 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
