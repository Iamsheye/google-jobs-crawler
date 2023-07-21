type MessageType = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export const resMessage = (type: MessageType, message: string) => {
  if (type === 'GET') {
    return `Successfully fetched ${message}`;
  }

  if (type === 'POST') {
    return `Successfully created ${message}`;
  }

  if (type === 'PUT' || type === 'PATCH') {
    return `Successfully updated ${message}`;
  }

  if (type === 'DELETE') {
    return `Successfully deleted ${message}`;
  }
};
