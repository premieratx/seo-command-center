import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { packageDetails14, packageDetails25, packageDetails50 } from "@/quote-app/lib/packageDetails";

const OnePager = () => {
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "linear-gradient(to bottom, #F4C430, #fef3c7)" }}>
      <div className="container mx-auto max-w-[1400px]">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-black mb-3 text-[#1e3a8a]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
            Complete Pricing Guide
          </h1>
          <p className="text-xl font-bold text-gray-800">All Options, All Details, One Page</p>
        </div>

        <div className="space-y-12">
          {/* PRIVATE CRUISE PRICING CHART */}
          <Card className="rounded-3xl overflow-hidden shadow-2xl border-8 border-[#1e3a8a]">
            <CardHeader className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white py-8">
              <CardTitle className="text-4xl md:text-5xl font-black text-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                🚤 PRIVATE CRUISE PRICING
              </CardTitle>
              <p className="text-center text-xl font-bold mt-3 opacity-95">
                Your Boat, Your Party, Your Way
              </p>
            </CardHeader>
            <CardContent className="p-8 bg-gradient-to-br from-white to-blue-50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 14-Person Capacity */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F4C430] to-[#fbbf24] py-6">
                    <h3 className="text-3xl font-black text-center text-gray-900">
                      1-14 GUESTS
                    </h3>
                    <p className="text-center font-bold text-gray-800 mt-1">Day Tripper</p>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {/* Base Rates */}
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-5 border-3 border-blue-300">
                      <h4 className="font-black text-xl mb-4 text-[#1e3a8a] text-center">BASE RATES (4 HOURS)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Mon-Thu:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$200/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Friday:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$225/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-amber-300">
                          <span className="font-bold text-gray-800">Saturday:</span>
                          <span className="font-black text-xl text-amber-600">$350/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Sunday:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$250/hr</span>
                        </div>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-3 border-[#F4C430]">
                      <h4 className="font-black text-xl mb-4 text-amber-800 text-center">PACKAGE OPTIONS</h4>
                      
                      <div className="space-y-4">
                        {/* Essentials Package */}
                        <div className="bg-white rounded-xl p-4 border-2 border-amber-300">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-black text-lg text-gray-900">Essentials</h5>
                            <span className="font-black text-2xl text-[#F4C430]">+${packageDetails14.essentials.price}</span>
                          </div>
                          <ul className="space-y-2 text-sm font-semibold text-gray-700">
                            {packageDetails14.essentials.items.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-[#F4C430] mr-2 font-black text-lg">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Ultimate Package */}
                        <div className="bg-white rounded-xl p-4 border-2 border-amber-400">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-black text-lg text-gray-900">Ultimate Disco</h5>
                            <span className="font-black text-2xl text-amber-600">+${packageDetails14.ultimate.price}</span>
                          </div>
                          <ul className="space-y-2 text-sm font-semibold text-gray-700">
                            {packageDetails14.ultimate.items.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-amber-600 mr-2 font-black text-lg">★</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Add-Ons */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-3 border-purple-300">
                      <h4 className="font-black text-xl mb-4 text-purple-800 text-center">PREMIUM ADD-ONS</h4>
                      <div className="space-y-2 text-sm font-bold">
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🎵 DJ Service (4hrs)</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>📸 Photographer (4hrs)</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🍹 Bartender</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🎤 A/V Setup w/Wireless Mic & Projector Screen</span>
                          <span className="font-black text-purple-700">$300</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🏊 Lily Pad Float (each)</span>
                          <span className="font-black text-purple-700">$50</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 25-Person Capacity */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F4C430] to-[#fbbf24] py-6">
                    <h3 className="text-3xl font-black text-center text-gray-900">
                      15-30 GUESTS
                    </h3>
                    <p className="text-center font-bold text-gray-800 mt-1">Meeseeks / The Irony</p>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {/* Base Rates */}
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-5 border-3 border-blue-300">
                      <h4 className="font-black text-xl mb-4 text-[#1e3a8a] text-center">BASE RATES (4 HOURS)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Mon-Thu:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$250/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Friday:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$250/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-amber-300">
                          <span className="font-bold text-gray-800">Saturday:</span>
                          <span className="font-black text-xl text-amber-600">$375/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Sunday:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$250/hr</span>
                        </div>
                        <div className="mt-3 p-3 bg-amber-50 rounded-xl border-2 border-amber-300">
                          <p className="text-sm font-bold text-gray-800 text-center">
                            +$50/hr crew fee for 26-30 guests
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-3 border-[#F4C430]">
                      <h4 className="font-black text-xl mb-4 text-amber-800 text-center">PACKAGE OPTIONS</h4>
                      
                      <div className="space-y-4">
                        {/* Essentials Package */}
                        <div className="bg-white rounded-xl p-4 border-2 border-amber-300">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-black text-lg text-gray-900">Essentials</h5>
                            <span className="font-black text-2xl text-[#F4C430]">+${packageDetails25.essentials.price}</span>
                          </div>
                          <ul className="space-y-2 text-sm font-semibold text-gray-700">
                            {packageDetails25.essentials.items.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-[#F4C430] mr-2 font-black text-lg">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Ultimate Package */}
                        <div className="bg-white rounded-xl p-4 border-2 border-amber-400">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-black text-lg text-gray-900">Ultimate Disco</h5>
                            <span className="font-black text-2xl text-amber-600">+${packageDetails25.ultimate.price}</span>
                          </div>
                          <ul className="space-y-2 text-sm font-semibold text-gray-700">
                            {packageDetails25.ultimate.items.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-amber-600 mr-2 font-black text-lg">★</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Add-Ons */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-3 border-purple-300">
                      <h4 className="font-black text-xl mb-4 text-purple-800 text-center">PREMIUM ADD-ONS</h4>
                      <div className="space-y-2 text-sm font-bold">
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🎵 DJ Service (4hrs)</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>📸 Photographer (4hrs)</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🍹 Bartender</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🎤 A/V Setup w/Wireless Mic & Projector Screen</span>
                          <span className="font-black text-purple-700">$300</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🏊 Lily Pad Float (each)</span>
                          <span className="font-black text-purple-700">$50</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 50-Person Capacity */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F4C430] to-[#fbbf24] py-6">
                    <h3 className="text-3xl font-black text-center text-gray-900">
                      31-75 GUESTS
                    </h3>
                    <p className="text-center font-bold text-gray-800 mt-1">Clever Girl</p>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {/* Base Rates */}
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-5 border-3 border-blue-300">
                      <h4 className="font-black text-xl mb-4 text-[#1e3a8a] text-center">BASE RATES (4 HOURS)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Mon-Thu:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$300/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Friday:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$300/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-amber-300">
                          <span className="font-bold text-gray-800">Saturday:</span>
                          <span className="font-black text-xl text-amber-600">$400/hr</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="font-bold text-gray-800">Sunday:</span>
                          <span className="font-black text-xl text-[#3b82f6]">$300/hr</span>
                        </div>
                        <div className="mt-3 p-3 bg-amber-50 rounded-xl border-2 border-amber-300">
                          <p className="text-sm font-bold text-gray-800 text-center">
                            +$100/hr crew fee for 51-75 guests
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-3 border-[#F4C430]">
                      <h4 className="font-black text-xl mb-4 text-amber-800 text-center">PACKAGE OPTIONS</h4>
                      
                      <div className="space-y-4">
                        {/* Essentials Package */}
                        <div className="bg-white rounded-xl p-4 border-2 border-amber-300">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-black text-lg text-gray-900">Essentials</h5>
                            <span className="font-black text-2xl text-[#F4C430]">+${packageDetails50.essentials.price}</span>
                          </div>
                          <ul className="space-y-2 text-sm font-semibold text-gray-700">
                            {packageDetails50.essentials.items.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-[#F4C430] mr-2 font-black text-lg">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Ultimate Package */}
                        <div className="bg-white rounded-xl p-4 border-2 border-amber-400">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-black text-lg text-gray-900">Ultimate Disco</h5>
                            <span className="font-black text-2xl text-amber-600">+${packageDetails50.ultimate.price}</span>
                          </div>
                          <ul className="space-y-2 text-sm font-semibold text-gray-700">
                            {packageDetails50.ultimate.items.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-amber-600 mr-2 font-black text-lg">★</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Add-Ons */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-3 border-purple-300">
                      <h4 className="font-black text-xl mb-4 text-purple-800 text-center">PREMIUM ADD-ONS</h4>
                      <div className="space-y-2 text-sm font-bold">
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🎵 DJ Service (4hrs)</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>📸 Photographer (4hrs)</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🍹 Bartender</span>
                          <span className="font-black text-purple-700">$600</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🎤 A/V Setup w/Wireless Mic & Projector Screen</span>
                          <span className="font-black text-purple-700">$300</span>
                        </div>
                        <div className="flex justify-between bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span>🏊 Lily Pad Float (each)</span>
                          <span className="font-black text-purple-700">$50</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="mt-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl p-6 border-4 border-[#1e3a8a]">
                <h4 className="font-black text-2xl mb-4 text-[#1e3a8a] text-center">📋 IMPORTANT PRICING NOTES</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm font-bold text-gray-800">
                  <div className="bg-white rounded-2xl p-4 border-2 border-blue-300">
                    <p>• All prices exclude 11.25% taxes & fees</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border-2 border-blue-300">
                    <p>• 20% gratuity added to base rate only</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border-2 border-blue-300">
                    <p>• 4-hour minimum booking required</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border-2 border-blue-300">
                    <p>• Additional hours at hourly rate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DISCO CRUISE PRICING CHART */}
          <Card className="rounded-3xl overflow-hidden shadow-2xl border-8 border-[#F4C430]">
            <CardHeader className="bg-gradient-to-r from-[#F4C430] via-[#fbbf24] to-[#f59e0b] text-gray-900 py-8">
              <CardTitle className="text-4xl md:text-5xl font-black text-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                ✨ ATX DISCO CRUISE PRICING
              </CardTitle>
              <p className="text-center text-xl font-bold mt-3">
                March 1 - October 31 | Fridays & Saturdays Only
              </p>
            </CardHeader>
            <CardContent className="p-8 bg-gradient-to-br from-white to-amber-50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Basic Bach Package */}
                <div className="bg-white rounded-3xl border-4 border-blue-400 shadow-xl overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 py-6">
                    <div className="text-center">
                      <h3 className="text-3xl font-black text-white mb-2">BASIC BACH</h3>
                      <div className="bg-white rounded-full px-6 py-3 inline-block">
                        <span className="text-4xl font-black text-blue-600">$85</span>
                        <span className="text-lg font-bold text-gray-700">/person</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-5 border-3 border-blue-200">
                      <h4 className="font-black text-xl mb-4 text-blue-700 text-center">WHAT'S INCLUDED</h4>
                      <ul className="space-y-3 text-sm font-bold text-gray-800">
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="text-blue-500 mr-3 font-black text-2xl">🎟️</span>
                          <span>General admission ticket</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="text-blue-500 mr-3 font-black text-2xl">🎵</span>
                          <span>DJ & premium sound system</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="text-blue-500 mr-3 font-black text-2xl">💡</span>
                          <span>LED dance floor lighting</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="text-blue-500 mr-3 font-black text-2xl">🏊</span>
                          <span>Swimming & floating time</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="text-blue-500 mr-3 font-black text-2xl">🧊</span>
                          <span>Ice & cooler access</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-blue-200">
                          <span className="text-blue-500 mr-3 font-black text-2xl">🥤</span>
                          <span>BYOB (21+ guests)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Disco Queen Package */}
                <div className="bg-white rounded-3xl border-4 border-purple-400 shadow-xl overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 py-6">
                    <div className="text-center">
                      <h3 className="text-3xl font-black text-white mb-2">DISCO QUEEN 👑</h3>
                      <div className="bg-white rounded-full px-6 py-3 inline-block">
                        <span className="text-4xl font-black text-purple-600">$95</span>
                        <span className="text-lg font-bold text-gray-700">/person</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-5 border-3 border-purple-200">
                      <h4 className="font-black text-xl mb-4 text-purple-700 text-center">EVERYTHING IN BASIC +</h4>
                      <ul className="space-y-3 text-sm font-bold text-gray-800">
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span className="text-purple-500 mr-3 font-black text-2xl">🪩</span>
                          <span>Disco ball cup keepsake</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span className="text-purple-500 mr-3 font-black text-2xl">🥂</span>
                          <span>Champagne toast for group</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span className="text-purple-500 mr-3 font-black text-2xl">🫧</span>
                          <span>Bubble party supplies</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span className="text-purple-500 mr-3 font-black text-2xl">🦄</span>
                          <span>Premium float for bride</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span className="text-purple-500 mr-3 font-black text-2xl">☀️</span>
                          <span>SPF-50 sunscreen bottles</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-purple-200">
                          <span className="text-purple-500 mr-3 font-black text-2xl">🍽️</span>
                          <span>Plates, cups & utensils</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Super Sparkle Platinum */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-xl overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="bg-gradient-to-r from-[#F4C430] via-[#fbbf24] to-[#f59e0b] py-6">
                    <div className="text-center">
                      <h3 className="text-3xl font-black text-gray-900 mb-2">SUPER SPARKLE ⭐</h3>
                      <div className="bg-white rounded-full px-6 py-3 inline-block">
                        <span className="text-4xl font-black text-amber-600">$105</span>
                        <span className="text-lg font-bold text-gray-700">/person</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-5 border-3 border-amber-200">
                      <h4 className="font-black text-xl mb-4 text-amber-700 text-center">EVERYTHING IN QUEEN +</h4>
                      <ul className="space-y-3 text-sm font-bold text-gray-800">
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-amber-200">
                          <span className="text-amber-500 mr-3 font-black text-2xl">👑</span>
                          <span>VIP bride crown & sash</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-amber-200">
                          <span className="text-amber-500 mr-3 font-black text-2xl">📸</span>
                          <span>Professional photo session</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-amber-200">
                          <span className="text-amber-500 mr-3 font-black text-2xl">🎈</span>
                          <span>Custom party decorations</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-amber-200">
                          <span className="text-amber-500 mr-3 font-black text-2xl">🪩</span>
                          <span>Extra disco balls installed</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-amber-200">
                          <span className="text-amber-500 mr-3 font-black text-2xl">🎁</span>
                          <span>Party favor bags for all</span>
                        </li>
                        <li className="flex items-start bg-white rounded-xl p-3 border-2 border-amber-200">
                          <span className="text-amber-500 mr-3 font-black text-2xl">🏖️</span>
                          <span>Giant lily pad upgrade</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disco Schedule */}
              <div className="mt-8 bg-gradient-to-r from-purple-100 via-pink-100 to-amber-100 rounded-3xl p-6 border-4 border-[#F4C430]">
                <h4 className="font-black text-2xl mb-4 text-gray-900 text-center">🗓️ DISCO CRUISE SCHEDULE</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border-3 border-purple-300">
                    <h5 className="font-black text-xl text-purple-700 mb-3 text-center">FRIDAY</h5>
                    <div className="text-center">
                      <p className="text-2xl font-black text-gray-900">12:00 PM - 4:00 PM</p>
                      <p className="text-sm font-bold text-gray-600 mt-2">(4-hour cruise)</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border-3 border-pink-300">
                    <h5 className="font-black text-xl text-pink-700 mb-3 text-center">SATURDAY</h5>
                    <div className="space-y-3">
                      <div className="bg-pink-50 rounded-xl p-3 border-2 border-pink-200">
                        <p className="text-xl font-black text-gray-900 text-center">11:00 AM - 3:00 PM</p>
                      </div>
                      <div className="bg-pink-50 rounded-xl p-3 border-2 border-pink-200">
                        <p className="text-xl font-black text-gray-900 text-center">3:30 PM - 7:30 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disco Notes */}
              <div className="mt-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl p-6 border-4 border-[#1e3a8a]">
                <h4 className="font-black text-2xl mb-4 text-[#1e3a8a] text-center">⚡ DISCO CRUISE DETAILS</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm font-bold text-gray-800">
                  <div className="bg-white rounded-2xl p-4 border-2 border-blue-300">
                    <p>• Capacity: 100 guests maximum</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border-2 border-purple-300">
                    <p>• Season: March 1 - October 31</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border-2 border-blue-300">
                    <p>• Days: Fridays & Saturdays only</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border-2 border-purple-300">
                    <p>• Price per ticket includes tax</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FULL-WIDTH VERTICAL LAYOUT - PRIVATE CRUISES */}
          <Card className="rounded-3xl overflow-hidden shadow-2xl border-8 border-[#1e3a8a] mt-12">
            <CardHeader className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white py-10">
              <CardTitle className="text-5xl md:text-6xl font-black text-center" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}>
                🚤 PRIVATE CRUISE PACKAGES
              </CardTitle>
              <p className="text-center text-2xl font-bold mt-4 opacity-95">
                Complete Details for All Capacity Options
              </p>
            </CardHeader>
            <CardContent className="p-10 bg-gradient-to-br from-white to-blue-50">
              <div className="space-y-8">
                
                {/* 1-14 Guests - Day Tripper */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F4C430] to-[#fbbf24] py-8 px-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-4xl md:text-5xl font-black text-gray-900">1-14 GUESTS</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-2">Day Tripper</p>
                      </div>
                      <div className="text-center bg-white rounded-2xl px-8 py-4 border-4 border-gray-900">
                        <p className="text-sm font-black text-gray-600">FROM</p>
                        <p className="text-5xl font-black text-[#3b82f6]">$200<span className="text-2xl">/hr</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10">
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                      {/* Base Rates */}
                      <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-3xl p-8 border-4 border-blue-300">
                        <h4 className="font-black text-3xl mb-6 text-[#1e3a8a] text-center">HOURLY RATES</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Monday - Thursday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$200/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Friday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$225/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-gradient-to-r from-amber-100 to-amber-50 rounded-2xl p-5 border-3 border-amber-400">
                            <span className="font-bold text-xl text-gray-800">Saturday:</span>
                            <span className="font-black text-3xl text-amber-600">$350/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Sunday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$225/hr</span>
                          </div>
                        </div>
                      </div>

                      {/* Add-Ons */}
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border-4 border-purple-300">
                        <h4 className="font-black text-3xl mb-6 text-purple-800 text-center">PREMIUM ADD-ONS</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🎵 Professional DJ (4hrs)</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">📸 Photographer (4hrs)</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🍹 Bartender Service</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🎤 A/V Setup w/Wireless Mic & Projector Screen</span>
                            <span className="font-black text-2xl text-purple-700">$300</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🏊 Lily Pad Float (each)</span>
                            <span className="font-black text-2xl text-purple-700">$50</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Essentials */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-4 border-[#F4C430]">
                        <div className="flex justify-between items-center mb-6">
                          <h5 className="font-black text-3xl text-gray-900">Essentials Package</h5>
                          <span className="font-black text-4xl text-[#F4C430]">+${packageDetails14.essentials.price}</span>
                        </div>
                        <ul className="space-y-3">
                          {packageDetails14.essentials.items.map((item, idx) => (
                            <li key={idx} className="flex items-start bg-white rounded-2xl p-4 border-3 border-amber-300">
                              <span className="text-[#F4C430] mr-3 font-black text-2xl">✓</span>
                              <span className="font-bold text-lg text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Ultimate */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-4 border-amber-400">
                        <div className="flex justify-between items-center mb-6">
                          <h5 className="font-black text-3xl text-gray-900">Ultimate Disco Package</h5>
                          <span className="font-black text-4xl text-amber-600">+${packageDetails14.ultimate.price}</span>
                        </div>
                        <ul className="space-y-3">
                          {packageDetails14.ultimate.items.map((item, idx) => (
                            <li key={idx} className="flex items-start bg-white rounded-2xl p-4 border-3 border-amber-400">
                              <span className="text-amber-600 mr-3 font-black text-2xl">★</span>
                              <span className="font-bold text-lg text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 15-30 Guests - Meeseeks/Irony */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F4C430] to-[#fbbf24] py-8 px-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-4xl md:text-5xl font-black text-gray-900">15-30 GUESTS</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-2">Meeseeks / The Irony</p>
                      </div>
                      <div className="text-center bg-white rounded-2xl px-8 py-4 border-4 border-gray-900">
                        <p className="text-sm font-black text-gray-600">FROM</p>
                        <p className="text-5xl font-black text-[#3b82f6]">$250<span className="text-2xl">/hr</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10">
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                      {/* Base Rates */}
                      <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-3xl p-8 border-4 border-blue-300">
                        <h4 className="font-black text-3xl mb-6 text-[#1e3a8a] text-center">HOURLY RATES</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Monday - Thursday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$250/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Friday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$250/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-gradient-to-r from-amber-100 to-amber-50 rounded-2xl p-5 border-3 border-amber-400">
                            <span className="font-bold text-xl text-gray-800">Saturday:</span>
                            <span className="font-black text-3xl text-amber-600">$375/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Sunday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$250/hr</span>
                          </div>
                          <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-5 border-3 border-amber-400">
                            <p className="font-black text-lg text-gray-800 text-center">
                              +$50/hr extra crew fee for 26-30 guests
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Add-Ons */}
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border-4 border-purple-300">
                        <h4 className="font-black text-3xl mb-6 text-purple-800 text-center">PREMIUM ADD-ONS</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🎵 Professional DJ (4hrs)</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">📸 Photographer (4hrs)</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🍹 Bartender Service</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🎤 A/V Setup w/Wireless Mic & Projector Screen</span>
                            <span className="font-black text-2xl text-purple-700">$300</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🏊 Lily Pad Float (each)</span>
                            <span className="font-black text-2xl text-purple-700">$50</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Essentials */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-4 border-[#F4C430]">
                        <div className="flex justify-between items-center mb-6">
                          <h5 className="font-black text-3xl text-gray-900">Essentials Package</h5>
                          <span className="font-black text-4xl text-[#F4C430]">+${packageDetails25.essentials.price}</span>
                        </div>
                        <ul className="space-y-3">
                          {packageDetails25.essentials.items.map((item, idx) => (
                            <li key={idx} className="flex items-start bg-white rounded-2xl p-4 border-3 border-amber-300">
                              <span className="text-[#F4C430] mr-3 font-black text-2xl">✓</span>
                              <span className="font-bold text-lg text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Ultimate */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-4 border-amber-400">
                        <div className="flex justify-between items-center mb-6">
                          <h5 className="font-black text-3xl text-gray-900">Ultimate Disco Package</h5>
                          <span className="font-black text-4xl text-amber-600">+${packageDetails25.ultimate.price}</span>
                        </div>
                        <ul className="space-y-3">
                          {packageDetails25.ultimate.items.map((item, idx) => (
                            <li key={idx} className="flex items-start bg-white rounded-2xl p-4 border-3 border-amber-400">
                              <span className="text-amber-600 mr-3 font-black text-2xl">★</span>
                              <span className="font-bold text-lg text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 31-75 Guests - Clever Girl */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F4C430] to-[#fbbf24] py-8 px-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-4xl md:text-5xl font-black text-gray-900">31-75 GUESTS</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-2">Clever Girl</p>
                      </div>
                      <div className="text-center bg-white rounded-2xl px-8 py-4 border-4 border-gray-900">
                        <p className="text-sm font-black text-gray-600">FROM</p>
                        <p className="text-5xl font-black text-[#3b82f6]">$300<span className="text-2xl">/hr</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10">
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                      {/* Base Rates */}
                      <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-3xl p-8 border-4 border-blue-300">
                        <h4 className="font-black text-3xl mb-6 text-[#1e3a8a] text-center">HOURLY RATES</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Monday - Thursday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$300/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Friday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$300/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-gradient-to-r from-amber-100 to-amber-50 rounded-2xl p-5 border-3 border-amber-400">
                            <span className="font-bold text-xl text-gray-800">Saturday:</span>
                            <span className="font-black text-3xl text-amber-600">$400/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-5 border-3 border-blue-200">
                            <span className="font-bold text-xl text-gray-800">Sunday:</span>
                            <span className="font-black text-3xl text-[#3b82f6]">$300/hr</span>
                          </div>
                          <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-5 border-3 border-amber-400">
                            <p className="font-black text-lg text-gray-800 text-center">
                              +$100/hr extra crew fee for 51-75 guests
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Add-Ons */}
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border-4 border-purple-300">
                        <h4 className="font-black text-3xl mb-6 text-purple-800 text-center">PREMIUM ADD-ONS</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🎵 Professional DJ (4hrs)</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">📸 Photographer (4hrs)</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🍹 Bartender Service</span>
                            <span className="font-black text-2xl text-purple-700">$600</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🎤 A/V Setup w/Wireless Mic & Projector Screen</span>
                            <span className="font-black text-2xl text-purple-700">$300</span>
                          </div>
                          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border-3 border-purple-200">
                            <span className="font-bold text-lg">🏊 Lily Pad Float (each)</span>
                            <span className="font-black text-2xl text-purple-700">$50</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Essentials */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-4 border-[#F4C430]">
                        <div className="flex justify-between items-center mb-6">
                          <h5 className="font-black text-3xl text-gray-900">Essentials Package</h5>
                          <span className="font-black text-4xl text-[#F4C430]">+${packageDetails50.essentials.price}</span>
                        </div>
                        <ul className="space-y-3">
                          {packageDetails50.essentials.items.map((item, idx) => (
                            <li key={idx} className="flex items-start bg-white rounded-2xl p-4 border-3 border-amber-300">
                              <span className="text-[#F4C430] mr-3 font-black text-2xl">✓</span>
                              <span className="font-bold text-lg text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Ultimate */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-4 border-amber-400">
                        <div className="flex justify-between items-center mb-6">
                          <h5 className="font-black text-3xl text-gray-900">Ultimate Disco Package</h5>
                          <span className="font-black text-4xl text-amber-600">+${packageDetails50.ultimate.price}</span>
                        </div>
                        <ul className="space-y-3">
                          {packageDetails50.ultimate.items.map((item, idx) => (
                            <li key={idx} className="flex items-start bg-white rounded-2xl p-4 border-3 border-amber-400">
                              <span className="text-amber-600 mr-3 font-black text-2xl">★</span>
                              <span className="font-bold text-lg text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl p-8 border-4 border-[#1e3a8a]">
                <h4 className="font-black text-3xl mb-6 text-[#1e3a8a] text-center">📋 BOOKING INFORMATION</h4>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl p-5 border-3 border-blue-300">
                    <p className="font-bold text-lg text-gray-800">• All prices exclude 11.25% taxes & fees</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border-3 border-blue-300">
                    <p className="font-bold text-lg text-gray-800">• 20% gratuity added to base rate only</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border-3 border-blue-300">
                    <p className="font-bold text-lg text-gray-800">• 4-hour minimum booking required</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border-3 border-blue-300">
                    <p className="font-bold text-lg text-gray-800">• Add-ons not available for bachelor/bachelorette parties</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FULL-WIDTH VERTICAL LAYOUT - DISCO CRUISES */}
          <Card className="rounded-3xl overflow-hidden shadow-2xl border-8 border-[#F4C430] mt-12">
            <CardHeader className="bg-gradient-to-r from-[#F4C430] via-[#fbbf24] to-[#f59e0b] text-gray-900 py-10">
              <CardTitle className="text-5xl md:text-6xl font-black text-center" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.2)' }}>
                ✨ ATX DISCO CRUISE PACKAGES
              </CardTitle>
              <p className="text-center text-2xl font-bold mt-4">
                March 1 - October 31 | Fridays & Saturdays Only
              </p>
            </CardHeader>
            <CardContent className="p-10 bg-gradient-to-br from-white to-amber-50">
              <div className="space-y-8">
                
                {/* Basic Bach */}
                <div className="bg-white rounded-3xl border-4 border-blue-400 shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 py-8 px-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-4xl md:text-5xl font-black text-white">BASIC BACH</h3>
                        <p className="text-2xl font-bold text-blue-100 mt-2">Perfect for First-Time Party Cruisers</p>
                      </div>
                      <div className="text-center bg-white rounded-2xl px-8 py-4 border-4 border-gray-900">
                        <p className="text-sm font-black text-gray-600">PER PERSON</p>
                        <p className="text-5xl font-black text-blue-600">$85</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10">
                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 border-4 border-blue-200">
                      <h4 className="font-black text-3xl mb-6 text-blue-700 text-center">WHAT'S INCLUDED</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-blue-200">
                          <span className="text-blue-500 mr-4 font-black text-3xl">🎟️</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">General Admission</p>
                            <p className="font-bold text-gray-600 mt-1">Access to entire boat</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-blue-200">
                          <span className="text-blue-500 mr-4 font-black text-3xl">🎵</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">DJ & Sound System</p>
                            <p className="font-bold text-gray-600 mt-1">Professional music all cruise</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-blue-200">
                          <span className="text-blue-500 mr-4 font-black text-3xl">💡</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">LED Lighting</p>
                            <p className="font-bold text-gray-600 mt-1">Dance floor light show</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-blue-200">
                          <span className="text-blue-500 mr-4 font-black text-3xl">🏊</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Swimming Time</p>
                            <p className="font-bold text-gray-600 mt-1">Float & swim stops</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-blue-200">
                          <span className="text-blue-500 mr-4 font-black text-3xl">🧊</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Ice & Coolers</p>
                            <p className="font-bold text-gray-600 mt-1">Shared cooler access</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-blue-200">
                          <span className="text-blue-500 mr-4 font-black text-3xl">🥤</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">BYOB Welcome</p>
                            <p className="font-bold text-gray-600 mt-1">21+ guests only</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disco Queen */}
                <div className="bg-white rounded-3xl border-4 border-purple-400 shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 py-8 px-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-4xl md:text-5xl font-black text-white">DISCO QUEEN 👑</h3>
                        <p className="text-2xl font-bold text-purple-100 mt-2">Most Popular Package - Best Value!</p>
                      </div>
                      <div className="text-center bg-white rounded-2xl px-8 py-4 border-4 border-gray-900">
                        <p className="text-sm font-black text-gray-600">PER PERSON</p>
                        <p className="text-5xl font-black text-purple-600">$95</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10">
                    <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 border-4 border-purple-200">
                      <h4 className="font-black text-3xl mb-6 text-purple-700 text-center">EVERYTHING IN BASIC +</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-purple-200">
                          <span className="text-purple-500 mr-4 font-black text-3xl">🪩</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Disco Ball Cup</p>
                            <p className="font-bold text-gray-600 mt-1">Keepsake souvenir cup</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-purple-200">
                          <span className="text-purple-500 mr-4 font-black text-3xl">🥂</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Champagne Toast</p>
                            <p className="font-bold text-gray-600 mt-1">Group celebration toast</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-purple-200">
                          <span className="text-purple-500 mr-4 font-black text-3xl">🫧</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Bubble Supplies</p>
                            <p className="font-bold text-gray-600 mt-1">Party bubble guns</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-purple-200">
                          <span className="text-purple-500 mr-4 font-black text-3xl">🦄</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Premium Float</p>
                            <p className="font-bold text-gray-600 mt-1">Special float for bride</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-purple-200">
                          <span className="text-purple-500 mr-4 font-black text-3xl">☀️</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">SPF-50 Sunscreen</p>
                            <p className="font-bold text-gray-600 mt-1">Bottles for your group</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-purple-200">
                          <span className="text-purple-500 mr-4 font-black text-3xl">🍽️</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Party Supplies</p>
                            <p className="font-bold text-gray-600 mt-1">Plates, cups & utensils</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Super Sparkle Platinum */}
                <div className="bg-white rounded-3xl border-4 border-[#F4C430] shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F4C430] via-[#fbbf24] to-[#f59e0b] py-8 px-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-4xl md:text-5xl font-black text-gray-900">SUPER SPARKLE PLATINUM ⭐</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-2">Ultimate VIP Experience - Go All Out!</p>
                      </div>
                      <div className="text-center bg-white rounded-2xl px-8 py-4 border-4 border-gray-900">
                        <p className="text-sm font-black text-gray-600">PER PERSON</p>
                        <p className="text-5xl font-black text-amber-600">$105</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10">
                    <div className="bg-gradient-to-br from-amber-50 to-white rounded-3xl p-8 border-4 border-amber-200">
                      <h4 className="font-black text-3xl mb-6 text-amber-700 text-center">EVERYTHING IN QUEEN +</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-amber-200">
                          <span className="text-amber-500 mr-4 font-black text-3xl">👑</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">VIP Crown & Sash</p>
                            <p className="font-bold text-gray-600 mt-1">For the bride/groom</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-amber-200">
                          <span className="text-amber-500 mr-4 font-black text-3xl">📸</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Photo Session</p>
                            <p className="font-bold text-gray-600 mt-1">Professional photographer</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-amber-200">
                          <span className="text-amber-500 mr-4 font-black text-3xl">🎈</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Custom Decorations</p>
                            <p className="font-bold text-gray-600 mt-1">Personalized party decor</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-amber-200">
                          <span className="text-amber-500 mr-4 font-black text-3xl">🪩</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Extra Disco Balls</p>
                            <p className="font-bold text-gray-600 mt-1">Additional lighting</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-amber-200">
                          <span className="text-amber-500 mr-4 font-black text-3xl">🎁</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Party Favor Bags</p>
                            <p className="font-bold text-gray-600 mt-1">Gifts for all guests</p>
                          </div>
                        </div>
                        <div className="flex items-start bg-white rounded-2xl p-5 border-3 border-amber-200">
                          <span className="text-amber-500 mr-4 font-black text-3xl">🏖️</span>
                          <div>
                            <p className="font-black text-xl text-gray-900">Giant Lily Pad</p>
                            <p className="font-bold text-gray-600 mt-1">Upgraded float access</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule & Details */}
              <div className="grid md:grid-cols-2 gap-8 mt-10">
                {/* Schedule */}
                <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-amber-100 rounded-3xl p-8 border-4 border-[#F4C430]">
                  <h4 className="font-black text-3xl mb-6 text-gray-900 text-center">🗓️ CRUISE SCHEDULE</h4>
                  <div className="space-y-5">
                    <div className="bg-white rounded-2xl p-6 border-3 border-purple-300">
                      <h5 className="font-black text-2xl text-purple-700 mb-3 text-center">FRIDAY</h5>
                      <div className="text-center">
                        <p className="text-3xl font-black text-gray-900">12:00 PM - 4:00 PM</p>
                        <p className="text-lg font-bold text-gray-600 mt-2">(4-hour cruise)</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border-3 border-pink-300">
                      <h5 className="font-black text-2xl text-pink-700 mb-3 text-center">SATURDAY</h5>
                      <div className="space-y-3">
                        <div className="bg-pink-50 rounded-xl p-4 border-3 border-pink-200">
                          <p className="text-2xl font-black text-gray-900 text-center">11:00 AM - 3:00 PM</p>
                        </div>
                        <div className="bg-pink-50 rounded-xl p-4 border-3 border-pink-200">
                          <p className="text-2xl font-black text-gray-900 text-center">3:30 PM - 7:30 PM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Details */}
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl p-8 border-4 border-[#1e3a8a]">
                  <h4 className="font-black text-3xl mb-6 text-[#1e3a8a] text-center">⚡ IMPORTANT INFO</h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-5 border-3 border-blue-300">
                      <p className="font-bold text-lg text-gray-800">🚢 <strong>Boat:</strong> Clever Girl only</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border-3 border-purple-300">
                      <p className="font-bold text-lg text-gray-800">👥 <strong>Capacity:</strong> 100 guests maximum</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border-3 border-blue-300">
                      <p className="font-bold text-lg text-gray-800">📅 <strong>Season:</strong> March 1 - October 31</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border-3 border-purple-300">
                      <p className="font-bold text-lg text-gray-800">🎉 <strong>Days:</strong> Fridays & Saturdays only</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border-3 border-blue-300">
                      <p className="font-bold text-lg text-gray-800">💰 <strong>Pricing:</strong> Per person ticket</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border-3 border-purple-300">
                      <p className="font-bold text-lg text-gray-800">🎈 <strong>For:</strong> Bachelor/Bachelorette parties only</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OnePager;
