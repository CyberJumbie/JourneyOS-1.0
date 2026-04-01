import { serve } from 'inngest/next'
import { inngest } from '@journey/inngest/client'
import { functions } from '@journey/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
