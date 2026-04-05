import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import figures from 'figures'
import * as React from 'react'
import { COMMAND_MESSAGE_TAG } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'
import { extractTag } from '../../utils/messages.js'
import { useSelectedMessageBg } from '../messageActions.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

export function UserCommandMessage({
  addMargin,
  param: { text },
}: Props): React.ReactNode {
  const commandMessage = extractTag(text, COMMAND_MESSAGE_TAG)
  const args = extractTag(text, 'command-args')
  const isSkillFormat = extractTag(text, 'skill-format') === 'true'
  const bg = useSelectedMessageBg()
  const labelColor = bg ? 'suggestion' : 'briefLabelYou'

  if (!commandMessage) {
    return null
  }

  const commandLabel = isSkillFormat
    ? `Skill(${commandMessage})`
    : `/${[commandMessage, args].filter(Boolean).join(' ')}`

  return (
    <Box
      flexDirection="column"
      marginTop={addMargin ? 1 : 0}
      backgroundColor={bg}
      paddingRight={1}
    >
      <Box flexDirection="column" paddingLeft={2}>
        <Text color={labelColor}>Command</Text>
        <Text>
          <Text color="subtle">{figures.pointer} </Text>
          <Text color="suggestion">{commandLabel}</Text>
        </Text>
      </Box>
    </Box>
  )
}
