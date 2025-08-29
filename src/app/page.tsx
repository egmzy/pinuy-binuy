'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SearchResult {
  success: boolean
  objectid?: number
  gushnumber?: number
  parcelnumber?: number
  address?: string
  planNumber?: string
  planCheckError?: string
  planUrl?: string
  error?: string
  step?: 'address' | 'planning' | 'complete'
}

export default function Home() {
  const [address, setAddress] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState<'search' | 'address' | 'planning' | 'link' | null>(null)

  const handleCheck = async () => {
    if (!address.trim()) return
    
    setLoading(true)
    setResult(null)
    setLoadingStep('search')
    
    try {
      // Step 1: Get address and gush/helka
      setLoadingStep('address')
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: address.trim(), step: 'address' }),
      })

      const addressData = await response.json()
      
      if (!response.ok) {
        setResult({ success: false, error: addressData.error || 'שגיאה בבדיקת הכתובת' })
        return
      }

      // Show gush/helka immediately
      setResult({ ...addressData, step: 'address' })
      setLoadingStep('planning')

      // Step 2: Search for planning data
      const planningResponse = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address: address.trim(), 
          step: 'planning',
          gushnumber: addressData.gushnumber,
          parcelnumber: addressData.parcelnumber 
        }),
      })

      const planningData = await planningResponse.json()
      
      if (planningData.planNumber) {
        // Update with plan found
        setResult({ ...addressData, ...planningData, step: 'planning' })
        setLoadingStep('link')
        
        // Step 3: Get final URL
        const urlResponse = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            step: 'url',
            planNumber: planningData.planNumber 
          }),
        })

        const urlData = await urlResponse.json()
        setResult({ ...addressData, ...planningData, ...urlData, step: 'complete' })
      } else {
        setResult({ ...addressData, ...planningData, step: 'complete' })
      }

    } catch {
      setResult({ success: false, error: 'שגיאה בחיבור לשרת' })
    } finally {
      setLoading(false)
      setLoadingStep(null)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-auto">
      <Image
        src="/bg.png"
        alt=""
        fill
        className="object-cover opacity-30"
        loading="lazy"
        priority={false}
      />
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 w-full max-w-md relative z-10 my-auto">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">
          חיפוש פינוי בינוי לפי כתובת
        </h1>
        <p className="text-xs text-slate-500 text-center mb-6">
          כלי זה אינו רשמי ונוצר לשימוש אישי בלבד, ייתכנו אי דיוקים במידע.
        </p>
        
        <div className="space-y-6">
          <div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="כתובת מלאה כולל עיר"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder-slate-400 bg-white/80"
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            />
          </div>
          
          <button
            onClick={handleCheck}
            disabled={loading || !address.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
          >
            {loadingStep === 'address' ? 'מחפש גוש וחלקה...' :
             loadingStep === 'planning' ? 'מחפש תוכניות לגוש והחלקה...' :
             loadingStep === 'link' ? 'מכין לינק...' :
             loading ? 'בודק...' : 'בדוק פינוי בינוי בכתובת'}
          </button>
          
          {result && (
            <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
              {result.success ? (
                <div className="text-slate-700">
                  <p className="font-semibold mb-4 text-slate-800">תוצאות בדיקה עבור {address}</p>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg border border-slate-200">
                      <span className="font-medium text-slate-600">גוש:</span>
                      <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded">{result.gushnumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg border border-slate-200">
                      <span className="font-medium text-slate-600">חלקה:</span>
                      <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded">{result.parcelnumber}</span>
                    </div>
                    
                    <div className="mt-3">
                      {result.planNumber ? (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 shadow-sm text-center">
                          <div className="flex items-center justify-center mb-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full ml-2"></div>
                            <p className="text-emerald-800 font-semibold text-lg">נמצאה תוכנית פינוי בינוי!</p>
                          </div>
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 mb-4 border border-emerald-100">
                            <p className="text-emerald-700"><span className="font-medium text-emerald-800">מספר תוכנית:</span></p>
                            <span className="font-mono text-emerald-900 bg-emerald-100 px-3 py-2 rounded-lg text-sm font-semibold mt-1 inline-block">{result.planNumber}</span>
                          </div>
                          {loadingStep === 'link' ? (
                            <div className="flex items-center justify-center text-emerald-700 font-medium">
                              <div className="animate-spin w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full ml-2"></div>
                              מכין קישור לתוכנית...
                            </div>
                          ) : result.planUrl ? (
                            <a 
                              href={result.planUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              צפה בפרטי התוכנית
                            </a>
                          ) : null}
                        </div>
                      ) : loadingStep === 'planning' ? (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 text-center">
                          <div className="flex items-center justify-center text-blue-700 font-medium">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full ml-2"></div>
                            מחפש תוכניות פינוי בינוי...
                          </div>
                        </div>
                      ) : result.planCheckError ? (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-2 h-2 bg-amber-500 rounded-full ml-2"></div>
                            <p className="text-amber-800 font-medium">{result.planCheckError}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-xl p-5 text-center">
                          <div className="flex items-center justify-center text-slate-600 font-medium">
                            <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full ml-2"></div>
                            בודק תוכניות...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                    <p className="text-red-800 font-medium">שגיאה</p>
                  </div>
                  <p className="text-red-700 text-sm">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}