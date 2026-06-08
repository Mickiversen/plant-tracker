import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_overview')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function usePlant(id) {
  return useQuery({
    queryKey: ['plants', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_overview')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
