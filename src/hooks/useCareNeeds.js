import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useUpsertCareNeeds() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ plantId, waterEveryDays, lightLevel, soilType, fertilizeEveryDays }) => {
      const { error } = await supabase
        .from('care_needs')
        .upsert({
          plant_id: plantId,
          water_every_days: waterEveryDays,
          light_level: lightLevel,
          soil_type: soilType || null,
          fertilize_every_days: fertilizeEveryDays || null,
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}
