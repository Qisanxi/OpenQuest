import { Routes, Route } from 'react-router-dom'
import { Home } from '../features/home/Home.js'
import { QuestList } from '../features/quests/QuestList.js'
import { QuestCard } from '../features/quests/QuestCard.js'
import { Camera } from '../features/proof/Camera.js'
import { VerifyResult } from '../features/proof/VerifyResult.js'
import { LocationPicker } from '../features/location/LocationPicker.js'
import { PanicPinSetup } from '../features/lockout/PanicPinSetup.js'
import { Install } from '../features/onboarding/Install.js'
import { CompanionPair } from '../features/onboarding/CompanionPair.js'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/quests" element={<QuestList />} />
      <Route path="/quest/:questId" element={<QuestCard />} />
      <Route path="/quest/:questId/camera" element={<Camera />} />
      <Route path="/quest/:questId/result" element={<VerifyResult />} />
      <Route path="/location" element={<LocationPicker />} />
      <Route path="/onboarding/install" element={<Install />} />
      <Route path="/onboarding/companion" element={<CompanionPair />} />
      <Route path="/onboarding/panic-pin" element={<PanicPinSetup />} />
    </Routes>
  )
}
