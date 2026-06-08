import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useCareLogForPlant(plantId) {
  return useQuery({
    queryKey: ['care_log', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_log')
        .select('*')
        .eq('plant_id', plantId)
        .order('logged_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: !!plantId,
  })
}

export function useLogCareAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ plantId, action, notes }) => {
      const { data, error } = await supabase
        .from('care_log')
        .insert({ plant_id: plantId, action, notes })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { plantId }) => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      queryClient.invalidateQueries({ queryKey: ['care_log', plantId] })
    },
  })
}
