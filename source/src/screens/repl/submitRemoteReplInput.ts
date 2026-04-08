import { getCommandName, isCommandEnabled } from '../../commands.js';
import { createUserMessage } from '../../utils/messages.js';

export async function submitRemoteReplInput({
  input,
  pastedContents,
  activeRemote,
  isSlashCommand,
  commands,
  setMessages,
}: {
  input: string;
  pastedContents: Record<string, any>;
  activeRemote: {
    isRemoteMode: boolean;
    sendMessage: (content: any, options?: { uuid?: string }) => Promise<boolean>;
  };
  isSlashCommand: boolean;
  commands: any[];
  setMessages: (updater: any) => void;
}): Promise<boolean> {
  const shouldHandleRemotely = activeRemote.isRemoteMode && !(isSlashCommand && commands.find(command => {
    const name = input.trim().slice(1).split(/\s/)[0];
    return isCommandEnabled(command) && (command.name === name || command.aliases?.includes(name!) || getCommandName(command) === name);
  })?.type === 'local-jsx');

  if (!shouldHandleRemotely) {
    return false;
  }

  const pastedValues = Object.values(pastedContents);
  const imageContents = pastedValues.filter((content: any) => content.type === 'image');
  const imagePasteIds = imageContents.length > 0 ? imageContents.map((content: any) => content.id) : undefined;
  let messageContent: any = input.trim();
  let remoteContent: any = input.trim();

  if (pastedValues.length > 0) {
    const contentBlocks: any[] = [];
    const remoteBlocks: Array<{
      type: string;
      [key: string]: unknown;
    }> = [];
    const trimmedInput = input.trim();

    if (trimmedInput) {
      contentBlocks.push({
        type: 'text',
        text: trimmedInput,
      });
      remoteBlocks.push({
        type: 'text',
        text: trimmedInput,
      });
    }

    for (const pasted of pastedValues) {
      if (pasted.type === 'image') {
        const source = {
          type: 'base64' as const,
          media_type: (pasted.mediaType ?? 'image/png') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: pasted.content,
        };
        contentBlocks.push({
          type: 'image',
          source,
        });
        remoteBlocks.push({
          type: 'image',
          source,
        });
      } else {
        contentBlocks.push({
          type: 'text',
          text: pasted.content,
        });
        remoteBlocks.push({
          type: 'text',
          text: pasted.content,
        });
      }
    }

    messageContent = contentBlocks;
    remoteContent = remoteBlocks;
  }

  const userMessage = createUserMessage({
    content: messageContent,
    imagePasteIds,
  });
  setMessages((prev: any[]) => [...prev, userMessage]);
  await activeRemote.sendMessage(remoteContent, {
    uuid: userMessage.uuid,
  });
  return true;
}
