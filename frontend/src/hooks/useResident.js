import { useContext } from 'react'
import { ResidentContext } from '../context/residentContext'

export default function useResident() {
  const context = useContext(ResidentContext)
  if (!context) throw new Error('useResident must be used inside <ResidentProvider>')
  return context
}
