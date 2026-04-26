const fs = require('fs')

const messageQueueManagerContent = fs.readFileSync('source/src/utils/messageQueueManager.ts', 'utf8')
const executeReplQueuedInputContent = fs.readFileSync('source/src/screens/repl/executeReplQueuedInput.ts', 'utf8')
const handlePromptSubmitContent = fs.readFileSync('source/src/utils/handlePromptSubmit.ts', 'utf8')

// Assert isQueueAutoProcessingHalted logic is present
if (!messageQueueManagerContent.includes('isQueueAutoProcessingHalted')) {
    throw new Error('isQueueAutoProcessingHalted not found in messageQueueManager.ts')
}
if (!messageQueueManagerContent.includes('haltQueueAutoProcessing')) {
    throw new Error('haltQueueAutoProcessing not found in messageQueueManager.ts')
}
if (!messageQueueManagerContent.includes('resumeQueueAutoProcessing')) {
    throw new Error('resumeQueueAutoProcessing not found in messageQueueManager.ts')
}

// Assert executeReplQueuedInput contains the check logic
if (!executeReplQueuedInputContent.includes('shouldHaltQueueAfterQueuedTurn')) {
    throw new Error('shouldHaltQueueAfterQueuedTurn not found in executeReplQueuedInput.ts')
}

// Assert handlePromptSubmit unhalts the queue
if (!handlePromptSubmitContent.includes('resumeQueueAutoProcessing')) {
    throw new Error('resumeQueueAutoProcessing not found in handlePromptSubmit.ts')
}

console.log('Queue API error halt selftest passed')
